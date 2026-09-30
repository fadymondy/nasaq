"use client";

import useEmblaCarousel, { type UseEmblaCarouselType } from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import {
  Children,
  type ComponentProps,
  createContext,
  isValidElement,
  type KeyboardEvent,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { cn } from "../../lib/cn";
import { Button } from "../button";
import { useCalendarLocale } from "../calendar";
import { Icon } from "../icon";

export type CarouselApi = NonNullable<UseEmblaCarouselType[1]>;
export type CarouselOptions = NonNullable<Parameters<typeof useEmblaCarousel>[0]>;

const STRINGS = {
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
const strings = (locale: string) => STRINGS[locale.split("-")[0] === "ar" ? "ar" : "en"];

const REDUCED = "(prefers-reduced-motion: reduce)";
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia(REDUCED);
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    },
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );
}

interface CarouselContextValue {
  viewportRef: UseEmblaCarouselType[0];
  api: CarouselApi | undefined;
  rtl: boolean;
  locale: string;
  canPrev: boolean;
  canNext: boolean;
  selected: number;
  count: number;
  /** Autoplay is configured and allowed (not reduced motion). */
  autoplayEnabled: boolean;
  playing: boolean;
  setPlaying: (playing: boolean) => void;
}

const CarouselContext = createContext<CarouselContextValue | null>(null);

function useCarousel() {
  const ctx = useContext(CarouselContext);
  if (!ctx) throw new Error("Carousel parts must be used inside <Carousel>.");
  return ctx;
}

/** The embla API and selection state of the nearest `Carousel`, for custom controls. */
export const useCarouselContext = useCarousel;

export interface CarouselProps extends Omit<ComponentProps<"div">, "dir"> {
  /** Wrap around at the ends. Default false. */
  loop?: boolean;
  /** Where the active slide rests in the viewport. Default "start". */
  align?: "start" | "center" | "end";
  /** Extra embla options. `direction` is set from the reading direction and cannot be overridden. */
  opts?: Omit<CarouselOptions, "direction">;
  /** Advance on a timer. `true` uses 5000 ms; a number is the interval in ms. Off under `prefers-reduced-motion`. */
  autoplay?: boolean | number;
  /** Receives the embla API once the carousel is ready. */
  setApi?: (api: CarouselApi) => void;
  /** Accessible name of the carousel. Localise it. */
  label?: string;
  locale?: string;
  dir?: "ltr" | "rtl";
}

/**
 * A swipeable slide carousel on Embla. The reading direction is passed to Embla, so RTL swipes, arrows and the
 * order of slides mirror. Compose `CarouselContent`, `CarouselItem`, `CarouselPrevious`, `CarouselNext` and `CarouselDots`.
 */
export function Carousel({
  loop = false,
  align = "start",
  opts,
  autoplay = false,
  setApi,
  label,
  locale: localeProp,
  dir: dirProp,
  className,
  children,
  onKeyDown,
  ...props
}: CarouselProps) {
  const { locale, rtl, dir } = useCalendarLocale({ locale: localeProp, dir: dirProp });
  const t = strings(locale);
  const [viewportRef, api] = useEmblaCarousel({ loop, align, ...opts, direction: rtl ? "rtl" : "ltr" });
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [selected, setSelected] = useState(0);
  const [count, setCount] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [paused, setPaused] = useState(false);
  const reduced = usePrefersReducedMotion();
  const autoplayEnabled = Boolean(autoplay) && !reduced;
  const interval = typeof autoplay === "number" ? autoplay : 5000;

  const sync = useCallback((embla: CarouselApi) => {
    setCanPrev(embla.canScrollPrev());
    setCanNext(embla.canScrollNext());
    setSelected(embla.selectedScrollSnap());
    setCount(embla.scrollSnapList().length);
  }, []);

  useEffect(() => {
    if (!api) return;
    sync(api);
    setApi?.(api);
    api.on("select", sync).on("reInit", sync);
    // Touching the carousel ends autoplay for good: the user has taken over.
    const stop = () => setPlaying(false);
    api.on("pointerDown", stop);
    return () => {
      api.off("select", sync).off("reInit", sync).off("pointerDown", stop);
    };
  }, [api, sync, setApi]);

  useEffect(() => {
    if (!api || !autoplayEnabled || !playing || paused) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      if (api.canScrollNext()) api.scrollNext();
      else api.scrollTo(0);
    }, interval);
    return () => window.clearInterval(id);
  }, [api, autoplayEnabled, playing, paused, interval]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const target = event.target as HTMLElement;
    if (target.closest("input, textarea, select, [contenteditable=true]")) return;
    // Right means "toward the end of the list" in LTR and toward the start in RTL.
    const toEnd = rtl ? "ArrowLeft" : "ArrowRight";
    const toStart = rtl ? "ArrowRight" : "ArrowLeft";
    if (event.key === toStart) {
      event.preventDefault();
      api?.scrollPrev();
    } else if (event.key === toEnd) {
      event.preventDefault();
      api?.scrollNext();
    }
  };

  return (
    <CarouselContext.Provider value={{ viewportRef, api, rtl, locale, canPrev, canNext, selected, count, autoplayEnabled, playing, setPlaying }}>
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label={label ?? t.carousel}
        dir={dir}
        lang={locale}
        tabIndex={0}
        data-slot="carousel"
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false);
        }}
        className={cn(
          "relative rounded-card outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
          className,
        )}
        {...props}
      >
        {children}
        {/* Live region: only while autoplay is off, so a rotating carousel does not chatter. */}
        <div className="sr-only" aria-live={autoplayEnabled && playing ? "off" : "polite"} aria-atomic="true">
          {count ? t.slide(selected + 1, count) : null}
        </div>
      </div>
    </CarouselContext.Provider>
  );
}

