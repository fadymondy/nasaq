<script setup lang="ts">
import { computed, onBeforeUnmount, provide, reactive, ref, watch } from "vue";
import type { Artifact, PickerArtifact } from "../artifact-renderer";
import type { CopilotContextItem, CopilotMessage, CopilotSendMeta, CopilotSessionSummary } from "../copilot-chat";
import { NqCopilotDock } from "../copilot-dock";
import { COPILOT_KEY, type CopilotContextValue, type CopilotOpenOptions, type CopilotSendOptions, type CopilotSessionStore, type CopilotTransport } from "./copilot-provider-context";
import { describeInteraction, finishAnswer, reduceStream, retryPoint, startAnswer, type StreamState } from "./copilot-provider-state";

// Owns a copilot conversation: streams answers from your transport, stops, retries, keeps sessions, and opens the assistant from anywhere with
// useCopilot().open({ message, autoSend }). It renders no element of its own, only its slot and (with `dock`) a NqCopilotDock wired to the state.
const props = withDefaults(
  defineProps<{
    /** (request, { signal }) => AsyncIterable of events. Stop when `signal` aborts. */
    transport: CopilotTransport;
    /** Turns on History. The list loads when the assistant first opens. */
    sessions?: CopilotSessionStore;
    initialMessages?: CopilotMessage[];
    /** An assistant message shown at the start of every new chat. */
    greeting?: string;
    /** v-model:open. */
    open?: boolean;
    defaultOpen?: boolean;
    /** Called after the state changes, to send ratings to your backend. */
    onFeedback?: (message: CopilotMessage, value: "up" | "down") => void;
    /**
     * Artifact buttons and pickers. By default they are sent back to the assistant as a hidden message with
     * `data: { type: "artifact-action" | "artifact-pick", ... }`.
     */
    onArtifactAction?: (actionId: string, artifact: Artifact) => void | Promise<void | { error?: string }>;
    onArtifactPick?: (values: string[], artifact: PickerArtifact) => void | Promise<void | { error?: string }>;
    /** Mounts a NqCopilotDock wired to this state. Pass its props (an object) to configure it. */
    dock?: boolean | Record<string, unknown>;
  }>(),
  { sessions: undefined, initialMessages: undefined, greeting: undefined, open: undefined, defaultOpen: false, onFeedback: undefined, onArtifactAction: undefined, onArtifactPick: undefined, dock: undefined },
);
const emit = defineEmits<{ "update:open": [open: boolean] }>();

let seq = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;
const greet = (text: string | undefined): CopilotMessage[] => (text ? [{ id: uid("greeting"), role: "assistant", text }] : []);

const messages = ref<CopilotMessage[]>(props.initialMessages ?? greet(props.greeting));
const innerOpen = ref(props.defaultOpen);
const isOpen = computed(() => props.open ?? innerOpen.value);
const draft = ref("");
const context = ref<CopilotContextItem[]>([]);
const sessionId = ref<string>();
const sessionList = ref<CopilotSessionSummary[]>([]);
let ctrl: AbortController | null = null;

onBeforeUnmount(() => ctrl?.abort());

const streaming = computed(() => messages.value.some((m) => m.streaming));

