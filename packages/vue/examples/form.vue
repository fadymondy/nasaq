<script setup lang="ts">
import { NqButton, NqForm, NqFormField, NqInput, useForm } from "@fadymondy/nasaq/vue";

// Pretend server call: the address "taken@example.com" already has an account.
async function signUp(v: { email: string }): Promise<{ ok: boolean; taken?: boolean }> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  return { ok: v.email !== "fail@example.com", taken: v.email === "taken@example.com" };
}

const form = useForm({
  defaultValues: { email: "" },
  validate: (v) => (v.email.includes("@") ? {} : { email: "Enter a valid email." }),
  onSubmit: async (v) => {
    const res = await signUp(v);
    if (res.taken) return { fieldErrors: { email: "This email already has an account." } };
    if (!res.ok) return { error: "Sign-up failed. Try again." };
  },
});
</script>

<template>
  <NqForm v-bind="form.formProps" class="max-w-sm">
    <NqFormField name="email" label="Email">
      <NqInput v-bind="form.register('email')" type="email" />
    </NqFormField>
    <NqButton type="submit" variant="primary" :loading="form.submitting">Create account</NqButton>
  </NqForm>
</template>
