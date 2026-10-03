"use client";

import { Sparkles } from "lucide-react";
import { type ComponentProps, createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { isApplePlatform } from "../../lib/hotkey";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import type { Artifact, PickerArtifact } from "../artifact-renderer";
import { Button } from "../button";
import type { CopilotChatProps, CopilotContextItem, CopilotMessage, CopilotSendMeta, CopilotSessionSummary } from "../copilot-chat";
import { CopilotDock, type CopilotDockProps } from "../copilot-dock";
import { type CopilotEvent, describeInteraction, finishAnswer, reduceStream, retryPoint, type StreamState, startAnswer } from "./copilot-provider-state";

export { type CopilotEvent, describeInteraction, finishAnswer, reduceStream, retryPoint, splitStreamingText, startAnswer, type StreamState } from "./copilot-provider-state";

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
  /** Everything `CopilotChat` and `CopilotDock` need, wired to this state. */
  chatProps: Pick<
    CopilotChatProps,
    | "messages"
    | "onSend"
    | "onStop"
    | "onRegenerate"
    | "onFeedback"
    | "onNewChat"
    | "draft"
    | "onDraftChange"
    | "context"
    | "onContextChange"
    | "sessions"
    | "activeSessionId"
    | "onSessionSelect"
    | "onSessionDelete"
    | "onArtifactAction"
    | "onArtifactPick"
  >;
}

const CopilotContext = createContext<CopilotContextValue | null>(null);

/** The copilot state of the nearest `CopilotProvider`. Throws outside one. */
export function useCopilot(): CopilotContextValue {
  const value = useContext(CopilotContext);
  if (!value) throw new Error("useCopilot must be used inside <CopilotProvider>");
  return value;
}

/** Like `useCopilot`, but `null` outside a provider. */
export function useOptionalCopilot(): CopilotContextValue | null {
  return useContext(CopilotContext);
}

export interface CopilotProviderProps {
  transport: CopilotTransport;
  /** Turns on History. The list loads when the assistant first opens. */
  sessions?: CopilotSessionStore;
  initialMessages?: CopilotMessage[];
  /** An assistant message shown at the start of every new chat. */
  greeting?: string;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Called after the state changes, to send ratings to your backend. */
  onFeedback?: (message: CopilotMessage, value: "up" | "down") => void;
  /**
   * Artifact buttons and pickers. By default they are sent back to the assistant as a hidden message with
   * `data: { type: "artifact-action" | "artifact-pick", ... }`.
   */
  onArtifactAction?: CopilotChatProps["onArtifactAction"];
  onArtifactPick?: CopilotChatProps["onArtifactPick"];
  /** Mounts a `CopilotDock` wired to this state. Pass props to configure it. */
  dock?: boolean | Omit<CopilotDockProps, keyof CopilotContextValue["chatProps"] | "open" | "onOpenChange">;
  children?: ReactNode;
}

let seq = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

function greet(text: string | undefined): CopilotMessage[] {
  return text ? [{ id: uid("greeting"), role: "assistant", text }] : [];
}

/**
 * Owns a copilot conversation: streams answers from your transport, stops, retries, keeps sessions, and opens the
 * assistant from anywhere with `useCopilot().open({ message, autoSend })`. Pair it with `CopilotDock`, or pass `dock`.
 */