const SlideContext = createContext<{ index: number; total: number } | null>(null);

/** The scrolling track. Its children (`CarouselItem`) are the slides. */
export function CarouselContent({ className, children, ...props }: ComponentProps<"div">) {
  const { viewportRef } = useCarousel();
  const slides = Children.toArray(children).filter(isValidElement);
  return (
    <div ref={viewportRef} data-slot="carousel-viewport" className="overflow-hidden rounded-[inherit]">
      <div data-slot="carousel-content" className={cn("-ms-4 flex touch-pan-y", className)} {...props}>
        {slides.map((slide, index) => (
          <SlideContext.Provider key={slide.key ?? index} value={{ index, total: slides.length }}>
            {slide}
          </SlideContext.Provider>
        ))}
      </div>
    </div>
  );
}

/** One slide. Full width by default; use `basis-1/2`, `basis-1/3`... on it to show several. */
export function CarouselItem({ className, ...props }: ComponentProps<"div">) {
  const { locale } = useCarousel();
  const slide = useContext(SlideContext);
  const t = strings(locale);
  return (
    <div
      role="group"
      aria-roledescription="slide"
      aria-label={slide ? t.slide(slide.index + 1, slide.total) : undefined}
      data-slot="carousel-item"
      className={cn("min-w-0 shrink-0 grow-0 basis-full ps-4", className)}
      {...props}
    />
  );
}

const navClass =
  "absolute top-1/2 z-10 -translate-y-1/2 rounded-full bg-card/90 shadow-floating backdrop-blur-sm data-disabled:opacity-0";

/** Previous slide. Sits at the inline-start edge; the chevron mirrors in RTL. */
export function CarouselPrevious({ className, ...props }: ComponentProps<typeof Button>) {
  const { api, canPrev, locale } = useCarousel();
  return (
    <Button
      variant="secondary"
      size="icon"
      data-slot="carousel-previous"
      aria-label={strings(locale).previous}
      disabled={!canPrev}
      onClick={() => api?.scrollPrev()}
      className={cn(navClass, "start-3", className as string)}
      {...props}
    >
      <Icon icon={ChevronLeft} directional />
    </Button>
  );
}

/** Next slide. Sits at the inline-end edge; the chevron mirrors in RTL. */
export function CarouselNext({ className, ...props }: ComponentProps<typeof Button>) {
  const { api, canNext, locale } = useCarousel();
  return (
    <Button
      variant="secondary"
      size="icon"
      data-slot="carousel-next"
      aria-label={strings(locale).next}
      disabled={!canNext}
      onClick={() => api?.scrollNext()}
      className={cn(navClass, "end-3", className as string)}
      {...props}
    >
      <Icon icon={ChevronRight} directional />
    </Button>
  );
}

/** One dot per scroll snap. The current dot has `aria-current="true"`. Place it under the content. */
export function CarouselDots({ className, ...props }: ComponentProps<"div">) {
  const { api, count, selected, locale } = useCarousel();
  const t = strings(locale);
  if (count < 2) return null;
  return (
    <div role="group" aria-label={t.slides} data-slot="carousel-dots" className={cn("mt-3 flex items-center justify-center gap-1.5", className)} {...props}>
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          aria-label={t.goTo(i + 1)}
          aria-current={i === selected ? "true" : undefined}
          onClick={() => api?.scrollTo(i)}
          className={cn(
            "relative h-2 rounded-full bg-nq-line-strong outline-none transition-[width,background-color] duration-150 ease-nq",
            "hover:bg-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
            // 24px hit area without changing the dot's look.
            "after:absolute after:-inset-2 after:content-['']",
            i === selected ? "w-5 bg-primary hover:bg-primary" : "w-2",
          )}
        />
      ))}
    </div>
  );
}

/** Pause / start button for autoplay. Renders nothing when autoplay is off or reduced motion is requested. */
export function CarouselPlayPause({ className, ...props }: ComponentProps<typeof Button>) {
  const { autoplayEnabled, playing, setPlaying, locale } = useCarousel();
  const t = strings(locale);
  const ref = useRef<HTMLButtonElement>(null);
  if (!autoplayEnabled) return null;
  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon-sm"
      data-slot="carousel-play-pause"
      aria-label={playing ? t.pause : t.play}
      aria-pressed={!playing}
      onClick={() => setPlaying(!playing)}
      className={className as string}
      {...props}
    >
      {playing ? <Pause /> : <Play />}
    </Button>
  );
}
