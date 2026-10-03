import type { InjectionKey, Ref } from "vue";

export interface ChipGroupContext {
  value: Ref<string>;
  select: (value: string) => void;
}
export const chipGroupKey: InjectionKey<ChipGroupContext> = Symbol("nq-chip-group");
