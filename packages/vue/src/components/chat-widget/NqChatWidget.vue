<script setup lang="ts">
import { MessageCircle, Paperclip, X } from "lucide-vue-next";
import { computed, nextTick, ref, useId, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAvatar } from "../avatar";
import { NqButton } from "../button";
import { NqChatComposer, NqChatMessage, NqChatThread, NqTypingIndicator } from "../chat";
import NqChatWidgetOffline from "./NqChatWidgetOffline.vue";
import { chatWidgetStrings, type ChatWidgetLabels } from "./labels";
import type { WidgetMessage, WidgetOfflineForm, WidgetResult } from "./types";

// The floating chat box for a customer site: a round launcher (with an unread badge) that opens a panel with a greeting, the
// conversation, quick questions, file attachments and, outside business hours, a leave-a-message form. It stores nothing: pass
// `messages` and it calls `onSend` and `onOfflineSubmit`. Resolve either with `{ error }` to keep the text and show the message.
const props = withDefaults(
  defineProps<{
    messages: readonly WidgetMessage[];
    /** Sends the visitor's text and files. Resolve with `{ error }` to keep the text and show the message. */
    onSend: (text: string, files: File[]) => Promise<WidgetResult>;
    onRetry?: (id: string) => void;
    /** Open state. Use `v-model:open`, or `defaultOpen` to let the widget own it. */
    open?: boolean;
    defaultOpen?: boolean;
    /** Header title. Default "Chat with us". */
    title?: string;
    /** Line under the title. Defaults to the reply-time text for the current state. */
    subtitle?: string;
    agent?: { name: string; avatar?: string };
    /** First bubble from the team. */
    greeting?: string;
    /** Quick questions shown until the visitor writes. */
    starters?: readonly string[];
    /** Inside business hours. When `false` the offline form replaces the composer. Default true. */
    online?: boolean;
    /** Called with the offline form. Resolve with `{ error }` to keep the form. */
    onOfflineSubmit?: (form: WidgetOfflineForm) => Promise<WidgetResult>;
    /** Unread messages from the team, shown on the launcher while closed. */
    unread?: number;
    /** The team is typing. */
    typing?: boolean;
    /** Which bottom corner. Default "end" (the right in English, the left in Arabic). */
    position?: "end" | "start";
    /** `fixed` pins it to the viewport, `absolute` to a relative parent. Default "fixed". */
    placement?: "fixed" | "absolute" | "static";
    /** Largest file in MB. Default 5. */
    maxFileMb?: number;
    labels?: Partial<ChatWidgetLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { open: undefined, defaultOpen: false, starters: () => [], online: true, unread: 0, typing: false, position: "end", placement: "fixed", maxFileMb: 5 },
);
const emit = defineEmits<{ "update:open": [open: boolean] }>();

const nq = useNasaq();
const t = computed(() => ({ ...chatWidgetStrings[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }) as ChatWidgetLabels);
const id = useId();
const inner = ref(props.defaultOpen);
const isOpen = computed(() => props.open ?? inner.value);
function setOpen(next: boolean) {
  inner.value = next;
  emit("update:open", next);
}

const text = ref("");
const files = ref<File[]>([]);
const error = ref("");
const fileInput = ref<HTMLInputElement | null>(null);
const launcher = ref<{ $el: HTMLElement } | null>(null);

// Give focus back to the launcher after closing.
watch(isOpen, (now, was) => {
  if (was && !now) nextTick(() => launcher.value?.$el?.focus());
});

async function send(body: string) {
  const attached = files.value;
  error.value = "";
  files.value = [];
  try {
    const r = await props.onSend(body, attached);
    if (r && "error" in r && r.error) {
      error.value = r.error;
      text.value = body;
      files.value = attached;
    }
  } catch {
    error.value = t.value.sendFailed;
    text.value = body;
    files.value = attached;
  }
}

function addFiles(e: Event) {
  const input = e.target as HTMLInputElement;
  const ok: File[] = [];
  for (const f of Array.from(input.files ?? [])) {
    if (f.size > props.maxFileMb * 1024 * 1024) error.value = t.value.fileTooBig(f.name, String(props.maxFileMb));
    else ok.push(f);
  }
  if (ok.length) files.value = [...files.value, ...ok];
  input.value = "";
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape" && isOpen.value && !e.defaultPrevented) setOpen(false);
}

const hasVisitorMessage = computed(() => props.messages.some((m) => m.from === "visitor"));
const intro = computed(() => (props.online ? (props.greeting ?? t.value.greeting) : t.value.offlineGreeting));
const sub = computed(() => props.subtitle ?? (props.online ? t.value.subtitleOnline : t.value.subtitleOffline));
</script>

<template>
  <div
    data-slot="chat-widget"
    :data-open="isOpen ? '' : undefined"
    :data-online="props.online ? '' : undefined"
    :class="
      cn(
        'z-50 flex flex-col items-end gap-3',
        props.position === 'start' && 'items-start',
        props.placement === 'fixed' && 'fixed bottom-4',
        props.placement === 'absolute' && 'absolute bottom-4',
        props.placement !== 'static' && (props.position === 'end' ? 'end-4' : 'start-4'),
        props.class,
      )
    "
    @keydown="onKeydown"
  >
    <section
      v-if="isOpen"
      role="dialog"
      :aria-labelledby="`${id}-title`"
      class="flex h-[min(34rem,calc(100dvh-7rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-floating border border-border bg-card shadow-floating"
    >
      <header class="flex items-center gap-3 bg-primary px-4 py-3 text-primary-foreground">
        <NqAvatar v-if="props.agent" :name="props.agent.name" :src="props.agent.avatar" size="md" />
        <div class="flex min-w-0 flex-1 flex-col">
          <h2 :id="`${id}-title`" dir="auto" class="truncate text-label">{{ props.title ?? t.title }}</h2>
          <p class="flex items-center gap-1.5 truncate text-caption opacity-90">
            <span aria-hidden="true" :class="cn('size-2 shrink-0 rounded-full', props.online ? 'bg-nq-success' : 'bg-nq-line-strong')" />
            <span class="sr-only">{{ props.online ? t.online : t.offline }}. </span>
            <span dir="auto" class="truncate">{{ sub }}</span>
          </p>
        </div>
        <NqButton type="button" variant="ghost" size="icon-sm" :aria-label="t.close" class="text-primary-foreground hover:bg-primary-foreground/15" @click="setOpen(false)">
          <X aria-hidden="true" />
        </NqButton>
      </header>
      <NqChatThread :label="props.title ?? t.title" class="flex-1" content-class-name="gap-3 p-4">
        <NqChatMessage :name="props.agent?.name" :avatar-src="props.agent?.avatar">{{ intro }}</NqChatMessage>
        <NqChatMessage
          v-for="m in props.messages"
          :key="m.id"
          :side="m.from === 'visitor' ? 'user' : 'assistant'"
          :name="m.from === 'visitor' ? undefined : (m.name ?? props.agent?.name)"
          :avatar-src="m.avatar ?? (m.from === 'visitor' ? undefined : props.agent?.avatar)"
          :time="m.at"
          :status="m.from === 'visitor' ? m.status : undefined"
          :on-retry="props.onRetry ? () => props.onRetry?.(m.id) : undefined"
        >
          <p v-if="m.text" dir="auto" class="whitespace-pre-wrap text-start [overflow-wrap:anywhere]">{{ m.text }}</p>
          <ul v-if="m.attachments?.length" :class="cn('flex flex-col gap-1.5', m.text && 'mt-2')">
            <li v-for="a in m.attachments" :key="a.id">
              <img v-if="a.kind === 'image' && a.url" :src="a.url" :alt="a.name" class="max-h-40 rounded-control" />
              <span v-else dir="auto" class="inline-flex items-center gap-1 text-body-sm">
                <Paperclip aria-hidden="true" class="size-3.5" />
                {{ a.name }}
              </span>
            </li>
          </ul>
        </NqChatMessage>
        <div v-if="props.online && !hasVisitorMessage && props.starters.length" role="group" :aria-label="t.startersLabel" class="flex flex-wrap gap-2">
          <button
            v-for="s in props.starters"
            :key="s"
            type="button"
            dir="auto"
            class="rounded-full border border-border bg-background px-3 py-1.5 text-body-sm text-foreground outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus"
            @click="send(s)"
          >
            {{ s }}
          </button>
        </div>
        <NqTypingIndicator v-if="props.typing" :label="t.typing" />
      </NqChatThread>
      <p v-if="error" role="alert" class="px-4 pb-2 text-caption text-nq-danger-text">{{ error }}</p>
      <div v-if="props.online" class="border-t border-border p-3">
        <input ref="fileInput" type="file" multiple hidden @change="addFiles" />
        <NqChatComposer v-model="text" :placeholder="t.placeholder" :max-rows="4" @send="send">
          <template #attachments>
            <template v-if="files.length">
              <span
                v-for="(f, i) in files"
                :key="`${f.name}-${i}`"
                class="inline-flex h-7 max-w-48 items-center gap-1 rounded-full border border-border bg-secondary ps-2.5 pe-1 text-caption text-foreground"
              >
                <span dir="auto" class="truncate">{{ f.name }}</span>
                <button
                  type="button"
                  :aria-label="t.removeFile(f.name)"
                  class="grid size-5 place-items-center rounded-full outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus"
                  @click="files = files.filter((_, j) => j !== i)"
                >
                  <X aria-hidden="true" class="size-3" />
                </button>
              </span>
            </template>
          </template>
          <template #actions>
            <NqButton type="button" variant="ghost" size="icon" :aria-label="t.attach" @click="fileInput?.click()">
              <Paperclip aria-hidden="true" />
            </NqButton>
          </template>
        </NqChatComposer>
      </div>
      <NqChatWidgetOffline v-else-if="props.onOfflineSubmit" :t="t" :on-submit="props.onOfflineSubmit" />
    </section>
    <NqButton
      ref="launcher"
      type="button"
      variant="primary"
      size="icon"
      :aria-label="isOpen ? t.close : t.launcher"
      :aria-expanded="isOpen"
      class="relative size-14 rounded-full shadow-floating"
      @click="setOpen(!isOpen)"
    >
      <X v-if="isOpen" aria-hidden="true" class="size-6" />
      <MessageCircle v-else aria-hidden="true" class="size-6 rtl:-scale-x-100" />
      <span
        v-if="!isOpen && props.unread > 0"
        class="absolute -end-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-nq-danger px-1 text-caption tabular-nums text-primary-foreground"
      >
        <span aria-hidden="true">{{ props.unread }}</span>
        <span class="sr-only">{{ t.unread(String(props.unread)) }}</span>
      </span>
    </NqButton>
  </div>
</template>
