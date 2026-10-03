import type { InjectionKey, Ref } from "vue";

export const TABS_VARIANT: InjectionKey<Ref<"segmented" | "underline">> = Symbol("nq-tabs-variant");
