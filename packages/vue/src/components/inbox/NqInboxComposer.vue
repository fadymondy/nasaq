<script setup lang="ts">
import { Paperclip, Send, X } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { NqEmojiPicker } from "../emoji-picker";
import { NqInput, NqTextarea } from "../field";
import { NqMentionTextarea, type Mention } from "../mention-textarea";
import { NqTabs, NqTabsList, NqTabsTab } from "../tabs";
import NqCannedPicker from "./NqCannedPicker.vue";
import NqReplyQuote from "./NqReplyQuote.vue";
import { messageText, previewOf, type CannedSnippet, type InboxAgent, type InboxConversation, type InboxDraft, type InboxMessage, type InboxResult } from "./inbox-format";
import { useInboxLabels, type InboxLabels } from "./inbox-strings";

// The reply box of a conversation. Chat and WhatsApp get a text field with attachments, emoji and saved replies (type `/`);
// email gets To, Cc, Subject and a plain text body sent as simple HTML. "Internal note" writes for the team only (with @mentions).
// The voice recorder and the location picker of the React component are not part of the Vue port.
const props = withDefaults(
  defineProps<{
    conversation: Pick<InboxConversation, "id" | "channel" | "subject" | "contact">;
    /** The current agent (used for `{{agent}}` in snippets). */
    me: InboxAgent;
    /** Teammates offered when mentioning with @ in a note. */
    agents?: readonly InboxAgent[];
    snippets?: readonly CannedSnippet[];
    /** The message being answered: shows a quote above the field. */
    replyTo?: InboxMessage | null;
    onCancelReply?: () => void;
    /** Resolve with `{ error }` to keep the draft and show the message. */
    onSend: (draft: InboxDraft) => Promise<InboxResult>;
    disabled?: boolean;
    /** Initial mode. Default "reply". */
    defaultMode?: "reply" | "note";
    labels?: Partial<InboxLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { agents: () => [], snippets: () => [], defaultMode: "reply", replyTo: null },
);
const t = useInboxLabels(() => props.labels);

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const toHtml = (text: string) =>
  text
    .split(/\n/)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");

const c = computed(() => props.conversation);
const email = computed(() => c.value.channel === "email");
const mode = ref<"reply" | "note">(props.defaultMode);
const text = ref("");
const mentions = ref<Mention[]>([]);
const subject = ref(c.value.subject ? `${/^re:/i.test(c.value.subject) ? "" : "Re: "}${c.value.subject}` : "");
const cc = ref("");
const showCc = ref(false);
const files = ref<File[]>([]);
const snippetsOpen = ref(false);
const busy = ref(false);
const error = ref("");
const fileInput = ref<HTMLInputElement | null>(null);

const note = computed(() => mode.value === "note");
const richMode = computed(() => email.value && !note.value);
const empty = computed(() => text.value.trim() === "");
const canSend = computed(() => !props.disabled && !busy.value && (!empty.value || files.value.length > 0));
const mentionOptions = computed(() => props.agents.map((a) => ({ id: a.id, name: a.name, description: a.email, avatar: a.avatar })));
const vars = computed(() => ({ name: c.value.contact.name.split(/\s+/)[0], fullName: c.value.contact.name, agent: props.me.name.split(/\s+/)[0] }));
const words = computed(() => ({ voice: t.value.voiceMessage, location: t.value.locationMessage, attachment: t.value.attachmentMessage }));

async function submit() {
  if (busy.value || props.disabled || !canSend.value) return;
  busy.value = true;
  error.value = "";
  try {
    const result = await props.onSend({
      conversationId: c.value.id,
      channel: c.value.channel,
      mode: mode.value,
      body: richMode.value ? toHtml(text.value.trim()) : text.value.trim(),
      format: richMode.value ? "html" : "text",
      subject: richMode.value ? subject.value : undefined,
      cc: richMode.value && cc.value.trim() ? cc.value.split(/[,;\s]+/).filter(Boolean) : undefined,
      replyToId: props.replyTo?.id,
      attachments: files.value.length ? files.value : undefined,
      mentions: note.value ? mentions.value.map((m) => m.id) : undefined,
    });
    if (result && "error" in result && result.error) {
      error.value = result.error;
      return;
    }
    text.value = "";
    mentions.value = [];
    files.value = [];
    props.onCancelReply?.();
  } catch {
    error.value = t.value.sendFailed;
  } finally {
    busy.value = false;
  }
}

function insert(snippet: string) {
  text.value = text.value ? `${text.value}${text.value.endsWith("\n") ? "" : "\n"}${snippet}` : snippet;
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key !== "Enter" || e.shiftKey || e.isComposing || e.keyCode === 229) return;
  // The mention list uses Enter to pick a person.
  if ((e.currentTarget as HTMLElement).getAttribute("aria-expanded") === "true") return;
  e.preventDefault();
  void submit();
}
function onRootKeyDown(e: KeyboardEvent) {
  if (richMode.value && e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    void submit();
  }
}
function onText(next: string) {
  if (next === "/" && props.snippets.length > 0 && !note.value) {
    snippetsOpen.value = true;
    text.value = "";
    return;
  }
  text.value = next;
}
function onFiles(e: Event) {
  const input = e.target as HTMLInputElement;
  files.value = [...files.value, ...Array.from(input.files ?? [])];
  input.value = "";
}

const placeholder = computed(() => (note.value ? t.value.notePlaceholder : email.value ? t.value.emailPlaceholder : t.value.messagePlaceholder));
const label = computed(() => (note.value ? t.value.note : t.value.message));
</script>

