<script setup lang="ts">
import { Archive, ArchiveRestore, Bell, BellOff, Check, Clock, Mail, MailOpen, Palette, Pin, PinOff } from "lucide-vue-next";
import { computed } from "vue";
import NqColorDot from "./NqColorDot.vue";
import NqSnoozePresetItems from "./NqSnoozePresetItems.vue";
import { INBOX_COLORS, type ConversationPatch, type DateLike, type InboxConversation } from "./inbox-format";
import { useInboxLabels, type InboxLabels } from "./inbox-strings";
import { MENU_KITS, type MenuKitName } from "./menu-kit";

// The choices of a conversation: pin, read state, mute, colour, snooze, archive. Internal: shared by the more menu and the context menu.
type MenuConversation = Pick<InboxConversation, "id" | "pinned" | "archived" | "muted" | "color" | "unread" | "contact" | "status">;
const props = defineProps<{ kit: MenuKitName; conversation: MenuConversation; onUpdate: (patch: ConversationPatch) => void; now?: DateLike; labels?: Partial<InboxLabels> }>();
const t = useInboxLabels(() => props.labels);
const k = computed(() => MENU_KITS[props.kit]);
const unread = computed(() => (props.conversation.unread ?? 0) > 0);
</script>

<template>
  <component :is="k.Item" @select="props.onUpdate({ pinned: !props.conversation.pinned })">
    <PinOff v-if="props.conversation.pinned" aria-hidden="true" />
    <Pin v-else aria-hidden="true" />
    {{ props.conversation.pinned ? t.unpin : t.pin }}
  </component>
  <component :is="k.Item" @select="props.onUpdate({ unread: !unread })">
    <MailOpen v-if="unread" aria-hidden="true" />
    <Mail v-else aria-hidden="true" />
    {{ unread ? t.markRead : t.markUnread }}
  </component>
  <component :is="k.Item" @select="props.onUpdate({ muted: !props.conversation.muted })">
    <Bell v-if="props.conversation.muted" aria-hidden="true" />
    <BellOff v-else aria-hidden="true" />
    {{ props.conversation.muted ? t.unmute : t.mute }}
  </component>
  <component :is="k.Sub">
    <component :is="k.SubTrigger">
      <Palette aria-hidden="true" />
      {{ t.color }}
    </component>
    <component :is="k.SubContent" class="min-w-40">
      <component :is="k.Item" @select="props.onUpdate({ color: null })">
        <span aria-hidden="true" class="inline-block size-2.5 rounded-full border border-border" />
        <span class="flex-1">{{ t.noColor }}</span>
        <Check v-if="!props.conversation.color" aria-hidden="true" />
      </component>
      <component :is="k.Item" v-for="hue in INBOX_COLORS" :key="hue" @select="props.onUpdate({ color: hue })">
        <NqColorDot :color="hue" />
        <span class="flex-1">{{ t.colors[hue] }}</span>
        <Check v-if="props.conversation.color === hue" aria-hidden="true" />
      </component>
    </component>
  </component>
  <component :is="k.Sub">
    <component :is="k.SubTrigger">
      <Clock aria-hidden="true" />
      {{ t.snooze }}
    </component>
    <component :is="k.SubContent" class="min-w-56">
      <NqSnoozePresetItems :kit="props.kit" :now="props.now" :labels="props.labels" :on-pick="(at: number) => props.onUpdate({ status: 'snoozed', snoozedUntil: at })" />
      <component :is="k.Item" v-if="props.conversation.status === 'snoozed'" @select="props.onUpdate({ status: 'open', snoozedUntil: null })">{{ t.unsnooze }}</component>
    </component>
  </component>
  <component :is="k.Separator" />
  <component :is="k.Item" @select="props.onUpdate({ archived: !props.conversation.archived })">
    <ArchiveRestore v-if="props.conversation.archived" aria-hidden="true" />
    <Archive v-else aria-hidden="true" />
    {{ props.conversation.archived ? t.unarchive : t.archive }}
  </component>
</template>
