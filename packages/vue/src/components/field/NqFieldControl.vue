<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { useFieldControl } from "./context";

// The unstyled Field control: an `<input>` (or `as="textarea"`) that joins the Field and carries no classes.
interface Props {
  as?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { as: "input", disabled: undefined });
const model = defineModel<string | number | undefined>();
const field = useFieldControl(() => props.id);
const isDisabled = computed(() => props.disabled ?? (field.disabled.value || undefined));
</script>

<template>
  <component
    :is="props.as"
    :value="model"
    data-slot="field-control"
    :id="field.id.value"
    :name="props.name ?? field.name.value"
    :disabled="isDisabled"
    :aria-describedby="field.describedBy.value"
    :aria-invalid="field.invalid.value || undefined"
    :data-invalid="field.invalid.value ? '' : undefined"
    :class="props.class"
    @input="(e: Event) => (model = (e.target as HTMLInputElement).value)"
  />
</template>
