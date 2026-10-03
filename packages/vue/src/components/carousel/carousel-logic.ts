// Scroll-snap maths for the carousel. The React Carousel runs on Embla; the ports use native CSS scroll-snap, and this
// finds the same things Embla reports: the snap positions, the selected snap, and whether there is a previous/next one.
// Positions are "progress" values: pixels scrolled along the reading direction, so they are the same in LTR and RTL.

export type CarouselAlign = "start" | "center" | "end";

export interface CarouselMetrics {
  /** Progress (px along the reading direction) of every reachable snap, deduplicated. */
  snaps: number[];
  /** The furthest progress the viewport can reach. */
  max: number;
  /** Where the viewport is now. */
  progress: number;
}

/** Reads the viewport and slides and returns the snap list. */
export function measureCarousel(viewport: HTMLElement, slides: HTMLElement[], align: CarouselAlign, rtl: boolean): CarouselMetrics {
  const vr = viewport.getBoundingClientRect();
  const vw = viewport.clientWidth || vr.width;
  const max = Math.max(0, viewport.scrollWidth - vw);
  const progress = Math.min(max, Math.abs(viewport.scrollLeft));
  const snaps: number[] = [];
  for (const slide of slides) {
    const r = slide.getBoundingClientRect();
    // A slide's inline-start padding is the gutter (ps-4): the snap area is the slide without it.
    const pad = Number.parseFloat(getComputedStyle(slide).paddingInlineStart) || 0;
    const width = r.width - pad;
    const distance = rtl ? vr.right - (r.right - pad) : r.left + pad - vr.left;
    const offset = align === "start" ? 0 : align === "center" ? (width - vw) / 2 : width - vw;
    const target = Math.min(max, Math.max(0, progress + distance + offset));
    if (!snaps.some((s) => Math.abs(s - target) < 2)) snaps.push(target);
  }
  return { snaps, max, progress };
}

/** Index of the snap closest to the current progress. */
export function selectedSnap(metrics: CarouselMetrics): number {
  let best = 0;
  let bestDistance = Infinity;
  metrics.snaps.forEach((s, i) => {
    const d = Math.abs(s - metrics.progress);
    if (d < bestDistance - 0.5) {
      best = i;
      bestDistance = d;
    }
  });
  return best;
}

/** The scrollLeft that puts the viewport at `progress`. */
export const scrollLeftFor = (progress: number, rtl: boolean) => (rtl ? -progress : progress);

/** Which snap a step lands on: wraps when `loop`, stays put at the ends otherwise. */
export function stepTarget(selected: number, count: number, step: 1 | -1, loop: boolean): number {
  const next = selected + step;
  if (next < 0) return loop ? count - 1 : 0;
  if (next >= count) return loop ? 0 : count - 1;
  return next;
}

/** `autoplay` prop to an interval in ms, or 0 when off. */
export const autoplayInterval = (autoplay: boolean | number | undefined) => (typeof autoplay === "number" ? autoplay : autoplay ? 5000 : 0);

export const CAROUSEL_STRINGS = {
  en: {
    carousel: "Carousel",
    previous: "Previous slide",
    next: "Next slide",
    slides: "Choose slide",
    goTo: (n: number) => `Go to slide ${n}`,
    slide: (n: number, total: number) => `Slide ${n} of ${total}`,
    pause: "Pause autoplay",
    play: "Start autoplay",
  },
  ar: {
    carousel: "شريط الشرائح",
    previous: "الشريحة السابقة",
    next: "الشريحة التالية",
    slides: "اختيار الشريحة",
    goTo: (n: number) => `الانتقال إلى الشريحة ${n}`,
    slide: (n: number, total: number) => `الشريحة ${n} من ${total}`,
    pause: "إيقاف التشغيل التلقائي",
    play: "بدء التشغيل التلقائي",
  },
} as const;

export const carouselStrings = (locale: string) => CAROUSEL_STRINGS[locale.split("-")[0] === "ar" ? "ar" : "en"];
