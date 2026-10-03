import { nextTick, onMounted, ref, watch, type Ref } from "vue";

/**
 * "Tail" behaviour for a scrolling log: stays pinned to the bottom while new rows arrive, lets go when the
 * user scrolls up, and `setFollowing(true)` pins it again. `count` is the number of rows; a change re-pins when following.
 * (Port of the React useFollowScroll hook.)
 */
export function useFollowScroll<T extends HTMLElement>(count: () => number, initial = true) {
  const el: Ref<T | null> = ref(null);
  const following = ref(initial);
  let stick = initial;

  function pin() {
    if (el.value && stick) el.value.scrollTop = el.value.scrollHeight;
  }
  function onScroll() {
    const e = el.value;
    if (!e) return;
    const atBottom = e.scrollHeight - e.scrollTop - e.clientHeight <= 24;
    stick = atBottom;
    following.value = atBottom;
  }
  function setFollowing(on: boolean) {
    stick = on;
    following.value = on;
    if (on && el.value) el.value.scrollTop = el.value.scrollHeight;
  }
  onMounted(pin);
  watch(count, () => nextTick(pin));
  return { el, following, setFollowing, onScroll };
}
