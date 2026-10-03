import { inject, type ComputedRef, type InjectionKey, type Ref } from "vue";
import type { CarouselAlign } from "./carousel-logic";

export interface CarouselContext {
  viewport: Ref<HTMLElement | null>;
  rtl: ComputedRef<boolean>;
  locale: ComputedRef<string>;
  align: ComputedRef<CarouselAlign>;
  canPrev: Ref<boolean>;
  canNext: Ref<boolean>;
  selected: Ref<number>;
  count: Ref<number>;
  /** Bumped when the slides change, so items re-read their position. */
  version: Ref<number>;
  /** Autoplay is configured and allowed (not reduced motion). */
  autoplayEnabled: ComputedRef<boolean>;
  playing: Ref<boolean>;
  setPlaying(playing: boolean): void;
  scrollPrev(): void;
  scrollNext(): void;
  scrollTo(index: number): void;
  /** Re-measures; called by the content when slides or sizes change. */
  sync(): void;
}

export const CAROUSEL_KEY: InjectionKey<CarouselContext> = Symbol("nq-carousel");

/** The state and controls of the nearest `NqCarousel`, for custom controls. */
export function useCarouselContext(): CarouselContext {
  const ctx = inject(CAROUSEL_KEY, null);
  if (!ctx) throw new Error("Carousel parts must be used inside <NqCarousel>.");
  return ctx;
}
