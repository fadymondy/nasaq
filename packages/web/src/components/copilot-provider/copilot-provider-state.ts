/** The stream reducer of CopilotProvider. No React here, so it is unit tested. */

import { type Artifact, extractArtifacts, parseArtifact } from "../artifact-renderer/artifact-renderer-logic";
import type { CopilotMessage, CopilotSource, CopilotStep } from "../copilot-chat/copilot-chat-format";

/** What a transport yields while the assistant answers. */
export type CopilotEvent =
  /** More answer text. ```artifact blocks inside it become artifacts. */
  | { type: "delta"; text: string }
  /** Replaces the whole answer text. */
  | { type: "text"; text: string }
  /** A tool call started, changed or finished. Matched by `step.id`. */
  | { type: "step"; step: CopilotStep }
  | { type: "sources"; sources: CopilotSource[] }
  /** Any JSON; it is validated, and dropped when invalid. */
  | { type: "artifact"; artifact: unknown }
  | { type: "followUps"; followUps: string[] }
  /** The server saved the conversation under this id. */
  | { type: "session"; id: string; title?: string }
  | { type: "error"; message?: string }
  | { type: "done" };

export interface StreamState {
  message: CopilotMessage;
  /** The text as it arrived, artifact blocks included. */
  raw: string;
  /** Artifacts sent as events. */
  artifacts: Artifact[];
}

const OPEN_FENCE = /```(?:artifact|a2ui)[^\n]*(?:\n[\s\S]*)?$/;

/**
 * The text to show and the finished artifact blocks of a streaming answer. A block still being written is hidden, so
 * half a JSON object never flashes on screen.
 */
export function splitStreamingText(raw: string): { text: string; artifacts: Artifact[] } {
  const { text, artifacts } = extractArtifacts(raw);
  return {
    text: text.replace(OPEN_FENCE, "").trimEnd(),
    artifacts: artifacts.flatMap((a) => (a.ok ? [a.artifact] : [])),
  };
}

function withText(state: StreamState, raw: string): StreamState {
  const split = splitStreamingText(raw);
  const artifacts = [...state.artifacts, ...split.artifacts];
  return { ...state, raw, message: { ...state.message, text: split.text, artifacts: artifacts.length ? artifacts : undefined } };
}

/** A new, empty answer that is streaming. */
export function startAnswer(id: string, at: number = Date.now()): StreamState {
  return { raw: "", artifacts: [], message: { id, role: "assistant", text: "", at, streaming: true } };
}

/** Applies one event. Session events are not about the message and leave it as is. */
export function reduceStream(state: StreamState, event: CopilotEvent): StreamState {
  const m = state.message;
  switch (event.type) {
    case "delta":
      return withText(state, state.raw + event.text);
    case "text":
      return withText(state, event.text);
    case "step": {
      const steps = m.steps ?? [];
      const i = steps.findIndex((s) => s.id === event.step.id);
      const next = i === -1 ? [...steps, event.step] : steps.map((s, j) => (j === i ? { ...s, ...event.step } : s));
      return { ...state, message: { ...m, steps: next } };
    }
    case "sources":
      return { ...state, message: { ...m, sources: event.sources } };
    case "artifact": {
      const parsed = parseArtifact(event.artifact);
      if (!parsed.ok) return state;
      const artifacts = [...state.artifacts, parsed.artifact];
      const fence = splitStreamingText(state.raw).artifacts;
      return { ...state, artifacts, message: { ...m, artifacts: [...artifacts, ...fence] } };
    }
    case "followUps":
      return { ...state, message: { ...m, followUps: event.followUps } };
    case "error":
      return { ...state, message: { ...m, streaming: false, error: event.message ?? "" } };
    case "done":
      return finishAnswer(state);
    case "session":
      return state;
  }
}

/** Ends the answer: no longer streaming, running steps marked done. Keeps an error if there is one. */
export function finishAnswer(state: StreamState): StreamState {
  const m = state.message;
  const steps = m.steps?.map((s) => (s.status === "running" ? { ...s, status: "done" as const } : s));
  return { ...state, message: { ...m, streaming: false, ...(steps ? { steps } : {}) } };
}

/** The last user message a retry should send again, and the history before it. */
export function retryPoint(messages: readonly CopilotMessage[], answerId?: string): { history: CopilotMessage[]; user: CopilotMessage } | null {
  const end = answerId === undefined ? messages.length : messages.findIndex((m) => m.id === answerId);
  const upto = end === -1 ? messages.length : end;
  for (let i = upto - 1; i >= 0; i--) {
    const m = messages[i];
    if (m && m.role === "user") return { history: messages.slice(0, i), user: m };
  }
  return null;
}

/** Plain words for a hidden message that answers an artifact, so the history stays readable. */
export function describeInteraction(kind: "action" | "pick", detail: string | string[]): string {
  return kind === "action" ? `[action] ${String(detail)}` : `[picked] ${([] as string[]).concat(detail).join(", ")}`;
}