export function CopilotProvider({
  transport,
  sessions: store,
  initialMessages,
  greeting,
  defaultOpen = false,
  onOpenChange,
  onFeedback,
  onArtifactAction,
  onArtifactPick,
  dock,
  children,
}: CopilotProviderProps) {
  const [messages, setMessages] = useState<CopilotMessage[]>(() => initialMessages ?? greet(greeting));
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [draft, setDraft] = useState("");
  const [context, setContext] = useState<CopilotContextItem[]>([]);
  const [sessionId, setSessionId] = useState<string>();
  const [sessions, setSessions] = useState<CopilotSessionSummary[]>([]);
  const ctrl = useRef<AbortController | null>(null);
  const live = useRef(messages);
  live.current = messages;
  const sid = useRef(sessionId);
  sid.current = sessionId;
  const transportRef = useRef(transport);
  transportRef.current = transport;

  useEffect(() => () => ctrl.current?.abort(), []);

  const streaming = messages.some((m) => m.streaming);

  const run = useCallback(async (history: CopilotMessage[], user: CopilotMessage, meta: Partial<CopilotSendMeta>, data?: unknown) => {
    ctrl.current?.abort();
    const abort = new AbortController();
    ctrl.current = abort;
    let state: StreamState = startAnswer(uid("answer"));
    const answerId = state.message.id;
    const commit = () => {
      const m = state.message;
      setMessages((prev) => prev.map((x) => (x.id === answerId ? m : x)));
    };
    setMessages([...history, user, state.message]);
    try {
      const stream = await transportRef.current({ history, message: user, meta, sessionId: sid.current, data }, { signal: abort.signal });
      for await (const event of stream) {
        if (abort.signal.aborted) break;
        if (event.type === "session") {
          setSessionId(event.id);
          if (event.title) setSessions((prev) => (prev.some((s) => s.id === event.id) ? prev : [{ id: event.id, title: event.title ?? "", at: Date.now() }, ...prev]));
          continue;
        }
        state = reduceStream(state, event);
        commit();
        if (event.type === "error" || event.type === "done") break;
      }
    } catch (err) {
      if (!abort.signal.aborted) state = reduceStream(state, { type: "error", message: err instanceof Error ? err.message : undefined });
    }
    state = finishAnswer(state);
    commit();
    if (ctrl.current === abort) ctrl.current = null;
  }, []);

  const send = useCallback(
    async (text: string, meta: Partial<CopilotSendMeta> = {}, options: CopilotSendOptions = {}) => {
      const user: CopilotMessage = {
        id: uid("user"),
        role: "user",
        text,
        at: Date.now(),
        ...(meta.attachments?.length ? { attachments: meta.attachments } : {}),
        ...(options.hidden ? { hidden: true } : {}),
      };
      setDraft("");
      await run(live.current, user, meta, options.data);
    },
    [run],
  );

  const stop = useCallback(() => ctrl.current?.abort(), []);

  const retry = useCallback(
    async (answerId?: string) => {
      const point = retryPoint(live.current, answerId);
      if (point) await run(point.history, point.user, { attachments: point.user.attachments ? [...point.user.attachments] : [] });
    },
    [run],
  );

  const newChat = useCallback(() => {
    ctrl.current?.abort();
    setMessages(greet(greeting));
    setSessionId(undefined);
    setDraft("");
  }, [greeting]);

  const feedback = useCallback(
    (id: string, value: "up" | "down") => {
      const target = live.current.find((m) => m.id === id);
      if (!target) return;
      const next = target.feedback === value ? null : value;
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, feedback: next } : m)));
      if (next) onFeedback?.(target, next);
    },
    [onFeedback],
  );

  const refreshSessions = useCallback(async () => {
    if (store) setSessions(await store.list());
  }, [store]);

  const loadSession = useCallback(
    async (id: string) => {
      if (!store) return;
      ctrl.current?.abort();
      setMessages(await store.load(id));
      setSessionId(id);
    },
    [store],
  );

  const deleteSession = useCallback(
    async (id: string) => {
      if (!store?.remove) return;
      await store.remove(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (sid.current === id) newChat();
    },
    [store, newChat],
  );

  const setOpen = useCallback(
    (next: boolean) => {
      setIsOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange],
  );

  // Load the history list the first time the assistant opens.
  const loaded = useRef(false);
  useEffect(() => {
    if (isOpen && store && !loaded.current) {
      loaded.current = true;
      void refreshSessions().catch(() => {});
    }
  }, [isOpen, store, refreshSessions]);

  const open = useCallback(
    (options: CopilotOpenOptions = {}) => {
      setOpen(true);
      if (options.context?.length) setContext((prev) => [...prev, ...options.context!.filter((c) => !prev.some((p) => p.id === c.id))]);
      if (options.message === undefined) return;
      if (options.autoSend) void send(options.message);
      else setDraft(options.message);
    },
    [send, setOpen],
  );

  const artifactAction = useCallback(
    (actionId: string, artifact: Artifact) => send(describeInteraction("action", actionId), {}, { hidden: true, data: { type: "artifact-action", actionId, artifactId: artifact.id } }),
    [send],
  );
  const artifactPick = useCallback(
    (values: string[], artifact: PickerArtifact) => send(describeInteraction("pick", values), {}, { hidden: true, data: { type: "artifact-pick", values, artifactId: artifact.id } }),
    [send],
  );

  const value = useMemo<CopilotContextValue>(
    () => ({
      messages,
      streaming,
      isOpen,
      open,
      close: () => setOpen(false),
      toggle: () => setOpen(!isOpen),
      send,
      stop,
      retry,
      newChat,
      feedback,
      draft,
      setDraft,
      context,
      setContext,
      sessionId,
      sessions,
      refreshSessions,
      loadSession,
      deleteSession,
      chatProps: {
        messages,
        onSend: (text, meta) => send(text, meta),
        onStop: stop,
        onRegenerate: (id) => void retry(id),
        onFeedback: feedback,
        onNewChat: newChat,
        draft,
        onDraftChange: setDraft,
        context,
        onContextChange: setContext,
        ...(store ? { sessions, activeSessionId: sessionId, onSessionSelect: (id: string) => void loadSession(id), onSessionDelete: store.remove ? (id: string) => void deleteSession(id) : undefined } : {}),
        onArtifactAction: onArtifactAction ?? artifactAction,
        onArtifactPick: onArtifactPick ?? artifactPick,
      },
    }),
    [messages, streaming, isOpen, open, setOpen, send, stop, retry, newChat, feedback, draft, context, sessionId, sessions, refreshSessions, loadSession, deleteSession, store, onArtifactAction, artifactAction, onArtifactPick, artifactPick],
  );

  const dockProps = dock === true ? {} : dock || null;

  return (
    <CopilotContext.Provider value={value}>
      {children}
      {dockProps ? <CopilotDock {...dockProps} {...value.chatProps} open={isOpen} onOpenChange={setOpen} /> : null}
    </CopilotContext.Provider>
  );
}

