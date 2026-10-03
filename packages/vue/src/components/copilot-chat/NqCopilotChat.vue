<script setup lang="ts">
import { Check, Copy, Paperclip, Plus, Send, Slash, Sparkles, Square, X } from "lucide-vue-next";
import { computed, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAiModelSelect } from "../ai-model-picker";
import type { Artifact, PickerArtifact } from "../artifact-renderer";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqChatMessage, NqChatThread } from "../chat";
import type { AiTarget } from "../code-block-variants";
import { NqMentionTextarea, type Mention, type MentionOption } from "../mention-textarea";
import NqCopilotAnswer from "./NqCopilotAnswer.vue";
import NqCopilotAttachmentChip from "./NqCopilotAttachmentChip.vue";
import NqCopilotContextBar from "./NqCopilotContextBar.vue";
import NqCopilotHistory from "./NqCopilotHistory.vue";
import {
  copilotFilterCommands,
  copilotSlashQuery,
  copilotTranscript,
  copilotVisibleMessages,
  copilotWithoutSlash,
  type CopilotAttachment,
  type CopilotCommand,
  type CopilotContextItem,
  type CopilotMessage,
  type CopilotModel,
  type CopilotSessionSummary,
  type CopilotToggle,
} from "./copilot-format";
import { copilotWriteClipboard, useCopilotFlash } from "./flash";
import { copilotWords, type CopilotChatLabels } from "./labels";

// An AI assistant chat: streamed Markdown answers with tool-call steps, artifacts and sources, starter prompts and follow-ups, context
// chips, attachments, "/" commands, toggles, history, a model picker, and copy-for-AI code blocks. It works as a side panel or a full
// page. You own `messages` and stream into them. Callbacks are props (`onSend`, `onStop`, ...) so a feature turns on when you pass its
// callback, exactly as in React: `onAttach` shows the attach button, `onFeedback` the thumbs, `onClose` the close button.
export interface CopilotSendMeta {
  context: CopilotContextItem[];
  model: string | undefined;
  mentions: Mention[];
  /** Files in the composer when it was sent. */
  attachments: CopilotAttachment[];
  /** Ids of the "/" commands chosen for this prompt. */
  commands: string[];
  /** Ids of the toggles that were on. */
  toggles: string[];
}

