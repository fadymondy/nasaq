// The Alpine parts of the text effects (the markup is in the Blade components text-effects.*; the motion lives here).
//
//   nqTextFlip         rotates the phrases (interval, loop, paused; paused is x-modelable); stops on hover or focus and under reduced motion; nq-flip-change { index }
//   nqTextShimmer      the light sweep across the text (duration, paused; paused is x-modelable); a still, plain-ink text under reduced motion
//   nqMarquee          the endless row: measures, keeps enough copies, slides them with the reading direction; pauses on hover or focus; static and wrapped under reduced motion
//   nqTextReveal       reveals the pieces when the text scrolls into view (immediate: already shown); plain text under reduced motion
//   nqHandwrittenMark  draws the stroke when it scrolls into view (animate, delay); drawn at once under reduced motion

import { marqueeCopies, marqueeDuration, nextFlipIndex } from "./text-effects-logic";
import { flipTokenStyle, revealTokenStyle } from "./text-effects-style";
import type { Magics, Register } from "./types";

const reducedMotion = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const quiet = (anim: Animation | null | undefined) => {
  anim?.finished?.catch?.(() => {});
  anim?.cancel();
};
const words = (classes: string) => classes.split(" ").filter(Boolean);

export const textEffects: Register = (Alpine) => {
  Alpine.data("nqTextFlip", (config: { interval?: number; loop?: boolean; paused?: boolean } = {}) => {
    let timer: number | undefined;
    let root: HTMLElement;
    let phrases: HTMLElement[] = [];
    let reduced = false;
    return {
      index: 0,
      paused: !!config.paused,
      halted: false,
      init(this: Magics & { tick(): void; paint(): void }) {
        root = this.$el;
        phrases = [...root.querySelectorAll<HTMLElement>("[data-phrase]")];
        reduced = reducedMotion();
        if (reduced) {
          root.setAttribute("data-reduced", "");
          this.paint();
        }
        if (phrases.length > 1 && !reduced) timer = window.setInterval(() => this.tick(), Math.max(800, config.interval ?? 2600));
      },
      tick(this: { index: number; paused: boolean; halted: boolean; paint(): void }) {
        if (this.paused || this.halted) return;
        const next = nextFlipIndex(this.index, phrases.length, config.loop !== false);
        if (next === this.index) return;
        this.index = next;
        this.paint();
        root.dispatchEvent(new CustomEvent("nq-flip-change", { detail: { index: next }, bubbles: true }));
      },
      paint(this: { index: number }) {
        phrases.forEach((phrase, i) => {
          const active = i === this.index;
          phrase.toggleAttribute("data-active", active);
          phrase.querySelectorAll<HTMLElement>("[data-token]").forEach((token) => {
            token.style.cssText = flipTokenStyle(active, Number(token.dataset.delay ?? 0), reduced);
          });
        });
      },
      destroy() {
        window.clearInterval(timer);
      },
    };
  });

  Alpine.data("nqTextShimmer", (config: { duration?: number; paused?: boolean } = {}) => {
    let anim: Animation | undefined;
    let el: HTMLElement;
    return {
      paused: !!config.paused,
      init(this: Magics & { run(): void }) {
        el = this.$el;
        if (reducedMotion()) {
          el.className = el.dataset.reducedClass ?? el.className;
          el.setAttribute("data-still", "");
          return;
        }
        this.run();
        this.$watch("paused", () => this.run());
      },
      run(this: { paused: boolean }) {
        quiet(anim);
        anim = undefined;
        el.toggleAttribute("data-still", this.paused);
        if (this.paused || typeof el.animate !== "function") return;
        const rtl = getComputedStyle(el).direction === "rtl";
        anim = el.animate({ backgroundPosition: rtl ? ["0% 0", "100% 0"] : ["100% 0", "0% 0"] }, { duration: Math.max(0.4, config.duration ?? 2.4) * 1000, iterations: Number.POSITIVE_INFINITY, easing: "linear" });
      },
      destroy() {
        quiet(anim);
      },
    };
  });

  Alpine.data("nqMarquee", (config: { speed?: number; direction?: "start" | "end"; pauseOnHover?: boolean; paused?: boolean } = {}) => {
    let anim: Animation | null = null;
    let observer: ResizeObserver | undefined;
    let root: HTMLElement;
    let track: HTMLElement;
    let width = { container: 0, copy: 0 };
    const copiesOf = () => [...track.querySelectorAll<HTMLElement>(":scope > [data-slot='marquee-copy']")];
    return {
      paused: !!config.paused,
      halted: false,
      init(this: Magics & { measure(): void; sync(): void }) {
        root = this.$el;
        track = root.querySelector<HTMLElement>("[data-track]")!;
        if (reducedMotion()) {
          root.setAttribute("data-static", "");
          words("[mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]").forEach((c) => root.classList.remove(c));
          track.classList.remove("w-max");
          track.classList.add("flex-wrap");
          copiesOf().forEach((copy, i) => {
            if (i > 0) {
              copy.remove();
              return;
            }
            words("shrink-0 pe-(--marquee-gap)").forEach((c) => copy.classList.remove(c));
            words("flex-wrap justify-center").forEach((c) => copy.classList.add(c));
          });
          return;
        }
        this.measure();
        if (typeof ResizeObserver !== "undefined") {
          observer = new ResizeObserver(() => this.measure());
          observer.observe(root);
          const first = copiesOf()[0];
          if (first) observer.observe(first);
        }
        this.$watch("paused", () => this.sync());
        this.$watch("halted", () => this.sync());
      },
      stopped(this: { paused: boolean; halted: boolean }) {
        return this.paused || (config.pauseOnHover !== false && this.halted);
      },
      measure(this: { apply(): void }) {
        const first = copiesOf()[0];
        if (!first) return;
        width = { container: root.clientWidth, copy: first.getBoundingClientRect().width };
        const want = marqueeCopies(width.container, width.copy);
        let copies = copiesOf();
        while (copies.length < want) {
          const clone = first.cloneNode(true) as HTMLElement;
          clone.setAttribute("aria-hidden", "true");
          clone.setAttribute("inert", "");
          clone.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
          track.append(clone);
          copies = copiesOf();
        }
        while (copies.length > want) copies.pop()?.remove();
        this.apply();
      },
      apply(this: { stopped(): boolean }) {
        quiet(anim);
        anim = null;
        if (typeof track.animate !== "function" || !(width.copy > 0)) return;
        const rtl = getComputedStyle(track).direction === "rtl";
        const leftward = (config.direction !== "end") === !rtl;
        const w = width.copy;
        const from = leftward ? (rtl ? w : 0) : rtl ? 0 : -w;
        const to = leftward ? (rtl ? 0 : -w) : rtl ? w : 0;
        anim = track.animate([{ transform: `translateX(${from}px)` }, { transform: `translateX(${to}px)` }], {
          duration: marqueeDuration(w, config.speed ?? 48) * 1000,
          iterations: Number.POSITIVE_INFINITY,
          easing: "linear",
        });
        if (this.stopped()) anim.pause();
      },
      sync(this: { stopped(): boolean }) {
        root.toggleAttribute("data-paused", this.stopped());
        if (!anim) return;
        if (this.stopped()) anim.pause();
        else anim.play();
      },
      destroy() {
        observer?.disconnect();
        quiet(anim);
      },
    };
  });

  Alpine.data("nqTextReveal", (config: { immediate?: boolean } = {}) => {
    let observer: IntersectionObserver | undefined;
    return {
      init(this: Magics & { reveal(): void }) {
        const root = this.$el;
        if (root.hasAttribute("data-shown")) return;
        if (reducedMotion()) {
          const visual = root.querySelector<HTMLElement>("[data-visual]");
          if (visual) visual.textContent = visual.textContent ?? "";
          root.setAttribute("data-shown", "");
          return;
        }
        if (config.immediate || typeof IntersectionObserver === "undefined") {
          this.reveal();
          return;
        }
        observer = new IntersectionObserver(
          (entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
              this.reveal();
              observer?.disconnect();
            }
          },
          { threshold: 0.2 },
        );
        observer.observe(root);
      },
      reveal(this: Magics) {
        this.$el.setAttribute("data-shown", "");
        this.$el.querySelectorAll<HTMLElement>("[data-token]").forEach((token) => {
          token.style.cssText = revealTokenStyle(true, Number(token.dataset.delay ?? 0));
        });
      },
      destroy() {
        observer?.disconnect();
      },
    };
  });

  Alpine.data("nqHandwrittenMark", (config: { animate?: boolean; delay?: number } = {}) => {
    let observer: IntersectionObserver | undefined;
    return {
      init(this: Magics & { draw(instant: boolean): void }) {
        const root = this.$el;
        if (root.hasAttribute("data-drawn")) return;
        if (reducedMotion() || config.animate === false || typeof IntersectionObserver === "undefined") {
          this.draw(true);
          return;
        }
        observer = new IntersectionObserver(
          (entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
              this.draw(false);
              observer?.disconnect();
            }
          },
          { threshold: 0.6 },
        );
        observer.observe(root);
      },
      draw(this: Magics, instant: boolean) {
        const path = this.$el.querySelector<SVGPathElement>("path");
        if (path) {
          path.style.transition = instant ? "none" : `stroke-dashoffset 650ms cubic-bezier(0.4, 0, 0.2, 1) ${config.delay ?? 0}ms`;
          path.style.strokeDashoffset = "0";
        }
        this.$el.setAttribute("data-drawn", "");
      },
      destroy() {
        observer?.disconnect();
      },
    };
  });
};
