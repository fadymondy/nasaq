import type { InjectionKey, Ref } from "vue";

export interface ScrollAreaState {
  hovering: Ref<boolean>;
  scrolling: Ref<boolean>;
}
export const SCROLL_AREA_STATE: InjectionKey<ScrollAreaState> = Symbol("nq-scroll-area");