const props = withDefaults(
  defineProps<{
    messages: readonly CopilotMessage[];
    /** A prompt from the box, a starter, or a follow-up. */
    onSend: (text: string, meta: CopilotSendMeta) => void | Promise<void>;
    /** Stops the answer that is streaming. */
    onStop?: () => void;
    /** Runs the last answer again. Shows Try again on it. */
    onRegenerate?: (messageId: string) => void;
    onFeedback?: (messageId: string, value: "up" | "down") => void;
    /** `panel` is a narrow side sheet with a close button. `page` is a centred column. */
    mode?: "panel" | "page";
    title?: string;
    /** Called by the close button. */
    onClose?: () => void;
    onNewChat?: () => void;
    /** Starter prompts on the empty screen. */
    starters?: readonly string[];
    /** Context chips sent with the next prompt. */
    context?: readonly CopilotContextItem[];
    onContextChange?: (items: CopilotContextItem[]) => void;
    /** Items the Add context menu can offer. */
    contextOptions?: readonly CopilotContextItem[];
    models?: readonly CopilotModel[];
    model?: string;
    onModelChange?: (id: string) => void;
    /** People or things the visitor can @mention. */
    mentions?: readonly MentionOption[];
    /** Assistants offered by the copy menu of code blocks. Default Claude, ChatGPT and Cursor. */
    copyTargets?: readonly AiTarget[];
    /** Controlled text of the box, for prefilling it from outside. */
    draft?: string;
    onDraftChange?: (text: string) => void;
    /** Files in the composer. You upload them in `onAttach` and keep the list. */
    attachments?: readonly CopilotAttachment[];
    /** Turns on the attach button, paste and drag and drop. */
    onAttach?: (files: File[]) => void;
    onAttachmentsChange?: (items: CopilotAttachment[]) => void;
    /** `accept` of the file input, such as "image/*,.pdf". */
    accept?: string;
    /** Tools, skills or agents offered by typing "/". */
    commands?: readonly CopilotCommand[];
    /** On/off options under the box, such as thinking or web search. */
    toggles?: readonly CopilotToggle[];
    /** Ids of the toggles that are on. Uncontrolled when left out. */
    activeToggles?: readonly string[];
    onTogglesChange?: (ids: string[]) => void;
    /** Saved conversations for the History menu. */
    sessions?: readonly CopilotSessionSummary[];
    activeSessionId?: string;
    onSessionSelect?: (id: string) => void;
    onSessionDelete?: (id: string) => void;
    /** Buttons or pressed artifacts in answers. */
    onArtifactAction?: (actionId: string, artifact: Artifact) => void | Promise<void | { error?: string }>;
    onArtifactPick?: (values: string[], artifact: PickerArtifact) => void | Promise<void | { error?: string }>;
    allowHtml?: boolean;
    /** Adds a Share button to answers where the Web Share API exists. */
    share?: boolean;
    /** Small print under the box, such as "AI can make mistakes" (or use the `disclaimer` slot). */
    disclaimer?: string;
    labels?: Partial<CopilotChatLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { mode: "panel", context: () => [], mentions: () => [], attachments: () => [] },
);

const nq = useNasaq();
const t = computed(() => copilotWords(nq.locale.value, props.labels));
const page = computed(() => props.mode === "page");
const visible = computed(() => copilotVisibleMessages(props.messages));
const innerText = ref("");
const text = computed(() => props.draft ?? innerText.value);
function setText(v: string) {
  innerText.value = v;
  props.onDraftChange?.(v);
}
const found = ref<Mention[]>([]);
const { on: copiedAll, flash: flashAll } = useCopilotFlash();
const chosen = ref<string[]>([]);
const innerToggles = ref<string[]>([]);
const onToggles = computed(() => (props.activeToggles ? [...props.activeToggles] : innerToggles.value));
const dragging = ref(false);
const fileRef = ref<HTMLInputElement | null>(null);
const listId = useId();
const streaming = computed(() => props.messages.some((m) => m.streaming));
const lastId = computed(() => visible.value[visible.value.length - 1]?.id);
const currentModel = computed(() => props.model ?? props.models?.[0]?.id);
const uploading = computed(() => props.attachments.some((a) => a.progress !== undefined && a.progress < 1 && !a.error));

// "/" menu: the word at the caret, the matches, the highlighted one, and a dismissed position.
const caret = ref(0);
const slashIndex = ref(0);
const dismissed = ref<number | null>(null);
const slash = computed(() => (props.commands?.length ? copilotSlashQuery(text.value, Math.min(caret.value, text.value.length)) : null));
const slashOpen = computed(() => !!slash.value && dismissed.value !== slash.value.start);
const matches = computed(() => (slashOpen.value && props.commands && slash.value ? copilotFilterCommands(props.commands, slash.value.query, chosen.value) : []));
const active = computed(() => (matches.value.length ? Math.min(slashIndex.value, matches.value.length - 1) : -1));
const optionId = (i: number) => `${listId}-${i}`;
const chosenCommands = computed(() => chosen.value.map((id) => props.commands?.find((c) => c.id === id)).filter((c): c is CopilotCommand => !!c));
const announce = computed(() => (slashOpen.value ? `${t.value.commands}: ${matches.value.length}${matches.value[active.value] ? `. ${matches.value[active.value]!.label}` : ""}` : ""));

function choose(c: CopilotCommand) {
  chosen.value = [...chosen.value, c.id];
  setText(copilotWithoutSlash(text.value, Math.min(caret.value, text.value.length)));
  slashIndex.value = 0;
}

function flip(id: string) {
  const next = onToggles.value.includes(id) ? onToggles.value.filter((x) => x !== id) : [...onToggles.value, id];
  innerToggles.value = next;
  props.onTogglesChange?.(next);
}

function send(value: string, m: Mention[] = []) {
  const v = value.trim();
  if ((!v && props.attachments.length === 0) || streaming.value || uploading.value) return;
  void props.onSend(v, { context: [...props.context], model: currentModel.value, mentions: m, attachments: [...props.attachments], commands: [...chosen.value], toggles: [...onToggles.value] });
  setText("");
  found.value = [];
  chosen.value = [];
  dismissed.value = null;
  if (props.attachments.length) props.onAttachmentsChange?.([]);
}

function take(files: FileList | File[] | null | undefined) {
  const list = Array.from(files ?? []);
  if (list.length && props.onAttach) props.onAttach(list);
}

function onDragOver(e: DragEvent) {
  if (!props.onAttach || !e.dataTransfer?.types.includes("Files")) return;
  e.preventDefault();
  dragging.value = true;
}
function onDragLeave(e: DragEvent) {
  if (!props.onAttach) return;
  if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node | null)) dragging.value = false;
}
function onDrop(e: DragEvent) {
  if (!props.onAttach || !e.dataTransfer?.files.length) return;
  e.preventDefault();
  dragging.value = false;
  take(e.dataTransfer.files);
}
function onPaste(e: ClipboardEvent) {
  if (!props.onAttach || !e.clipboardData || e.clipboardData.files.length === 0) return;
  if (!e.clipboardData.getData("text/plain")) e.preventDefault();
  take(e.clipboardData.files);
}
function onKeyUp(e: Event) {
  caret.value = (e.target as HTMLTextAreaElement).selectionStart;
}
function onKeyDown(e: KeyboardEvent) {
  if (slashOpen.value && !e.isComposing) {
    const n = matches.value.length;
    if (e.key === "ArrowDown" && n) {
      e.preventDefault();
      slashIndex.value = (active.value + 1) % n;
      return;
    }
    if (e.key === "ArrowUp" && n) {
      e.preventDefault();
      slashIndex.value = (active.value - 1 + n) % n;
      return;
    }
    if ((e.key === "Enter" || e.key === "Tab") && !e.shiftKey && matches.value[active.value]) {
      e.preventDefault();
      choose(matches.value[active.value]!);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      dismissed.value = slash.value?.start ?? null;
      return;
    }
  }
  // The mention list handles Enter itself while it is open (the textarea reports aria-expanded).
  if ((e.target as HTMLElement).getAttribute("aria-expanded") === "true") return;
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing && !e.defaultPrevented) {
    e.preventDefault();
    send(text.value, found.value);
  }
}

