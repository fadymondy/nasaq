<script setup lang="ts">
import { X } from "lucide-vue-next";
import { onBeforeUnmount, ref, watchEffect, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { NqNotificationItem } from "../notification-item";
import { useFormatDate } from "../numeric";
import { previewOf, type InboxConversation, type InboxMessage } from "./inbox-format";
import { useInboxLabels, type InboxLabels } from "./inbox-strings";

// A toast for a message that just arrived in a conversation you are not looking at. Hides itself after `autoHideMs`
// (hover and focus pause it; 0 keeps it).
const props = withDefaults(
  defineProps<{
    conversation: Pick<InboxConversation, "id" | "contact" | "subject" | "channel">;
    message: InboxMessage;
    onOpen: () => void;
    onDismiss: () => void;
    autoHideMs?: number;
    labels?: Partial<InboxLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { autoHideMs: 7000 },
);
const t = useInboxLabels(() => props.labels);
const fmt = useFormatDate();
const paused = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;

watchEffect((onCleanup) => {
  if (!props.autoHideMs || paused.value) return;
  timer = setTimeout(() => props.onDismiss(), props.autoHideMs);
  onCleanup(() => clearTimeout(timer));
});
onBeforeUnmount(() => clearTimeout(timer));
</script>

<template>
  <div
    role="status"
    data-slot="new-message-toast"
    :class="cn('relative w-80 max-w-full overflow-hidden rounded-floating border border-border bg-popover text-popover-foreground shadow-floating', props.class)"
    @mouseenter="paused = true"
    @mouseleave="paused = false"
    @focusin="paused = true"
    @focusout="paused = false"
  >
    <NqNotificationItem
      :actor="{ name: props.conversation.contact.name, avatar: props.conversation.contact.avatar }"
      :time="fmt.relative(props.message.at)"
      unread
      :unread-label="t.newMessage"
      :aria-label="`${t.newMessage}: ${props.conversation.contact.name}. ${t.openConversation}`"
      class="pe-10"
      @click="props.onOpen()"
    >
      <template #title><span dir="auto">{{ props.conversation.contact.name }}</span></template>
      <template #description><span dir="auto">{{ previewOf(props.message, { voice: t.voiceMessage, location: t.locationMessage, attachment: t.attachmentMessage }) }}</span></template>
    </NqNotificationItem>
    <NqButton type="button" variant="ghost" size="icon-sm" :aria-label="t.dismiss" class="absolute end-1.5 top-1.5" @click="props.onDismiss()"><X aria-hidden="true" /></NqButton>
  </div>
</template>
