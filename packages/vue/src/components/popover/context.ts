import type { InjectionKey, Ref } from "vue";

export interface PopoverContentContext {
  titleId: string;
  descriptionId: string;
  hasTitle: Ref<boolean>;
  hasDescription: Ref<boolean>;
}
export const POPOVER_CONTENT: InjectionKey<PopoverContentContext> = Symbol("nq-popover-content");
