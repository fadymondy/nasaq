<script setup lang="ts">
import { CollapsibleRoot } from "reka-ui";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

interface Props {
  /** Controlled open state (v-model:open). */
  open?: boolean;
  defaultOpen?: boolean;
  disabled?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { open: undefined, defaultOpen: false, disabled: false });
const emits = defineEmits<{ "update:open": [value: boolean] }>();
// Tracked here so the root can carry data-open / data-closed (Base UI attributes) next to Reka's data-state.
const inner = ref(props.defaultOpen);
const isOpen = computed(() => props.open ?? inner.value);
function onOpen(value: boolean) {
  inner.value = value;
  emits("update:open", value);
}
</script>

<template>
  <CollapsibleRoot
    v-slot="{ open }"
    :open="isOpen"
    :disabled="props.disabled"
    @update:open="onOpen"
    data-slot="collapsible"
    :class="cn(props.class)"
    :data-open="isOpen ? '' : undefined"
    :data-closed="isOpen ? undefined : ''"
  >
    <slot :open="open" />
  </CollapsibleRoot>
</template>
