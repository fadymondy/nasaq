<script setup lang="ts">
import { computed, ref } from "vue";
import { NqAlert } from "../alert";

// The form-level error box: the server message, or a list of the fields to fix. Focusable so it can take focus.
interface Props {
  error?: string;
  fieldErrors: Partial<Record<string, string>>;
  /** Field name to the label people see, for the list of problems. */
  fieldLabels?: Record<string, string>;
  /** Heading when several fields have problems. */
  title: string;
}
const props = defineProps<Props>();
const emit = defineEmits<{ focusField: [name: string] }>();
const root = ref<HTMLElement | null>(null);
const entries = computed(() => Object.entries(props.fieldErrors).filter((e): e is [string, string] => Boolean(e[1])));
defineExpose({ el: root, focus: () => root.value?.focus() });
</script>

<template>
  <div v-if="!props.error && !entries.length" ref="root" tabindex="-1" class="sr-only" />
  <div v-else ref="root" tabindex="-1" data-slot="auth-error-summary" class="outline-none">
    <NqAlert tone="danger" :title="props.error ?? props.title">
      <ul v-if="!props.error && entries.length" class="flex list-disc flex-col gap-0.5 ps-4">
        <li v-for="[name, message] in entries" :key="name">
          <button type="button" class="text-start underline underline-offset-2" @click="emit('focusField', name)">
            {{ props.fieldLabels?.[name] ? `${props.fieldLabels[name]}: ` : "" }}{{ message }}
          </button>
        </li>
      </ul>
    </NqAlert>
  </div>
</template>