const STRINGS = {
  en: { label: "Ask AI", open: "Open assistant", close: "Close assistant" },
  ar: { label: "اسأل الذكاء الاصطناعي", open: "افتح المساعد", close: "أغلق المساعد" },
};

export type CopilotLauncherLabels = (typeof STRINGS)["en"];

export interface CopilotLauncherProps extends Omit<ComponentProps<typeof Button>, "children" | "onClick"> {
  /** `header` is an icon and a label for a top bar; `icon` is a square icon button. */
  look?: "header" | "icon";
  icon?: ReactNode;
  /** Shown next to the label, such as "⌘J". Default the platform's ⌘J / Ctrl+J; `false` hides it. */
  shortcut?: string | false;
  /** Opens with this text in the box, or sends it with `autoSend`. */
  openWith?: CopilotOpenOptions;
  labels?: Partial<CopilotLauncherLabels>;
}

/** A button that toggles the assistant of the nearest `CopilotProvider`, for a header or toolbar. */
export function CopilotLauncher({ look = "header", icon, shortcut, openWith, labels, className, variant, size, ...props }: CopilotLauncherProps) {
  const copilot = useCopilot();
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const [keys, setKeys] = useState<string | null>(null);
  // The modifier depends on the platform, which is only known in the browser.
  useEffect(() => {
    setKeys(shortcut === false ? null : (shortcut ?? `${isApplePlatform() ? "⌘" : "Ctrl+"}J`));
  }, [shortcut]);
  const name = copilot.isOpen ? t.close : t.open;
  return (
    <Button
      data-slot="copilot-launcher"
      variant={variant ?? (look === "header" ? "secondary" : "ghost")}
      size={size ?? (look === "header" ? "sm" : "icon")}
      aria-expanded={copilot.isOpen}
      aria-label={look === "icon" ? name : undefined}
      title={keys ? `${name} (${keys})` : name}
      onClick={() => (copilot.isOpen ? copilot.close() : copilot.open(openWith))}
      className={cn(look === "header" && "gap-2", className)}
      {...props}
    >
      {icon ?? <Sparkles aria-hidden />}
      {look === "header" ? (
        <>
          <span>{t.label}</span>
          {keys ? (
            <kbd dir="ltr" className="hidden rounded-sm border border-border px-1 font-mono text-[11px] text-muted-foreground sm:inline">
              {keys}
            </kbd>
          ) : null}
        </>
      ) : null}
    </Button>
  );
}
