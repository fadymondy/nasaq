import type { InjectionKey, Ref } from "vue";

/** Set by NqMenubarGroup so a label inside it can name the group (aria-labelledby). */
export interface GroupContext {
  labelId: string;
  hasLabel: Ref<boolean>;
}
export const MENU_GROUP: InjectionKey<GroupContext> = Symbol("nq-menubar-group");

/** The selected value of the nearest NqMenubarRadioGroup. */
export const MENU_RADIO_VALUE: InjectionKey<Ref<string | undefined>> = Symbol("nq-menubar-radio-value");

/** Whether the nearest submenu is open (for data-popup-open on its trigger). */
export const MENU_SUB_OPEN: InjectionKey<Ref<boolean>> = Symbol("nq-menubar-sub-open");
