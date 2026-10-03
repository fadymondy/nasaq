<script setup lang="ts">
import { MenubarItemIndicator, MenubarRadioItem } from "reka-ui";
import { computed, inject, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { MENU_RADIO_VALUE } from "./context";
import { menuItemClass } from "../dropdown-menu/menu-styles";

// One choice inside NqMenubarRadioGroup.
interface Props {
  value: string;
  disabled?: boolean;
  closeOnClick?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { closeOnClick: false });
const emits = defineEmits<{ select: [event: Event] }>();
const group = inject(MENU_RADIO_VALUE, ref<string | undefined>(undefined));
const checked = computed(() => group.value === props.value);
function onSelect(event: Event) {
  emits("select", event);
  if (!props.closeOnClick) event.preventDefault();
}
</script>

<template>
  <MenubarRadioItem
    data-slot="menubar-radio-item"
    :value="props.value"
    :disabled="props.disabled"
    :data-checked="checked ? '' : undefined"
    :data-unchecked="checked ? undefined : ''"
    :class="cn(menuItemClass, 'ps-8', props.class)"
    @select="onSelect"
  >
    <span aria-hidden="true" class="absolute start-2.5 inline-flex size-4 items-center justify-center">
      <MenubarItemIndicator><span class="block size-1.5 rounded-full bg-current" /></MenubarItemIndicator>
    </span>
    <slot />
  </MenubarRadioItem>
</template>
