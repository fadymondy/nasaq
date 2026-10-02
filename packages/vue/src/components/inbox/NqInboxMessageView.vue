<script setup lang="ts">
import { CornerUpLeft, Lock } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqAvatar } from "../avatar";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqChatMessage } from "../chat";
import { NqDateTime } from "../numeric";
import NqAttachmentList from "./NqAttachmentList.vue";
import NqLinkPreviewCard from "./NqLinkPreviewCard.vue";
import NqLocationCard from "./NqLocationCard.vue";
import NqMessageReactions from "./NqMessageReactions.vue";
import NqMessageText from "./NqMessageText.vue";
import NqReactionPicker from "./NqReactionPicker.vue";
import NqReplyQuote from "./NqReplyQuote.vue";
import NqVoicePlayer from "./NqVoicePlayer.vue";
import type { InboxChannel, InboxMessage } from "./inbox-format";
import { messageText } from "./inbox-format";
import { useInboxLabels, type InboxLabels } from "./inbox-strings";

// Renders one message by kind: an event line, an internal note, an email card, or a chat bubble carrying text, a voice note, a
// location, attachments, a link preview, a reply quote and reactions. Reply and react show on hover or focus.
// Email HTML bodies are shown as plain text here (the Vue port does not bundle the rich-text editor).
const props = withDefaults(
  defineProps<{
    message: InboxMessage;
    channel: InboxChannel;
    /** Name and avatar of the contact, for inbound messages. */
    contact: { name: string; avatar?: string };
    /** Id of the current agent (reaction state). */
    me: string;
    /** Find-in-thread query and the current match inside this message (0-based, or -1). */
    query?: string;
    current?: number;
    onReply?: (message: InboxMessage) => void;
    onReact?: (message: InboxMessage, emoji: string) => void;
    onRetry?: (message: InboxMessage) => void;
    /** Jump to the quoted message. */
    onJump?: (messageId: string) => void;
    labels?: Partial<InboxLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { current: -1 },
);
const t = useInboxLabels(() => props.labels);
const m = computed(() => props.message);
const out = computed(() => m.value.direction === "out");
const who = computed(() => m.value.author?.name ?? (out.value ? t.value.you : props.contact.name));
const text = computed(() => messageText(m.value));
const chatStatus = computed(() => (m.value.status === "sending" || m.value.status === "error" ? m.value.status : undefined));
const hasBubbleContent = computed(
  () => Boolean(m.value.replyTo) || (m.value.kind === "voice" && m.value.voice) || (m.value.kind === "location" && m.value.location) || Boolean(m.value.attachments?.length) || (text.value && m.value.kind !== "voice") || Boolean(m.value.linkPreview),
);
</script>

<template>
  <div v-if="m.kind === 'system'" data-slot="inbox-event" :data-message-id="m.id" :class="cn('flex items-center gap-3 text-caption text-muted-foreground', props.class)">
    <span aria-hidden="true" class="h-px flex-1 bg-border" />
    <span dir="auto" class="text-center">{{ text }}</span>
    <NqDateTime :value="m.at" :format="{ timeStyle: 'short' }" />
    <span aria-hidden="true" class="h-px flex-1 bg-border" />
  </div>

  <div v-else-if="m.kind === 'note'" data-slot="inbox-note" :data-message-id="m.id" :class="cn('flex flex-col gap-1 rounded-card border border-dashed border-nq-warning/50 bg-nq-warning-soft p-3', props.class)">
    <div class="flex items-center gap-2 text-caption text-muted-foreground">
      <NqBadge variant="warning"><Lock aria-hidden="true" />{{ t.noteBadge }}</NqBadge>
      <span class="text-label text-foreground">{{ who }}</span>
      <NqDateTime :value="m.at" :format="{ timeStyle: 'short' }" />
    </div>
    <NqMessageText :text="text" :query="props.query" :current="props.current" class="text-body text-nq-fg-body" />
  </div>

  <article v-else-if="props.channel === 'email'" data-slot="inbox-email" :data-message-id="m.id" :data-direction="m.direction" :class="cn('flex flex-col gap-3 rounded-card border border-border bg-card p-4', props.class)">
    <header class="flex items-start gap-3">
      <NqAvatar :name="who" :src="out ? m.author?.avatar : props.contact.avatar" size="md" />
      <div class="flex min-w-0 flex-1 flex-col">
        <span class="flex flex-wrap items-center gap-x-2 text-label text-foreground">
          <span dir="auto">{{ who }}</span>
          <NqBadge v-if="out" variant="outline">{{ t.reply }}</NqBadge>
        </span>
        <span v-if="m.to?.length" class="truncate text-caption text-muted-foreground">
          {{ t.to }}: <bdi dir="ltr">{{ m.to.join(", ") }}</bdi>
          <template v-if="m.cc?.length">
            {{ " · " }}{{ t.cc }}: <bdi dir="ltr">{{ m.cc.join(", ") }}</bdi>
          </template>
        </span>
      </div>
      <NqDateTime :value="m.at" :format="{ dateStyle: 'medium', timeStyle: 'short' }" class="shrink-0 text-caption text-muted-foreground" />
    </header>
    <h3 v-if="m.subject" dir="auto" class="text-h3 text-foreground">{{ m.subject }}</h3>
    <NqMessageText :text="text" :query="props.query" :current="props.current" class="text-body text-nq-fg-body" />
    <NqAttachmentList v-if="m.attachments?.length" :items="m.attachments" />
    <NqLinkPreviewCard v-if="m.linkPreview" :data="m.linkPreview" :labels="props.labels" />
    <span v-if="m.status === 'sending'" role="status" class="text-caption text-muted-foreground">{{ t.sending }}</span>
    <span v-else-if="m.status === 'error'" class="flex items-center gap-2 text-caption text-nq-danger-text">
      <span role="alert">{{ t.failed }}</span>
      <NqButton v-if="props.onRetry" type="button" variant="link" size="sm" @click="props.onRetry(m)">{{ t.retry }}</NqButton>
    </span>
    <footer v-if="props.onReply">
      <NqButton type="button" variant="secondary" size="sm" @click="props.onReply(m)">
        <CornerUpLeft aria-hidden="true" class="rtl:-scale-x-100" />
        {{ t.replyAction }}
      </NqButton>
    </footer>
  </article>

  <div v-else data-slot="inbox-message" :data-message-id="m.id" :data-direction="m.direction" :class="cn('group flex max-w-[88%] items-start gap-1', out ? 'flex-row-reverse self-end' : 'self-start', props.class)">
    <div class="flex min-w-0 flex-col gap-1">
      <NqChatMessage
        :side="out ? 'user' : 'assistant'"
        :name="who"
        :avatar-src="out ? m.author?.avatar : props.contact.avatar"
        :time="m.at"
        :status="chatStatus"
        :on-retry="props.onRetry ? () => props.onRetry?.(m) : undefined"
        class="max-w-full"
      >
        <div v-if="hasBubbleContent" class="flex flex-col">
          <NqReplyQuote v-if="m.replyTo" :author="m.replyTo.author" :excerpt="m.replyTo.excerpt" :on-jump="props.onJump ? () => props.onJump?.(m.replyTo?.id as string) : undefined" :labels="props.labels" />
          <NqVoicePlayer v-if="m.kind === 'voice' && m.voice" :src="m.voice.src" :duration="m.voice.duration" :waveform="m.voice.waveform" :labels="props.labels" />
          <NqLocationCard v-if="m.kind === 'location' && m.location" :point="m.location" :labels="props.labels" class="my-1" />
          <NqAttachmentList v-if="m.attachments?.length" :items="m.attachments" class="my-1" />
          <NqMessageText v-if="text && m.kind !== 'voice'" :text="text" :query="props.query" :current="props.current" />
          <NqLinkPreviewCard v-if="m.linkPreview" :data="m.linkPreview" :labels="props.labels" class="mt-2 w-60" />
        </div>
      </NqChatMessage>
      <NqMessageReactions
        v-if="m.reactions?.length && props.onReact"
        :reactions="m.reactions"
        :me="props.me"
        :on-toggle="(emoji: string) => props.onReact?.(m, emoji)"
        :labels="props.labels"
        :class="out ? 'justify-end' : 'ms-8 justify-start'"
      />
    </div>
    <div
      v-if="props.onReply || props.onReact"
      data-slot="message-actions"
      class="flex shrink-0 items-center self-center opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100"
    >
      <NqReactionPicker v-if="props.onReact" :on-pick="(emoji: string) => props.onReact?.(m, emoji)" :labels="props.labels" />
      <NqButton v-if="props.onReply" type="button" variant="ghost" size="icon-sm" :aria-label="t.replyAction" @click="props.onReply(m)">
        <CornerUpLeft aria-hidden="true" class="rtl:-scale-x-100" />
      </NqButton>
    </div>
  </div>
</template>
