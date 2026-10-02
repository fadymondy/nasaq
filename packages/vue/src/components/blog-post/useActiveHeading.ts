import { onBeforeUnmount, onMounted, ref, toValue, watch, type MaybeRefOrGetter, type Ref } from "vue";
import { activeHeadingId } from "../blog-index/blog-model";

/**
 * The id of the heading the reader is in. Listens to scroll (of the page or any scroll container) and measures the
 * headings inside `root`. At the very bottom of the page the last heading wins, so short final sections can still be reached.
 */
export function useActiveHeading(ids: MaybeRefOrGetter<string[]>, root: Ref<HTMLElement | null | undefined>, offset: MaybeRefOrGetter<number> = 96): Ref<string | null> {
  const active = ref<string | null>(null);
  let raf = 0;
  const update = () => {
    raf = 0;
    const list = toValue(ids);
    if (!list.length) {
      active.value = null;
      return;
    }
    const scope: ParentNode = root.value ?? document;
    const tops = list.flatMap((id) => {
      const el = scope.querySelector(`[id="${id.replace(/"/g, '\\"')}"]`);
      return el ? [{ id, top: el.getBoundingClientRect().top }] : [];
    });
    const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2 && window.scrollY > 0;
    active.value = atBottom && tops.length ? (tops[tops.length - 1] as { id: string }).id : activeHeadingId(tops, toValue(offset));
  };
  const onScroll = () => {
    if (!raf) raf = requestAnimationFrame(update);
  };
  onMounted(() => {
    update();
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", onScroll);
  });
  watch(() => [toValue(ids).join("\u0000"), toValue(offset)], () => update(), { flush: "post" });
  onBeforeUnmount(() => {
    if (raf) cancelAnimationFrame(raf);
    document.removeEventListener("scroll", onScroll, { capture: true });
    window.removeEventListener("resize", onScroll);
  });
  return active;
}
