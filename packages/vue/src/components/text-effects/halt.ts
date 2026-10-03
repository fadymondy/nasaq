import { computed, ref } from "vue";

/** A hover / focus latch: the effect holds still while a person is pointing at or focused inside it. */
export function useHalt() {
  const hovered = ref(false);
  const focused = ref(false);
  return {
    halted: computed(() => hovered.value || focused.value),
    on: {
      mouseenter: () => (hovered.value = true),
      mouseleave: () => (hovered.value = false),
      focusin: () => (focused.value = true),
      focusout: () => (focused.value = false),
    },
  };
}
