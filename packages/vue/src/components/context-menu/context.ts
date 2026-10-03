import type { InjectionKey, Ref } from "vue";

/** Set by NqContextMenuGroup so a label inside it can name the group (aria-labelledby). */
export interface GroupContext {
  labelId: string;
  hasLabel: Ref<boolean>;
}
export const MENU_GROUP: InjectionKey<GroupContext> = Symbol("nq-context-menu-group");

/** The selected value of the nearest NqContextMenuRadioGroup. */
export const MENU_RADIO_VALUE: InjectionKey<Ref<string | undefined>> = Symbol("nq-context-menu-radio-value");

/** Whether the nearest submenu is open (for data-popup-open on its trigger). */
export const MENU_SUB_OPEN: InjectionKey<Ref<boolean>> = Symbol("nq-context-menu-sub-open");
