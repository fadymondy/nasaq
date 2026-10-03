<script setup lang="ts">
import { ref, useAttrs } from "vue";
import { cn } from "../../lib/cn";
import { NqContextMenu, NqContextMenuContent, NqContextMenuTrigger, NATIVE_CONTEXT_SELECTOR, openContextMenuAt } from "../context-menu";
import NqConversationMenuItems from "./NqConversationMenuItems.vue";
import type { ConversationPatch, DateLike, InboxConversation } from "./inbox-format";
import type { InboxLabels } from "./inbox-strings";

// The same choices as the row menu, opened by context-click, long-press, Shift+F10 or the Menu key on the row (an `li` by default).
// Right-clicks on links and inputs inside the row keep the browser's menu. When the menu closes, focus returns to the `focusSelector`
// element inside the row. `disabled` renders the row untouched.
defineOptions({ inheritAttrs: false });
const props = withDefaults(
  defineProps<{
    conversation: Pick<InboxConversation, "id" | "pinned" | "archived" | "muted" | "color" | "unread" | "contact" | "status">;
    onUpdate: (patch: ConversationPatch) => void;
    as?: string;
    focusSelector?: string;
    now?: DateLike;
    disabled?: boolean;
    labels?: Partial<InboxLabels>;
  }>(),
  { as: "li", focusSelector: "button" },
);
const attrs = useAttrs();
const row = ref<{ $el: HTMLElement } | null>(null);

function onContextMenu(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (event.shiftKey || target.closest(NATIVE_CONTEXT_SELECTOR)) event.stopImmediatePropagation();
}
function onKeydown(event: KeyboardEvent) {
  if (!((event.key === "F10" && event.shiftKey) || event.key === "ContextMenu")) return;
  if (openContextMenuAt(event.target as HTMLElement)) event.preventDefault();
}
function returnFocus(event: Event) {
  const target = row.value?.$el?.querySelector<HTMLElement>(props.focusSelector);
  if (target) {
    event.preventDefault();
    target.focus();
  }
}
</script>

<template>
  <component :is="props.as" v-if="props.disabled" v-bind="attrs"><slot /></component>
  <NqContextMenu v-else>
    <NqContextMenuTrigger ref="row" v-bind="{ ...attrs, class: undefined }" :as="props.as" :class="cn('data-popup-open:bg-nq-hover', attrs.class as string)" @contextmenu.capture="onContextMenu" @keydown="onKeydown">
      <slot />
    </NqContextMenuTrigger>
    <NqContextMenuContent class="min-w-52" @close-auto-focus="returnFocus">
      <NqConversationMenuItems kit="context" :conversation="props.conversation" :on-update="props.onUpdate" :now="props.now" :labels="props.labels" />
    </NqContextMenuContent>
  </NqContextMenu>
</template>
