// nqCarousel: a slide carousel on native CSS scroll-snap (the React one runs on Embla). Same markup, classes and ARIA as the
// React Carousel; the scroll-snap maths below is carousel-logic.ts of packages/vue, copied.
//
//   <div data-slot="carousel" role="region" aria-roledescription="carousel" tabindex="0" dir="ltr"
//        x-data="nqCarousel({ loop: false, align: 'start', autoplay: 0, rtl: false, labels: {...} })" x-bind="root">
//     <div data-slot="carousel-viewport" class="overflow-x-auto snap-x snap-mandatory …">
//       <div data-slot="carousel-content" class="-ms-4 flex"> <div data-slot="carousel-item" class="… snap-start">…</div> </div>
//     </div>
//     <button data-slot="carousel-previous" x-bind="previous">  <button data-slot="carousel-next" x-bind="next">
//     <div data-slot="carousel-dots" x-bind="dots"> <template x-for="i in count"> <button x-bind="dot(i - 1)"> </template> </div>
//     <button data-slot="carousel-play-pause" x-bind="playPause">
//   </div>
//
// Slides get "Slide n of total" labels when Alpine starts. The arrows follow the reading direction; autoplay is off under
// prefers-reduced-motion, pauses on hover, focus and hidden tabs, and stops for good after a touch.

import type { Magics, Register } from "./types";

type Align = "start" | "center" | "end";

interface Labels {
  previous: string;
  next: string;
  slides: string;
  /** "Go to slide {n}" */
  goTo: string;
  /** "Slide {n} of {total}" */
  slide: string;
  pause: string;
  play: string;
}

interface Options {
  loop?: boolean;
  align?: Align;
  /** Interval in ms; 0 (default) is off. */
  autoplay?: number;
  rtl?: boolean;
  labels?: Partial<Labels>;
}

interface CarouselState extends Magics {
  loop: boolean;
  align: Align;
  interval: number;
  rtl: boolean;
  labels: Labels;
  host: HTMLElement;
  viewport: HTMLElement | null;
  snaps: number[];
  selected: number;
  count: number;
  canPrev: boolean;
  canNext: boolean;
  playing: boolean;
  paused: boolean;
  reduced: boolean;
  timer: ReturnType<typeof setInterval> | undefined;
  cleanups: (() => void)[];
  readonly autoplayEnabled: boolean;
  sync(): void;
  scrollTo(index: number): void;
  scrollPrev(): void;
  scrollNext(): void;
  restartTimer(): void;
  label(): string;
}

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));

