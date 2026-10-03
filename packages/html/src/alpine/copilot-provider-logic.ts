// The stream reducer of the copilot provider (copilot-provider-state.ts of the React and Vue ports), without artifact validation:
// the Blade copilot chat renders artifacts on the server, so an "artifact" event here is only kept when it is an object with a string type.

export interface CopilotStep {
  id: string;
  status?: string;
  [key: string]: unknown;
}
export interface CopilotMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  at?: number;
  streaming?: boolean;
  error?: string;
  steps?: CopilotStep[];
  sources?: unknown[];
  artifacts?: unknown[];
  followUps?: string[];
  feedback?: "up" | "down" | null;
  hidden?: boolean;
  [key: string]: unknown;
}
export type CopilotEvent =
  | { type: "delta"; text: string }
  | { type: "text"; text: string }
  | { type: "step"; step: CopilotStep }
  | { type: "sources"; sources: unknown[] }
  | { type: "artifact"; artifact: unknown }
  | { type: "followUps"; followUps: string[] }
  | { type: "session"; id: string; title?: string }
  | { type: "error"; message?: string }
  | { type: "done" };

export interface StreamState {
  message: CopilotMessage;
  raw: string;
  artifacts: unknown[];
}

const OPEN_FENCE = /```(?:artifact|a2ui)[^\n]*(?:\n[\s\S]*)?$/;

/** The text to show: a code fence of an artifact still being written is hidden. */
export function visibleText(raw: string): string {
  return raw.replace(OPEN_FENCE, "").trimEnd();
}

export function startAnswer(id: string, at: number = Date.now()): StreamState {
  return { raw: "", artifacts: [], message: { id, role: "assistant", text: "", at, streaming: true } };
}

const withText = (state: StreamState, raw: string): StreamState => ({ ...state, raw, message: { ...state.message, text: visibleText(raw) } });

export function finishAnswer(state: StreamState): StreamState {
  const m = state.message;
  const steps = m.steps?.map((s) => (s.status === "running" ? { ...s, status: "done" } : s));
  return { ...state, message: { ...m, streaming: false, ...(steps ? { steps } : {}) } };
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
      const a = event.artifact as { type?: unknown } | null;
      if (!a || typeof a !== "object" || typeof a.type !== "string") return state;
      const artifacts = [...state.artifacts, a];
      return { ...state, artifacts, message: { ...m, artifacts } };
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
