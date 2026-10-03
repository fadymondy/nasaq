<script setup lang="ts">
import { MoreHorizontal } from "lucide-vue-next";
import type { HTMLAttributes } from "vue";
import { NqButton } from "../button";
import { NqDropdownMenu, NqDropdownMenuContent, NqDropdownMenuTrigger } from "../dropdown-menu";
import NqConversationMenuItems from "./NqConversationMenuItems.vue";
import type { ConversationPatch, DateLike, InboxConversation } from "./inbox-format";
import { useInboxLabels, type InboxLabels } from "./inbox-strings";

// The menu of a conversation row: pin, mark unread, mute, colour, snooze and archive. Every choice calls `onUpdate` with a patch.
// The `trigger` slot replaces the default more button (give its element an accessible name).
const props = defineProps<{
  conversation: Pick<InboxConversation, "id" | "pinned" | "archived" | "muted" | "color" | "unread" | "contact" | "status">;
  onUpdate: (patch: ConversationPatch) => void;
  now?: DateLike;
  labels?: Partial<InboxLabels>;
  /** Classes of the default more button (the row uses it to show the button on hover). */
  triggerClass?: HTMLAttributes["class"];
}>();
const t = useInboxLabels(() => props.labels);
</script>

<template>
  <NqDropdownMenu>
    <NqDropdownMenuTrigger as-child>
      <slot name="trigger">
        <NqButton type="button" variant="ghost" size="icon-sm" :class="props.triggerClass" :aria-label="t.rowActions(props.conversation.contact.name)">
          <MoreHorizontal aria-hidden="true" />
        </NqButton>
      </slot>
    </NqDropdownMenuTrigger>
    <NqDropdownMenuContent align="end" class="min-w-52">
      <NqConversationMenuItems kit="dropdown" :conversation="props.conversation" :on-update="props.onUpdate" :now="props.now" :labels="props.labels" />
    </NqDropdownMenuContent>
  </NqDropdownMenu>
</template>
