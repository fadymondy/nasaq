<script setup lang="ts">
import { computed, provide, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqAlert } from "../alert";
import { FORM } from "./form";

// <NqForm v-bind="form.formProps"> … <NqFormField name="email" label="Email"><NqInput v-bind="form.register('email')" /></NqFormField> … </NqForm>
// A <form> that connects field errors to Nasaq fields by `name`: a field with an error is marked invalid and shows
// the message, and it clears when the user edits it. Takes `useForm().formProps`, or `errors` from anywhere.
interface Props {
  /** Errors by field name; each shows in the `NqFormField` with that `name`. Empty values are ignored. */
  errors?: Record<string, string | undefined>;
  /** One error for the whole form, shown above the fields. */
  formError?: string | null;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const emit = defineEmits<{
  submit: [event: SubmitEvent];
  /** The errors left after the user edited a field. `useForm` applies it for you. */
  clearErrors: [errors: Record<string, string>];
}>();

const clean = computed(() => Object.fromEntries(Object.entries(props.errors ?? {}).filter(([, v]) => v)) as Record<string, string>);
provide(FORM, {
  errors: clean,
  clear(name) {
    if (!(name in clean.value)) return;
    const next = { ...clean.value };
    delete next[name];
    emit("clearErrors", next);
  },
});
</script>

<template>
  <form data-slot="form" novalidate :class="cn('flex flex-col gap-4', props.class)" @submit="(e) => emit('submit', e as SubmitEvent)">
    <NqAlert v-if="props.formError" tone="danger">{{ props.formError }}</NqAlert>
    <slot />
  </form>
</template>
