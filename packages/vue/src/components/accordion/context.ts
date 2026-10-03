import type { InjectionKey } from "vue";

/** The item gives its panel an id up front, so the trigger can point aria-controls at it before the panel renders. */
export const ACCORDION_PANEL_ID: InjectionKey<string> = Symbol("nq-accordion-panel-id");
