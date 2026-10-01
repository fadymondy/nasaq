import type { InjectionKey, Ref } from "vue";

export type ToggleGroupVariant = "segmented" | "outline";

export const TOGGLE_GROUP_VARIANT: InjectionKey<Ref<ToggleGroupVariant>> = Symbol("nq-toggle-group-variant");
