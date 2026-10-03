// Shared by popover, hover-card and tooltip: logical sides and Base UI's enter/exit model for floating popups.
import { onBeforeUnmount, ref, watch, type Ref } from "vue";

export type PopupSide = "top" | "bottom" | "left" | "right" | "inline-start" | "inline-end";

/** Reka only knows physical sides; "inline-start" / "inline-end" mirror in RTL, as in React. */
export function physicalSide(side: PopupSide, rtl: boolean): "top" | "bottom" | "left" | "right" {
  if (side === "inline-start") return rtl ? "right" : "left";
  if (side === "inline-end") return rtl ? "left" : "right";
  return side;
}

function durationMs(el: Element | null | undefined): number {
  if (!el) return 0;
  const { transitionDuration, transitionDelay } = getComputedStyle(el);
  const ms = (v: string) => Math.max(0, ...v.split(",").map((s) => parseFloat(s) * (s.trim().endsWith("ms") ? 1 : 1000) || 0));
  return ms(transitionDuration) + ms(transitionDelay);
}

/**
 * Keeps a popup mounted while it animates out. `mounted` drives the v-if (with Reka's force-mount),
 * `starting` and `ending` become data-starting-style / data-ending-style on the popup element, so the React
 * classes (`data-starting-style:opacity-0`) work unchanged. Reka's own Presence only waits for CSS animations.
 */
export function usePopupPresence(open: Ref<boolean>, getEl: () => Element | null | undefined) {
  const mounted = ref(open.value);
  const starting = ref(false);
  const ending = ref(false);
  let frame = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => {
    cancelAnimationFrame(frame);
    clearTimeout(timer);
  };
  watch(open, (isOpen) => {
    cancel();
    if (isOpen) {
      ending.value = false;
      mounted.value = true;
      starting.value = true;
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          starting.value = false;
        });
      });
    } else if (mounted.value) {
      starting.value = false;
      ending.value = true;
      const finish = () => {
        mounted.value = false;
        ending.value = false;
      };
      // Wait one tick so data-ending-style is applied before reading the transition.
      timer = setTimeout(() => {
        const ms = durationMs(getEl());
        if (!ms) finish();
        else timer = setTimeout(finish, ms + 50);
      }, 0);
    }
  });
  onBeforeUnmount(cancel);
  return { mounted, starting, ending };
}

/** The popup element inside Reka's positioner wrapper. */
export function popupEl(host: { $el?: Element } | null | undefined, slot: string): Element | null {
  const root = host?.$el;
  if (!root || !(root as Element).querySelector) return null;
  return (root as Element).matches?.(`[data-slot="${slot}"]`) ? root : (root as Element).querySelector(`[data-slot="${slot}"]`);
}