<template>
  <div data-slot="inbox-composer" :data-mode="mode" :class="cn('flex flex-col gap-2 border-t border-border bg-card p-3', props.class)" @keydown="onRootKeyDown">
    <NqTabs v-model="mode" class="gap-0">
      <NqTabsList :aria-label="t.reply">
        <NqTabsTab value="reply">{{ t.reply }}</NqTabsTab>
        <NqTabsTab value="note">{{ t.note }}</NqTabsTab>
      </NqTabsList>
    </NqTabs>
    <p v-if="note" class="text-caption text-muted-foreground">{{ t.noteHint }}</p>
    <div v-if="props.replyTo" class="flex items-start gap-2">
      <NqReplyQuote
        class="mb-0 flex-1"
        :author="`${t.replyTo} ${props.replyTo.author?.name ?? (props.replyTo.direction === 'in' ? c.contact.name : t.you)}`"
        :excerpt="previewOf(props.replyTo, words) || messageText(props.replyTo)"
        :labels="props.labels"
      />
      <NqButton v-if="props.onCancelReply" type="button" variant="ghost" size="icon-sm" :aria-label="t.cancelReply" @click="props.onCancelReply()"><X aria-hidden="true" /></NqButton>
    </div>

    <div :class="cn('flex flex-col gap-2 rounded-card border border-input p-2 transition-colors duration-150 ease-nq focus-within:border-nq-focus', note ? 'border-dashed bg-nq-warning-soft' : 'bg-background')">
      <template v-if="richMode">
        <div class="flex items-center gap-2 text-caption text-muted-foreground">
          <span class="w-12 shrink-0">{{ t.to }}</span>
          <bdi dir="ltr" class="min-w-0 flex-1 truncate text-foreground">{{ c.contact.email }}</bdi>
          <NqButton v-if="!showCc" type="button" variant="link" size="sm" @click="showCc = true">{{ t.addCc }}</NqButton>
        </div>
        <label v-if="showCc" class="flex items-center gap-2 text-caption text-muted-foreground">
          <span class="w-12 shrink-0">{{ t.cc }}</span>
          <NqInput v-model="cc" ltr :placeholder="t.ccPlaceholder" class="h-8" />
        </label>
        <label class="flex items-center gap-2 text-caption text-muted-foreground">
          <span class="w-12 shrink-0">{{ t.subject }}</span>
          <NqInput v-model="subject" dir="auto" class="h-8" />
        </label>
        <NqTextarea
          v-model="text"
          :rows="4"
          dir="auto"
          :placeholder="placeholder"
          :aria-label="t.message"
          :disabled="props.disabled"
          class="min-h-24 resize-none border-0 bg-transparent px-1 py-1 focus-visible:outline-0"
        />
      </template>
      <NqMentionTextarea
        v-else
        :rows="2"
        dir="auto"
        :model-value="text"
        :default-mentions="mentions"
        :suggestions="note ? mentionOptions : []"
        :placeholder="placeholder"
        :aria-label="label"
        :disabled="props.disabled"
        class="min-h-14 resize-none border-0 bg-transparent px-1 py-1 focus-visible:outline-0"
        @keydown="onKeyDown"
        @update:model-value="onText"
        @update:mentions="(m: Mention[]) => (mentions = m)"
      />
      <ul v-if="files.length" class="flex flex-wrap gap-1.5">
        <li v-for="(f, i) in files" :key="`${f.name}-${i}`" class="inline-flex h-7 max-w-48 items-center gap-1 rounded-full border border-border bg-secondary ps-2.5 pe-1 text-caption text-foreground">
          <span dir="auto" class="truncate">{{ f.name }}</span>
          <button
            type="button"
            :aria-label="t.removeAttachment(f.name)"
            class="grid size-5 place-items-center rounded-full outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus"
            @click="files = files.filter((_, j) => j !== i)"
          >
            <X aria-hidden="true" class="size-3" />
          </button>
        </li>
      </ul>
      <div class="flex items-center gap-0.5">
        <input ref="fileInput" type="file" multiple hidden @change="onFiles" />
        <NqButton type="button" variant="ghost" size="icon-sm" :aria-label="t.attach" :disabled="props.disabled" @click="fileInput?.click()"><Paperclip aria-hidden="true" /></NqButton>
        <NqEmojiPicker v-if="!richMode" side="top" @emoji-select="(e) => (text += e.emoji)">
          <template #trigger>
            <NqButton type="button" variant="ghost" size="icon-sm" :aria-label="t.emoji" :disabled="props.disabled"><span aria-hidden="true" class="text-base leading-none">🙂</span></NqButton>
          </template>
        </NqEmojiPicker>
        <NqCannedPicker v-if="props.snippets.length && !note" v-model:open="snippetsOpen" :snippets="props.snippets" :variables="vars" :on-pick="insert" :labels="props.labels" />
        <span class="flex-1" />
        <span v-if="c.channel === 'whatsapp' && !note" class="me-2 hidden text-caption text-muted-foreground sm:inline">{{ t.channelHintWhatsapp }}</span>
        <NqButton type="button" variant="primary" :size="note || richMode ? 'md' : 'icon'" :loading="busy" :disabled="!canSend" :aria-label="note ? t.sendNote : t.send" @click="submit()">
          <template v-if="note || richMode">
            <Send aria-hidden="true" class="rtl:-scale-x-100" />
            {{ note ? t.sendNote : t.send }}
          </template>
          <Send v-else aria-hidden="true" class="rtl:-scale-x-100" />
        </NqButton>
      </div>
    </div>
    <p v-if="error" role="alert" class="text-caption text-nq-danger-text">{{ error }}</p>
  </div>
</template>
