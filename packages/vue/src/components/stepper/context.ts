import { defineComponent, provide, type InjectionKey } from "vue";

export type StepperOrientation = "horizontal" | "vertical";
export type StepStatus = "complete" | "current" | "upcoming" | "error";

export interface StepperContextValue {
  current: number;
  orientation: StepperOrientation;
}
export interface StepperItemContextValue {
  readonly index: number;
  readonly last: boolean;
}

export const STEPPER_KEY: InjectionKey<() => StepperContextValue> = Symbol("nq-stepper");
export const STEPPER_ITEM_KEY: InjectionKey<StepperItemContextValue> = Symbol("nq-stepper-item");

/** Renderless: hands each item its position (React does this with a context per child). */
export const StepperItemScope = defineComponent({
  name: "NqStepperItemScope",
  props: { index: { type: Number, required: true }, last: { type: Boolean, required: true } },
  setup(props, { slots }) {
    provide(STEPPER_ITEM_KEY, props);
    return () => slots.default?.();
  },
});
