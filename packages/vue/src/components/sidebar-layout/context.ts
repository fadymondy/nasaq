import type { InjectionKey } from "vue";

export interface SortableContext {
  onMove: (activeId: string, overId: string) => void;
  /** performance.now() until which clicks are swallowed (the mouseup that ends a drag). */
  suppressClickUntil: { value: number };
}

export const SORTABLE_KEY: InjectionKey<SortableContext> = Symbol("nasaq-sidebar-sortable");
