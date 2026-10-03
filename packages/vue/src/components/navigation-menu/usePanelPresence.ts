// Base UI's enter/exit model for the panel parts (lib/presence), driven by an open flag instead of v-if, because
// Reka's own Presence only waits for CSS animations, not transitions. The element stays rendered while it leaves.
import { nextTick, onBeforeUnmount, ref, watch, type Ref } from "vue";
import { presence } from "../../lib/presence";

export function usePanelPresence(open: Ref<boolean>, getEl: () => HTMLElement | undefined) {
  const shown = ref(open.value);
  watch(open, async (value) => {
    if (value) {
      shown.value = true;
      await nextTick();
      const el = getEl();
      if (!el) return;
      el.removeAttribute("data-ending-style");
      presence.onBeforeEnter(el);
      presence.onEnter(el, () => {});
      return;
    }
    const el = getEl();
    if (!el || !shown.value) {
      shown.value = false;
      return;
    }
    presence.onLeave(el, () => {
      if (open.value) return;
      shown.value = false;
      el.removeAttribute("data-ending-style");
    });
  });
  return { shown };
}

// Reka's data-motion is physical (it already flips the order in RTL); Base UI's data-activation-direction is
// the side the incoming panel comes from, which the React classes translate from and to.
const DIRECTION: Record<string, string> = { "from-start": "left", "from-end": "right", "to-start": "right", "to-end": "left" };

export function useActivationDirection(getEl: () => HTMLElement | undefined) {
  const direction = ref<string | undefined>();
  let observer: MutationObserver | undefined;
  const read = (el: HTMLElement) => {
    const motion = el.getAttribute("data-motion");
    direction.value = motion ? DIRECTION[motion] : direction.value;
  };
  const watchEl = () => {
    const el = getEl();
    if (!el || observer) return;
    read(el);
    observer = new MutationObserver(() => read(el));
    observer.observe(el, { attributes: true, attributeFilter: ["data-motion"] });
  };
  onBeforeUnmount(() => observer?.disconnect());
  return { direction, watchEl };
}
