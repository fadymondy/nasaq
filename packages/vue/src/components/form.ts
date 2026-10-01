// Form controls with v-model. NqField wires the label, hint and error to the control (aria-describedby, aria-invalid).

import { computed, defineComponent, h, inject, provide, useId, type ComputedRef, type InjectionKey, type PropType } from "vue";

interface FieldContext {
  id: string;
  describedBy: ComputedRef<string | undefined>;
  invalid: ComputedRef<boolean>;
}
const FIELD_KEY: InjectionKey<FieldContext> = Symbol("nq-field");

export const NqField = defineComponent({
  name: "NqField",
  props: {
    label: { type: String, default: undefined },
    hint: { type: String, default: undefined },
    error: { type: String, default: undefined },
    required: { type: Boolean, default: false },
  },
  setup(props, { slots }) {
    const id = `nq-field-${useId()}`;
    const describedBy = computed(() => [props.hint && `${id}-hint`, props.error && `${id}-error`].filter(Boolean).join(" ") || undefined);
    provide(FIELD_KEY, { id, describedBy, invalid: computed(() => !!props.error) });
    return () =>
      h("div", { class: "nq-field" }, [
        props.label
          ? h("label", { class: "nq-field-label", for: id }, [props.label, props.required ? h("span", { "aria-hidden": "true" }, " *") : null])
          : null,
        slots.default?.(),
        props.hint ? h("p", { class: "nq-field-description", id: `${id}-hint` }, props.hint) : null,
        props.error ? h("p", { class: "nq-field-error", id: `${id}-error`, role: "alert" }, props.error) : null,
      ]);
  },
});

function fieldAttrs(invalidProp: boolean) {
  const f = inject(FIELD_KEY, null);
  return () => ({
    id: f?.id,
    "aria-describedby": f?.describedBy.value,
    "aria-invalid": invalidProp || f?.invalid.value ? "true" : undefined,
  });
}

export const NqInput = defineComponent({
  name: "NqInput",
  inheritAttrs: true,
  props: {
    modelValue: { type: [String, Number] as PropType<string | number>, default: undefined },
    type: { type: String, default: "text" },
    invalid: { type: Boolean, default: false },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const a = fieldAttrs(props.invalid);
    return () =>
      h("input", {
        class: "nq-input",
        type: props.type,
        value: props.modelValue,
        ...a(),
        onInput: (e: Event) => {
          const v = (e.target as HTMLInputElement).value;
          emit("update:modelValue", props.type === "number" && v !== "" ? Number(v) : v);
        },
      });
  },
});

export const NqTextarea = defineComponent({
  name: "NqTextarea",
  props: {
    modelValue: { type: String, default: undefined },
    rows: { type: Number, default: 3 },
    invalid: { type: Boolean, default: false },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const a = fieldAttrs(props.invalid);
    return () =>
      h("textarea", {
        class: "nq-textarea",
        rows: props.rows,
        value: props.modelValue,
        ...a(),
        onInput: (e: Event) => emit("update:modelValue", (e.target as HTMLTextAreaElement).value),
      });
  },
});

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export const NqSelect = defineComponent({
  name: "NqSelect",
  props: {
    modelValue: { type: String, default: undefined },
    options: { type: Array as PropType<SelectOption[]>, default: () => [] },
    placeholder: { type: String, default: undefined },
    invalid: { type: Boolean, default: false },
  },
  emits: ["update:modelValue"],
  setup(props, { emit, slots }) {
    const a = fieldAttrs(props.invalid);
    return () =>
      h(
        "select",
        {
          class: "nq-select",
          value: props.modelValue ?? "",
          ...a(),
          onChange: (e: Event) => emit("update:modelValue", (e.target as HTMLSelectElement).value),
        },
        [
          props.placeholder ? h("option", { value: "", disabled: true }, props.placeholder) : null,
          ...props.options.map((o) => h("option", { value: o.value, disabled: o.disabled, selected: o.value === props.modelValue }, o.label)),
          slots.default?.(),
        ],
      );
  },
});

function choice(name: string, cls: string, type: "checkbox" | "radio", role?: string) {
  return defineComponent({
    name,
    props: {
      modelValue: { type: [Boolean, String, Number] as PropType<boolean | string | number>, default: undefined },
      /** For radios: the value this option sets. */
      value: { type: [String, Number] as PropType<string | number>, default: undefined },
      label: { type: String, default: undefined },
      indeterminate: { type: Boolean, default: false },
      disabled: { type: Boolean, default: false },
    },
    emits: ["update:modelValue"],
    setup(props, { emit, slots }) {
      const checked = computed(() => (type === "radio" ? props.modelValue === props.value : !!props.modelValue));
      return () => {
        const input = h("input", {
          class: cls,
          type,
          role,
          checked: checked.value,
          value: props.value,
          disabled: props.disabled,
          indeterminate: props.indeterminate,
          "aria-checked": role === "switch" ? String(checked.value) : undefined,
          onChange: (e: Event) => emit("update:modelValue", type === "radio" ? props.value : (e.target as HTMLInputElement).checked),
        });
        const text = props.label ?? slots.default?.();
        return text ? h("label", { class: "nq-choice" }, [input, h("span", text)]) : input;
      };
    },
  });
}

export const NqCheckbox = choice("NqCheckbox", "nq-checkbox", "checkbox");
export const NqRadio = choice("NqRadio", "nq-radio", "radio");
export const NqSwitch = choice("NqSwitch", "nq-switch", "checkbox", "switch");
