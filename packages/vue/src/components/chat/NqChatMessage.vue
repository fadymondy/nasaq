<script setup lang="ts">
import { Check, CircleAlert } from "lucide-vue-next";
import { Comment, h, Text, useSlots, type HTMLAttributes, type VNode } from "vue";
import { cn } from "../../lib/cn";
import { useT } from "../../provider";
import { NqAvatar } from "../avatar";
import { NqButton } from "../button";
import { NqMarkdown } from "../markdown";
import { NqDateTime } from "../numeric";
import { NqSpinner } from "../spinner";
import NqTypingIndicator from "./NqTypingIndicator.vue";
import type { ChatSide, ChatStatus } from "./types";

// One message row: avatar, byline with time and status, and a bubble.
const props = withDefaults(
  defineProps<{
    /** `user` sits on the inline-end edge, `assistant` on the inline-start edge (mirrors in RTL). Default "assistant". */
    side?: ChatSide;
    /** Sender name: the avatar's initials and the visible byline. */
    name?: string;
    avatarSrc?: string;
    /** When it was sent. Shown as a localised time with `<time>`. */
    time?: Date | number | string;
    /** Delivery state. `error` shows a retry button when `onRetry` is set. */
    status?: ChatStatus;
    /** Called by the retry button of an `error` message. */
    onRetry?: () => void;
    /** Plain text keeps whitespace; `markdown` renders through Markdown (safe, no raw HTML). Default "text". */
    format?: "text" | "markdown";
    /** The message is still being produced: shows the typing indicator after the text. */
    streaming?: boolean;
    /** Message body as a string (or put it in the default slot: plain text follows `format`, elements are rendered as is). */
    text?: string;
    class?: HTMLAttributes["class"];
  }>(),
  { side: "assistant", format: "text", streaming: false },
);
const t = useT();
const slots = useSlots();

/** The slot as a string when it holds only text, else null. */
function plain(nodes: VNode[]): string | null {
  const real = nodes.filter((n) => n.type !== Comment);
  if (real.every((n) => n.type === Text)) return real.map((n) => String(n.children ?? "")).join("");
  return null;
}

const Bubble = () => {
  const nodes = slots.default?.() ?? [];
  const text = props.text ?? plain(nodes);
  const empty = text !== null ? text === "" : false;
  const body = empty
    ? null
    : text !== null && props.format === "markdown"
      ? h(NqMarkdown, { source: text })
      : text !== null
        ? h("p", { dir: "auto", class: "whitespace-pre-wrap text-start [overflow-wrap:anywhere]" }, text)
        : nodes;
  return [body, props.streaming ? h(NqTypingIndicator, { class: empty ? undefined : "mt-1 block" }) : null];
};
</script>

<template>
  <div
    data-slot="chat-message"
    :data-side="props.side"
    :data-status="props.status"
    :data-streaming="props.streaming ? '' : undefined"
    :class="cn('flex max-w-[85%] items-start gap-2', props.side === 'user' ? 'flex-row-reverse self-end' : 'self-start', props.class)"
  >
    <slot name="avatar"><NqAvatar v-if="props.name" :name="props.name" :src="props.avatarSrc" size="sm" class="mt-0.5" /></slot>
    <div :class="cn('flex min-w-0 flex-col gap-1', props.side === 'user' ? 'items-end' : 'items-start')">
      <div v-if="props.name || props.time" class="flex items-center gap-2 text-caption text-muted-foreground">
        <span v-if="props.name" class="text-label text-foreground">{{ props.name }}</span>
        <NqDateTime v-if="props.time" :value="props.time" :format="{ timeStyle: 'short' }" />
      </div>
      <div
        data-slot="chat-bubble"
        :aria-busy="props.streaming || undefined"
        :class="
          cn(
            'min-w-0 rounded-card px-3 py-2 text-body',
            props.side === 'user' ? 'bg-secondary text-secondary-foreground' : 'border border-border bg-card text-nq-fg-body',
            props.status === 'error' && 'border border-nq-danger',
          )
        "
      >
        <Bubble />
      </div>
      <div v-if="props.status" data-slot="chat-status" class="flex items-center gap-1.5 text-caption text-muted-foreground">
        <template v-if="props.status === 'sending'">
          <NqSpinner class="size-3" />
          <span role="status">{{ t("Sending…", "جارٍ الإرسال…") }}</span>
        </template>
        <template v-else-if="props.status === 'sent'">
          <Check aria-hidden="true" class="size-3" />
          <span>{{ t("Sent", "تم الإرسال") }}</span>
        </template>
        <template v-else>
          <CircleAlert aria-hidden="true" class="size-3 text-nq-danger-text" />
          <span role="alert" class="text-nq-danger-text">{{ t("Failed to send", "تعذر الإرسال") }}</span>
          <NqButton v-if="props.onRetry" type="button" variant="link" size="sm" @click="props.onRetry()">{{ t("Retry", "إعادة المحاولة") }}</NqButton>
        </template>
      </div>
    </div>
  </div>
</template>
