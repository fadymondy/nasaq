<script setup lang="ts">
import { computed, provide, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { FIELD } from "./context";

// Wires a label, a control, a description and an error together: `for`/`id`, `aria-describedby`, `aria-invalid`.
interface Props {
  /** The field's name, handed to the control for native form submission. */
  name?: string;
  /** Marks the control invalid and shows the FieldError. */
  invalid?: boolean;
  disabled?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { invalid: false, disabled: false });

const generated = `nq-field-${useId()}`;
const controlId = ref(generated);
const described = ref<string[]>([]);
provide(FIELD, {
  controlId,
  name: computed(() => props.name),
  invalid: computed(() => props.invalid),
  disabled: computed(() => props.disabled),
  describedBy: computed(() => (described.value.length ? described.value.join(" ") : undefined)),
  register(id) {
    described.value = [...described.value, id];
    return () => (described.value = described.value.filter((d) => d !== id));
  },
  setControlId(id) {
    controlId.value = id ?? generated;
  },
});
</script>

<template>
  <div
    data-slot="field"
    :data-disabled="props.disabled ? '' : undefined"
    :data-invalid="props.invalid ? '' : undefined"
    :data-valid="props.invalid ? undefined : ''"
    :class="cn('flex flex-col gap-1.5', props.class)"
  >
    <slot />
  </div>
</template>
