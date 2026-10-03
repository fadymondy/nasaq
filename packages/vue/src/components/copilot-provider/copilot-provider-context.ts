// The types and the injection key of NqCopilotProvider (the exports of copilot-provider.tsx of packages/web).

import { inject, type InjectionKey } from "vue";
import type { CopilotContextItem, CopilotMessage, CopilotSessionSummary } from "../copilot-chat";
import type { Artifact, PickerArtifact } from "../artifact-renderer";
import type { CopilotSendMeta } from "../copilot-chat";
import type { CopilotEvent } from "./copilot-provider-state";

/** One request to the assistant. */
export interface CopilotRequest {
  /** The conversation before the new message, hidden messages included. */
  history: CopilotMessage[];
  /** The new user message. */
  message: CopilotMessage;
  meta: Partial<CopilotSendMeta>;
  sessionId?: string;
  /** Structured data of a hidden message, such as `{ type: "artifact-pick", values }`. */
  data?: unknown;
}

/** Talks to your backend. Yield events as they arrive; stop when `signal` aborts. */
export type CopilotTransport = (request: CopilotRequest, options: { signal: AbortSignal }) => AsyncIterable<CopilotEvent> | Promise<AsyncIterable<CopilotEvent>>;

/** Saved conversations on your backend. */
export interface CopilotSessionStore {
  list: () => Promise<CopilotSessionSummary[]>;
  load: (id: string) => Promise<CopilotMessage[]>;
  remove?: (id: string) => Promise<void>;
}

export interface CopilotOpenOptions {
  /** Text for the box. */
  message?: string;
  /** Send `message` right away instead of leaving it in the box. */
  autoSend?: boolean;
  /** Context chips to add, such as the record on screen. */
  context?: CopilotContextItem[];
}

export interface CopilotSendOptions {
  /** Sent to the assistant but not shown in the conversation. */
  hidden?: boolean;
  data?: unknown;
}

/** Everything NqCopilotChat and NqCopilotDock need, wired to the provider state: `v-bind="copilot.chatProps"`. */
export interface CopilotChatWiring {
  messages: CopilotMessage[];
  onSend: (text: string, meta: CopilotSendMeta) => Promise<void>;
  onStop: () => void;
  onRegenerate: (messageId: string) => void;
  onFeedback: (messageId: string, value: "up" | "down") => void;
  onNewChat: () => void;
  draft: string;
  onDraftChange: (text: string) => void;
  context: CopilotContextItem[];
  onContextChange: (items: CopilotContextItem[]) => void;
  sessions?: CopilotSessionSummary[];
  activeSessionId?: string;
  onSessionSelect?: (id: string) => void;
  onSessionDelete?: (id: string) => void;
  onArtifactAction: (actionId: string, artifact: Artifact) => void | Promise<void | { error?: string }>;
  onArtifactPick: (values: string[], artifact: PickerArtifact) => void | Promise<void | { error?: string }>;
}

/** The state of the nearest NqCopilotProvider. It is reactive: read `copilot.messages` and `copilot.isOpen` straight from it. */
export interface CopilotContextValue {
  messages: CopilotMessage[];
  streaming: boolean;
  isOpen: boolean;
  open: (options?: CopilotOpenOptions) => void;
  close: () => void;
  toggle: () => void;
  send: (text: string, meta?: Partial<CopilotSendMeta>, options?: CopilotSendOptions) => Promise<void>;
  /** Stops the answer. What arrived stays; it is not an error. */
  stop: () => void;
  /** Sends the last user message again, replacing the answer after it. */
  retry: (answerId?: string) => Promise<void>;
  newChat: () => void;
  feedback: (messageId: string, value: "up" | "down") => void;
  draft: string;
  setDraft: (text: string) => void;
  context: CopilotContextItem[];
  setContext: (items: CopilotContextItem[]) => void;
  sessionId?: string;
  sessions: CopilotSessionSummary[];
  refreshSessions: () => Promise<void>;
  loadSession: (id: string) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  chatProps: CopilotChatWiring;
}

export const COPILOT_KEY: InjectionKey<CopilotContextValue> = Symbol("nasaq-copilot");

/** The copilot state of the nearest NqCopilotProvider. Throws outside one. */
export function useCopilot(): CopilotContextValue {
  const value = inject(COPILOT_KEY, null);
  if (!value) throw new Error("useCopilot must be used inside <NqCopilotProvider>");
  return value;
}

/** Like `useCopilot`, but `null` outside a provider. */
export function useOptionalCopilot(): CopilotContextValue | null {
  return inject(COPILOT_KEY, null);
}