export const carousel: Register = (Alpine) => {
  Alpine.data("nqCarousel", (options: Options = {}) => ({
    loop: options.loop ?? false,
    align: options.align ?? "start",
    interval: options.autoplay ?? 0,
    rtl: options.rtl ?? false,
    labels: {
      previous: "Previous slide",
      next: "Next slide",
      slides: "Choose slide",
      goTo: "Go to slide {n}",
      slide: "Slide {n} of {total}",
      pause: "Pause autoplay",
      play: "Start autoplay",
      ...options.labels,
    } as Labels,
    host: null as unknown as HTMLElement,
    viewport: null as HTMLElement | null,
    snaps: [] as number[],
    selected: 0,
    count: 0,
    canPrev: false,
    canNext: false,
    playing: true,
    paused: false,
    reduced: false,
    timer: undefined as ReturnType<typeof setInterval> | undefined,
    cleanups: [] as (() => void)[],

    get autoplayEnabled() {
      return this.interval > 0 && !this.reduced;
    },

    init(this: CarouselState) {
      // $el inside a handler is the element that fired the event, so keep the root.
      this.host = this.$el;
      this.viewport = this.host.querySelector<HTMLElement>('[data-slot="carousel-viewport"]');
      const track = this.host.querySelector<HTMLElement>('[data-slot="carousel-content"]');
      if (typeof window.matchMedia === "function") {
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        const onMq = () => {
          this.reduced = mq.matches;
        };
        onMq();
        mq.addEventListener?.("change", onMq);
        this.cleanups.push(() => mq.removeEventListener?.("change", onMq));
      }
      if (this.viewport) {
        let frame = 0;
        const onScroll = () => {
          cancelAnimationFrame(frame);
          frame = requestAnimationFrame(() => this.sync());
        };
        this.viewport.addEventListener("scroll", onScroll, { passive: true });
        this.cleanups.push(() => this.viewport?.removeEventListener("scroll", onScroll), () => cancelAnimationFrame(frame));
        if (typeof ResizeObserver !== "undefined") {
          const resize = new ResizeObserver(() => this.sync());
          resize.observe(this.viewport);
          if (track) resize.observe(track);
          this.cleanups.push(() => resize.disconnect());
        }
        if (typeof MutationObserver !== "undefined" && track) {
          const mutate = new MutationObserver(() => this.sync());
          mutate.observe(track, { childList: true });
          this.cleanups.push(() => mutate.disconnect());
        }
      }
      this.$watch("playing", () => this.restartTimer());
      this.$watch("paused", () => this.restartTimer());
      this.$watch("reduced", () => this.restartTimer());
      this.sync();
      this.restartTimer();
    },

    destroy(this: CarouselState) {
      clearInterval(this.timer);
      for (const fn of this.cleanups) fn();
      this.cleanups = [];
    },

    /** Re-measures the snaps and the selected slide, and labels the slides "Slide n of total". */
    sync(this: CarouselState) {
      const el = this.viewport;
      if (!el) return;
      const slides = [...(el.querySelector('[data-slot="carousel-content"]')?.children ?? [])] as HTMLElement[];
      slides.forEach((slide, i) => slide.setAttribute("aria-label", fill(this.labels.slide, { n: i + 1, total: slides.length })));
      const vr = el.getBoundingClientRect();
      const vw = el.clientWidth || vr.width;
      const max = Math.max(0, el.scrollWidth - vw);
      const progress = Math.min(max, Math.abs(el.scrollLeft));
      const snaps: number[] = [];
      for (const slide of slides) {
        const r = slide.getBoundingClientRect();
        // A slide's inline-start padding is the gutter (ps-4): the snap area is the slide without it.
        const pad = Number.parseFloat(getComputedStyle(slide).paddingInlineStart) || 0;
        const width = r.width - pad;
        const distance = this.rtl ? vr.right - (r.right - pad) : r.left + pad - vr.left;
        const offset = this.align === "start" ? 0 : this.align === "center" ? (width - vw) / 2 : width - vw;
        const target = Math.min(max, Math.max(0, progress + distance + offset));
        if (!snaps.some((s) => Math.abs(s - target) < 2)) snaps.push(target);
      }
      let best = 0;
      let bestDistance = Infinity;
      snaps.forEach((s, i) => {
        const d = Math.abs(s - progress);
        if (d < bestDistance - 0.5) {
          best = i;
          bestDistance = d;
        }
      });
      this.snaps = snaps;
      this.selected = best;
      this.count = snaps.length;
      this.canPrev = this.loop ? snaps.length > 1 : progress > 1;
      this.canNext = this.loop ? snaps.length > 1 : progress < max - 1;
    },

    scrollTo(this: CarouselState, index: number) {
      if (!this.viewport || !this.snaps.length) return;
      const to = Math.min(this.snaps.length - 1, Math.max(0, index));
      const progress = this.snaps[to] ?? 0;
      this.viewport.scrollTo({ left: this.rtl ? -progress : progress, behavior: this.reduced ? "auto" : "smooth" });
    },
    scrollPrev(this: CarouselState) {
      const next = this.selected - 1;
      this.scrollTo(next < 0 ? (this.loop ? this.count - 1 : 0) : next);
    },
    scrollNext(this: CarouselState) {
      const next = this.selected + 1;
      this.scrollTo(next >= this.count ? (this.loop ? 0 : this.count - 1) : next);
    },

    restartTimer(this: CarouselState) {
      clearInterval(this.timer);
      this.timer = undefined;
      if (!this.autoplayEnabled || !this.playing || this.paused) return;
      this.timer = setInterval(() => {
        if (document.hidden) return;
        this.scrollTo(this.selected < this.count - 1 ? this.selected + 1 : 0);
      }, this.interval);
    },

    /** "Slide 2 of 5", for the live region. */
    label(this: CarouselState) {
      return this.count ? fill(this.labels.slide, { n: this.selected + 1, total: this.count }) : "";
    },

    /** Bind on the carousel root. */
    root: {
      "x-on:keydown"(this: CarouselState, event: KeyboardEvent) {
        if (event.defaultPrevented) return;
        if ((event.target as HTMLElement).closest("input, textarea, select, [contenteditable=true]")) return;
        // Right means "toward the end of the list" in LTR and toward the start in RTL.
        const toEnd = this.rtl ? "ArrowLeft" : "ArrowRight";
        const toStart = this.rtl ? "ArrowRight" : "ArrowLeft";
        if (event.key === toStart) {
          event.preventDefault();
          this.scrollPrev();
        } else if (event.key === toEnd) {
          event.preventDefault();
          this.scrollNext();
        }
      },
      "x-on:mouseenter"(this: CarouselState) {
        this.paused = true;
      },
      "x-on:mouseleave"(this: CarouselState) {
        this.paused = false;
      },
      "x-on:focusin"(this: CarouselState) {
        this.paused = true;
      },
      "x-on:focusout"(this: CarouselState, event: FocusEvent) {
        if (!this.host.contains(event.relatedTarget as Node | null)) this.paused = false;
      },
      // Touching the carousel ends autoplay for good: the user has taken over.
      "x-on:pointerdown.capture"(this: CarouselState) {
        this.playing = false;
      },
    },
    /** Bind on the sr-only live region: polite, unless autoplay is rotating the slides. */
    live: {
      ":aria-live"(this: CarouselState) {
        return this.autoplayEnabled && this.playing ? "off" : "polite";
      },
      "x-text"(this: CarouselState) {
        return this.label();
      },
    },
    /** Bind on the previous button. */
    previous: {
      "x-on:click"(this: CarouselState) {
        this.scrollPrev();
      },
      ":disabled"(this: CarouselState) {
        return !this.canPrev;
      },
      ":data-disabled"(this: CarouselState) {
        return this.canPrev ? null : "";
      },
    },
    /** Bind on the next button. */
    next: {
      "x-on:click"(this: CarouselState) {
        this.scrollNext();
      },
      ":disabled"(this: CarouselState) {
        return !this.canNext;
      },
      ":data-disabled"(this: CarouselState) {
        return this.canNext ? null : "";
      },
    },
    /** Bind on the dots group: hidden below two snaps. */
    dots: {
      "x-show"(this: CarouselState) {
        return this.count >= 2;
      },
    },
    /** Bind on one dot (inside `<template x-for="i in count">`, pass `i - 1`). */
    dot(this: CarouselState, index: number) {
      return {
        "x-on:click"(this: CarouselState) {
          this.scrollTo(index);
        },
        ":aria-label"(this: CarouselState) {
          return fill(this.labels.goTo, { n: index + 1 });
        },
        ":aria-current"(this: CarouselState) {
          return index === this.selected ? "true" : null;
        },
        ":class"(this: CarouselState) {
          // Exclusive sets (twMerge does this in React): both bg classes in the sheet would fight on specificity-equal order.
          return index === this.selected ? "w-5 bg-primary hover:bg-primary" : "w-2 bg-nq-line-strong hover:bg-muted-foreground";
        },
      };
    },
    /** Bind on the play/pause button: hidden unless autoplay is on and allowed. */
    playPause: {
      "x-on:click"(this: CarouselState) {
        this.playing = !this.playing;
      },
      "x-show"(this: CarouselState) {
        return this.autoplayEnabled;
      },
      ":aria-label"(this: CarouselState) {
        return this.playing ? this.labels.pause : this.labels.play;
      },
      ":aria-pressed"(this: CarouselState) {
        return String(!this.playing);
      },
    },
  }));
};