async function copyAll() {
  if (await copilotWriteClipboard(copilotTranscript(visible.value, { user: t.value.you, assistant: t.value.assistant }))) flashAll();
}
</script>

<template>
  <section
    :aria-label="props.title ?? t.conversation"
    data-slot="copilot-chat"
    :data-mode="props.mode"
    :class="cn('flex min-h-0 flex-col bg-background text-foreground', page ? 'h-full w-full' : 'h-full w-full border-border', props.class)"
  >
    <header :class="cn('flex items-center gap-2 border-b border-border px-4 py-2.5', page && 'justify-center')">
      <span aria-hidden="true" class="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><Sparkles class="size-3.5" /></span>
      <h2 class="min-w-0 flex-1 truncate text-label">{{ props.title ?? t.title }}</h2>
      <NqCopilotHistory v-if="props.sessions && props.onSessionSelect" :sessions="props.sessions" :active-id="props.activeSessionId" :on-select="props.onSessionSelect" :on-delete="props.onSessionDelete" :t="t" />
      <NqButton v-if="props.onNewChat" variant="ghost" size="icon-sm" :aria-label="t.newChat" :title="t.newChat" @click="props.onNewChat()">
        <Plus aria-hidden="true" class="size-4" />
      </NqButton>
      <NqButton v-if="visible.length > 0" variant="ghost" size="icon-sm" :aria-label="copiedAll ? t.copied : t.copyChat" :title="copiedAll ? t.copied : t.copyChat" @click="copyAll">
        <Check v-if="copiedAll" aria-hidden="true" class="size-4" />
        <Copy v-else aria-hidden="true" class="size-4" />
      </NqButton>
      <slot name="header-actions" />
      <NqButton v-if="props.onClose" variant="ghost" size="icon-sm" :aria-label="t.close" :title="t.close" @click="props.onClose()">
        <X aria-hidden="true" class="size-4" />
      </NqButton>
    </header>

    <div v-if="visible.length === 0" class="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 overflow-y-auto p-6 text-center">
      <span aria-hidden="true" class="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground"><Sparkles class="size-6" /></span>
      <div class="flex flex-col gap-1">
        <h3 class="text-h3">{{ t.emptyTitle }}</h3>
        <p class="text-body-sm text-muted-foreground">{{ t.emptyBody }}</p>
      </div>
      <ul v-if="props.starters?.length" :aria-label="t.starters" :class="cn('grid w-full gap-2', page ? 'max-w-2xl sm:grid-cols-2' : 'max-w-sm')">
        <li v-for="s in props.starters" :key="s">
          <button
            type="button"
            dir="auto"
            class="w-full rounded-card border border-border bg-card px-4 py-3 text-start text-body-sm outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus"
            @click="send(s)"
          >
            {{ s }}
          </button>
        </li>
      </ul>
    </div>
    <NqChatThread v-else :label="t.conversation" class="min-h-0 flex-1" :content-class-name="cn('gap-5 p-4', page && 'mx-auto w-full max-w-3xl')">
      <template v-for="m in visible" :key="m.id">
        <NqChatMessage v-if="m.role === 'user'" side="user" :name="t.you" :time="m.at" format="text">
          <span v-if="m.attachments?.length" class="flex flex-col gap-2">
            <span role="list" :aria-label="t.attachments" class="flex flex-wrap gap-1.5">
              <NqCopilotAttachmentChip v-for="a in m.attachments" :key="a.id" role="listitem" :attachment="a" :labels="props.labels" />
            </span>
            <span v-if="m.text" class="whitespace-pre-wrap">{{ m.text }}</span>
          </span>
          <template v-else>{{ m.text }}</template>
        </NqChatMessage>
        <NqCopilotAnswer
          v-else
          :message="m"
          :last="m.id === lastId"
          :on-regenerate="props.onRegenerate"
          :on-feedback="props.onFeedback"
          :on-follow-up="(f: string) => send(f)"
          :copy-targets="props.copyTargets"
          :on-artifact-action="props.onArtifactAction"
          :on-artifact-pick="props.onArtifactPick"
          :allow-html="props.allowHtml"
          :share="props.share"
          :labels="props.labels"
        />
      </template>
    </NqChatThread>

    <div :class="cn('flex flex-col gap-2 border-t border-border p-3', page && 'items-center')">
      <div :class="cn('relative flex w-full flex-col gap-2', page && 'max-w-3xl')">
        <NqCopilotContextBar :items="props.context" :on-change="props.onContextChange" :options="props.contextOptions ?? []" :labels="props.labels" />
        <div v-if="slashOpen" data-slot="copilot-commands" class="absolute inset-x-0 bottom-full z-10 mb-2 overflow-hidden rounded-card border border-border bg-popover text-popover-foreground">
          <p class="border-b border-border px-3 py-1.5 text-caption text-muted-foreground">{{ t.commands }}</p>
          <p v-if="matches.length === 0" class="px-3 py-3 text-caption text-muted-foreground">{{ t.noCommands }}</p>
          <ul v-else :id="listId" role="listbox" :aria-label="t.commands" class="max-h-60 overflow-y-auto p-1">
            <li
              v-for="(c, i) in matches"
              :id="optionId(i)"
              :key="c.id"
              role="option"
              :aria-selected="i === active"
              class="flex cursor-pointer items-center gap-2 rounded-control px-2.5 py-1.5 aria-selected:bg-nq-selected"
              @mousedown.prevent
              @click="choose(c)"
              @mouseenter="slashIndex = i"
            >
              <Slash aria-hidden="true" class="size-3.5 shrink-0 text-muted-foreground" />
              <span class="flex min-w-0 flex-1 flex-col">
                <span dir="auto" class="truncate text-body-sm text-foreground">{{ c.label }}</span>
                <span v-if="c.description" dir="auto" class="truncate text-caption text-muted-foreground">{{ c.description }}</span>
              </span>
              <NqBadge v-if="c.kind" variant="neutral">{{ c.kind }}</NqBadge>
            </li>
          </ul>
        </div>
        <span aria-live="polite" class="sr-only">{{ announce }}</span>
        <div
          data-slot="copilot-composer"
          :data-dragging="dragging || undefined"
          class="relative flex flex-col gap-2 rounded-card border border-border bg-card p-2 focus-within:outline-2 focus-within:outline-nq-focus data-[dragging]:border-dashed data-[dragging]:border-primary"
          @dragover="onDragOver"
          @dragleave="onDragLeave"
          @drop="onDrop"
        >
          <div v-if="dragging" aria-hidden="true" class="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-card bg-card/90 text-body-sm text-foreground">{{ t.dropFiles }}</div>
          <div v-if="props.attachments.length || chosenCommands.length" class="flex flex-wrap items-center gap-1.5">
            <span v-for="c in chosenCommands" :key="c.id" data-slot="copilot-command-chip" class="inline-flex max-w-48 items-center gap-1 rounded-full bg-nq-selected ps-2 pe-1 text-caption text-foreground">
              <Slash aria-hidden="true" class="size-3 shrink-0 text-muted-foreground" />
              <span dir="auto" class="truncate">{{ c.label }}</span>
              <button
                type="button"
                :aria-label="t.removeCommand(c.label)"
                class="grid size-5 shrink-0 place-items-center rounded-full text-muted-foreground outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus"
                @click="chosen = chosen.filter((x) => x !== c.id)"
              >
                <X aria-hidden="true" class="size-3" />
              </button>
            </span>
            <NqCopilotAttachmentChip
              v-for="a in props.attachments"
              :key="a.id"
              :attachment="a"
              :labels="props.labels"
              :on-remove="props.onAttachmentsChange ? () => props.onAttachmentsChange?.(props.attachments.filter((x) => x.id !== a.id)) : undefined"
            />
          </div>
          <NqMentionTextarea
            :aria-label="t.message"
            :list-label="t.mentions"
            :placeholder="props.commands?.length ? `${t.placeholder} ${t.commandHint}.` : t.placeholder"
            :rows="2"
            :model-value="text"
            :suggestions="[...props.mentions]"
            wrapper-class="w-full"
            class="max-h-40 min-h-12 w-full resize-none border-0 bg-transparent p-1 shadow-none outline-none focus-visible:outline-none"
            @update:model-value="setText"
            @update:mentions="(m: Mention[]) => (found = m)"
            @keyup="onKeyUp"
            @click="onKeyUp"
            @paste="onPaste"
            @keydown="onKeyDown"
          />
          <div class="flex flex-wrap items-center gap-1">
            <template v-if="props.onAttach">
              <input
                ref="fileRef"
                type="file"
                multiple
                :accept="props.accept"
                hidden
                @change="(e) => (take((e.target as HTMLInputElement).files), ((e.target as HTMLInputElement).value = ''))"
              />
              <NqButton variant="ghost" size="icon-sm" :aria-label="t.attach" :title="t.attach" @click="fileRef?.click()">
                <Paperclip aria-hidden="true" class="size-4" />
              </NqButton>
            </template>
            <div v-if="props.toggles?.length" role="group" :aria-label="t.options" class="flex flex-wrap items-center gap-1">
              <NqButton
                v-for="g in props.toggles"
                :key="g.id"
                variant="ghost"
                size="sm"
                :aria-pressed="onToggles.includes(g.id)"
                :title="g.description"
                class="h-control-sm gap-1.5 px-2 text-caption text-muted-foreground aria-pressed:bg-nq-selected aria-pressed:text-foreground"
                @click="flip(g.id)"
              >
                <component :is="g.icon" v-if="g.icon" />
                {{ g.label }}
              </NqButton>
            </div>
            <NqAiModelSelect
              v-if="props.models && props.models.length > 0 && props.onModelChange"
              :models="props.models"
              :model-value="currentModel"
              :label="t.model"
              class="h-control-sm w-auto min-w-0 max-w-44 border-0 bg-transparent text-caption"
              @update:model-value="props.onModelChange"
            />
            <span class="flex-1" />
            <NqButton v-if="streaming && props.onStop" variant="primary" size="icon-sm" :aria-label="t.stop" :title="t.stop" @click="props.onStop()">
              <Square aria-hidden="true" class="size-3.5 fill-current" />
            </NqButton>
            <NqButton
              v-else
              variant="primary"
              size="icon-sm"
              :aria-label="t.send"
              :title="t.send"
              :disabled="streaming || uploading || (text.trim() === '' && props.attachments.length === 0)"
              @click="send(text, found)"
            >
              <Send aria-hidden="true" class="size-3.5 rtl:-scale-x-100" />
            </NqButton>
          </div>
        </div>
        <p v-if="props.disclaimer || $slots.disclaimer" class="text-center text-[11px] text-muted-foreground"><slot name="disclaimer">{{ props.disclaimer }}</slot></p>
      </div>
    </div>
  </section>
</template>
