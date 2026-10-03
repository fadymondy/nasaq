// Base UI's enter/exit model in Vue: an element mounts with data-starting-style, which is removed on the
// next frame (so `data-starting-style:opacity-0` transitions to the resting style), and gets
// data-ending-style before it leaves, staying mounted until its transition ends. The Tailwind classes are
// the React ones, unchanged.
//
//   <Transition v-bind="presence"><div v-if="open" class="transition-opacity data-starting-style:opacity-0 data-ending-style:opacity-0" /></Transition>

function afterTransition(el: Element, done: () => void) {
  const { transitionDuration, transitionDelay } = getComputedStyle(el);
  const ms = (v: string) => Math.max(0, ...v.split(",").map((s) => parseFloat(s) * (s.trim().endsWith("ms") ? 1 : 1000) || 0));
  const total = ms(transitionDuration) + ms(transitionDelay);
  if (!total) return done();
  let finished = false;
  const end = () => {
    if (finished) return;
    finished = true;
    el.removeEventListener("transitionend", onEnd);
    done();
  };
  const onEnd = (e: Event) => e.target === el && end();
  el.addEventListener("transitionend", onEnd);
  setTimeout(end, total + 50);
}

export const presence = {
  css: false,
  onBeforeEnter(el: Element) {
    el.setAttribute("data-starting-style", "");
  },
  onEnter(el: Element, done: () => void) {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        el.removeAttribute("data-starting-style");
        afterTransition(el, done);
      }),
    );
  },
  onLeave(el: Element, done: () => void) {
    el.setAttribute("data-ending-style", "");
    afterTransition(el, done);
  },
};
