import { onBeforeUnmount, onMounted, ref, watch, type Ref } from "vue";
import { zoomAbout, type Transform } from "./graph-layout";

/** The client size of an element, kept up to date with a ResizeObserver. */
export function useSize(el: Ref<HTMLElement | null>) {
  const size = ref({ w: 0, h: 0 });
  let ro: ResizeObserver | undefined;
  const measure = () => {
    if (el.value) size.value = { w: el.value.clientWidth, h: el.value.clientHeight };
  };
  onMounted(() => {
    measure();
    if (typeof ResizeObserver !== "undefined" && el.value) {
      ro = new ResizeObserver(measure);
      ro.observe(el.value);
    }
  });
  onBeforeUnmount(() => ro?.disconnect());
  return size;
}

/** Wheel zoom (and trackpad pinch) about the pointer. `pan` makes a plain wheel scroll the surface instead of zooming. */
export function useWheel(el: Ref<HTMLElement | null>, apply: (fn: (tf: Transform) => Transform) => void, pan: boolean) {
  const onWheel = (e: WheelEvent) => {
    const target = el.value;
    if (!target) return;
    e.preventDefault();
    const r = target.getBoundingClientRect();
    if (pan && !e.ctrlKey && !e.metaKey) {
      apply((p) => ({ ...p, x: p.x - e.deltaX, y: p.y - e.deltaY }));
      return;
    }
    const c = { x: e.clientX - r.left, y: e.clientY - r.top };
    const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
    apply((p) => zoomAbout(p, factor, c));
  };
  let bound: HTMLElement | null = null;
  const unbind = () => {
    bound?.removeEventListener("wheel", onWheel);
    bound = null;
  };
  onMounted(() => {
    bound = el.value;
    bound?.addEventListener("wheel", onWheel, { passive: false });
  });
  watch(el, (next) => {
    if (next === bound) return;
    unbind();
    bound = next;
    bound?.addEventListener("wheel", onWheel, { passive: false });
  });
  onBeforeUnmount(unbind);
}
