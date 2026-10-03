import { computed, inject, onBeforeUnmount, onMounted, toValue, type ComputedRef, type InjectionKey, type MaybeRefOrGetter, type Ref } from "vue";

/** What a NqField shares with its label, description, error and control. */
export interface FieldContext {
  /** The id the control gets (and the label points at). */
  controlId: Ref<string>;
  name: ComputedRef<string | undefined>;
  invalid: ComputedRef<boolean>;
  disabled: ComputedRef<boolean>;
  /** Registers a mounted description or error id for `aria-describedby`; returns the unregister function. */
  register(id: string): () => void;
  describedBy: ComputedRef<string | undefined>;
  /** A control with its own `id` tells the Field so the label follows it. */
  setControlId(id: string | undefined): void;
}

export const FIELD: InjectionKey<FieldContext> = Symbol("nq-field");

/** The wiring a form control takes from its NqField, if it sits in one. Works standalone too. */
export function useFieldControl(ownId: MaybeRefOrGetter<string | undefined>) {
  const ctx = inject(FIELD, null);
  onMounted(() => ctx?.setControlId(toValue(ownId)));
  onBeforeUnmount(() => ctx?.setControlId(undefined));
  return {
    id: computed(() => toValue(ownId) ?? ctx?.controlId.value),
    name: computed(() => ctx?.name.value),
    invalid: computed(() => ctx?.invalid.value ?? false),
    disabled: computed(() => ctx?.disabled.value ?? false),
    describedBy: computed(() => ctx?.describedBy.value),
  };
}
