import type { InjectionKey, Ref } from "vue";

export interface DrawerContext {
  /** Distance the popup is dragged down, in px. */
  offset: Ref<number>;
  dragging: Ref<boolean>;
  close(): void;
}

export const DRAWER_CONTEXT: InjectionKey<DrawerContext> = Symbol("nq-drawer");

/** Fraction of the height of the drawer that must be dragged before releasing closes it. */
export const CLOSE_RATIO = 0.3;
/** A quick flick closes regardless of distance (px per ms). */
export const CLOSE_VELOCITY = 0.6;
export const SLIDE_OUT_MS = 200;