async function run(history: CopilotMessage[], user: CopilotMessage, meta: Partial<CopilotSendMeta>, data?: unknown) {
  ctrl?.abort();
  const abort = new AbortController();
  ctrl = abort;
  let state: StreamState = startAnswer(uid("answer"));
  const answerId = state.message.id;
  const commit = () => {
    const m = state.message;
    messages.value = messages.value.map((x) => (x.id === answerId ? m : x));
  };
  messages.value = [...history, user, state.message];
  try {
    const stream = await props.transport({ history, message: user, meta, sessionId: sessionId.value, data }, { signal: abort.signal });
    for await (const event of stream) {
      if (abort.signal.aborted) break;
      if (event.type === "session") {
        sessionId.value = event.id;
        if (event.title) {
          const title = event.title;
          if (!sessionList.value.some((s) => s.id === event.id)) sessionList.value = [{ id: event.id, title, at: Date.now() }, ...sessionList.value];
        }
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
  if (ctrl === abort) ctrl = null;
}

async function send(text: string, meta: Partial<CopilotSendMeta> = {}, options: CopilotSendOptions = {}) {
  const user: CopilotMessage = {
    id: uid("user"),
    role: "user",
    text,
    at: Date.now(),
    ...(meta.attachments?.length ? { attachments: meta.attachments } : {}),
    ...(options.hidden ? { hidden: true } : {}),
  };
  draft.value = "";
  await run(messages.value, user, meta, options.data);
}

const stop = () => ctrl?.abort();

async function retry(answerId?: string) {
  const point = retryPoint(messages.value, answerId);
  if (point) await run(point.history, point.user, { attachments: point.user.attachments ? [...point.user.attachments] : [] });
}

function newChat() {
  ctrl?.abort();
  messages.value = greet(props.greeting);
  sessionId.value = undefined;
  draft.value = "";
}

function feedback(id: string, value: "up" | "down") {
  const target = messages.value.find((m) => m.id === id);
  if (!target) return;
  const next = target.feedback === value ? null : value;
  messages.value = messages.value.map((m) => (m.id === id ? { ...m, feedback: next } : m));
  if (next) props.onFeedback?.(target, next);
}

async function refreshSessions() {
  if (props.sessions) sessionList.value = await props.sessions.list();
}

async function loadSession(id: string) {
  if (!props.sessions) return;
  ctrl?.abort();
  messages.value = await props.sessions.load(id);
  sessionId.value = id;
}

async function deleteSession(id: string) {
  const store = props.sessions;
  if (!store?.remove) return;
  await store.remove(id);
  sessionList.value = sessionList.value.filter((s) => s.id !== id);
  if (sessionId.value === id) newChat();
}

function setOpen(next: boolean) {
  innerOpen.value = next;
  emit("update:open", next);
}

// Load the history list the first time the assistant opens.
let loaded = false;
watch(
  isOpen,
  (value) => {
    if (value && props.sessions && !loaded) {
      loaded = true;
      void refreshSessions().catch(() => {});
    }
  },
  { immediate: true },
);

function open(options: CopilotOpenOptions = {}) {
  setOpen(true);
  if (options.context?.length) {
    const prev = context.value;
    context.value = [...prev, ...options.context.filter((c) => !prev.some((p) => p.id === c.id))];
  }
  if (options.message === undefined) return;
  if (options.autoSend) void send(options.message);
  else draft.value = options.message;
}

const artifactAction = (actionId: string, artifact: Artifact) =>
  send(describeInteraction("action", actionId), {}, { hidden: true, data: { type: "artifact-action", actionId, artifactId: artifact.id } });
const artifactPick = (values: string[], artifact: PickerArtifact) =>
  send(describeInteraction("pick", values), {}, { hidden: true, data: { type: "artifact-pick", values, artifactId: artifact.id } });

const chatProps = computed(() => {
  const store = props.sessions;
  return {
    messages: messages.value,
    onSend: (text: string, meta: CopilotSendMeta) => send(text, meta),
    onStop: stop,
    onRegenerate: (id: string) => void retry(id),
    onFeedback: feedback,
    onNewChat: newChat,
    draft: draft.value,
    onDraftChange: (text: string) => (draft.value = text),
    context: context.value,
    onContextChange: (items: CopilotContextItem[]) => (context.value = items),
    ...(store
      ? {
          sessions: sessionList.value,
          activeSessionId: sessionId.value,
          onSessionSelect: (id: string) => void loadSession(id),
          onSessionDelete: store.remove ? (id: string) => void deleteSession(id) : undefined,
        }
      : {}),
    onArtifactAction: props.onArtifactAction ?? artifactAction,
    onArtifactPick: props.onArtifactPick ?? artifactPick,
  };
});

const value = reactive({
  messages,
  streaming,
  isOpen,
  open,
  close: () => setOpen(false),
  toggle: () => setOpen(!isOpen.value),
  send,
  stop,
  retry,
  newChat,
  feedback,
  draft,
  setDraft: (text: string) => (draft.value = text),
  context,
  setContext: (items: CopilotContextItem[]) => (context.value = items),
  sessionId,
  sessions: sessionList,
  refreshSessions,
  loadSession,
  deleteSession,
  chatProps,
}) as unknown as CopilotContextValue;
provide(COPILOT_KEY, value);

const dockProps = computed(() => (props.dock === true ? {} : props.dock || null));
</script>

<template>
  <slot :copilot="value" />
  <NqCopilotDock v-if="dockProps" v-bind="{ ...dockProps, ...chatProps }" :open="isOpen" @update:open="setOpen" />
</template>
