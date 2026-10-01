<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useFieldControl } from "./context";
import { controlClass } from "./variants";

// A Field control rendered as a `<textarea>`: label, description, error and `data-invalid` wire up like Input.
interface Props {
  id?: string;
  name?: string;
  disabled?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { disabled: undefined });
const model = defineModel<string | undefined>();
const field = useFieldControl(() => props.id);
const isDisabled = computed(() => props.disabled ?? (field.disabled.value || undefined));
</script>

<template>
  <textarea
    v-model="model"
    data-slot="textarea"
    :id="field.id.value"
    :name="props.name ?? field.name.value"
    :disabled="isDisabled"
    :aria-describedby="field.describedBy.value"
    :aria-invalid="field.invalid.value || undefined"
    :data-invalid="field.invalid.value ? '' : undefined"
    :class="cn(controlClass, 'min-h-20 py-2', props.class)"
  />
</template>
