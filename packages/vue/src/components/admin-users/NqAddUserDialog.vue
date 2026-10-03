<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqCheckbox } from "../checkbox";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldDescription, NqFieldError, NqFieldLabel, NqInput } from "../field";
import { NqPasswordInput } from "../password-input";
import { NqSwitch } from "../switch";
import { NqTagInput } from "../tag-input";
import { adminUsersStrings, type AdminUsersLabels } from "./strings";
import { adminUsersEmailOk, type AddUserResult, type ManagedRole, type NewUserValues } from "./types";

// A dialog that collects the details of a new user: name, email, roles, and how they are told.
const props = withDefaults(
  defineProps<{
    open: boolean;
    roles: readonly ManagedRole[];
    /** Create the user. Return `{ error }` or `{ fieldErrors }` to keep the dialog open. */
    onSubmit: (values: NewUserValues) => Promise<AddUserResult> | AddUserResult;
    /** Roles ticked at first. Default: the first role (none with free-form roles). */
    defaultRoles?: readonly string[];
    /** Show an optional password field. With a password typed, "Send an invitation email" is turned off. */
    password?: boolean;
    /** Minimum length for a typed password. Default 8. */
    minPasswordLength?: number;
    /** Type role names instead of ticking them. Default: on when `roles` is empty. */
    freeRoles?: boolean;
    labels?: AdminUsersLabels;
  }>(),
  { defaultRoles: undefined, password: false, minPasswordLength: 8, freeRoles: undefined },
);
const emit = defineEmits<{ "update:open": [open: boolean] }>();

const nq = useNasaq();
const t = computed(() => ({ ...adminUsersStrings(nq.locale.value), ...props.labels }));
const free = computed(() => props.freeRoles ?? props.roles.length === 0);
const initial = (): NewUserValues => ({
  name: "",
  email: "",
  roles: [...(props.defaultRoles ?? (free.value ? [] : props.roles.slice(0, 1).map((r) => r.id)))],
  sendInvite: true,
  verified: false,
});
const values = ref<NewUserValues>(initial());
const pw = ref("");
const errors = ref<Partial<Record<"name" | "email" | "roles" | "password", string>>>({});
const formError = ref<string | null>(null);
const busy = ref(false);

watch(
  () => props.open,
  (open) => {
    if (open) {
      values.value = initial();
      pw.value = "";
      errors.value = {};
      formError.value = null;
    }
  },
);

async function submit() {
  const v = values.value;
  const next: typeof errors.value = {};
  if (!v.name.trim()) next.name = t.value.nameRequired;
  if (!v.email.trim()) next.email = t.value.emailRequired;
  else if (!adminUsersEmailOk(v.email.trim())) next.email = t.value.emailInvalid;
  if (!free.value && !v.roles.length) next.roles = t.value.rolesRequired;
  if (props.password && pw.value && pw.value.length < props.minPasswordLength) next.password = t.value.passwordShort(String(props.minPasswordLength));
  errors.value = next;
  formError.value = null;
  if (Object.keys(next).length) return;
  busy.value = true;
  try {
    const result = await props.onSubmit({
      ...v,
      roles: [...v.roles],
      name: v.name.trim(),
      email: v.email.trim(),
      ...(props.password && pw.value ? { password: pw.value, sendInvite: false } : {}),
    });
    if (result && typeof result === "object" && (result.error || result.fieldErrors)) {
      errors.value = { ...result.fieldErrors };
      formError.value = result.error ?? null;
    } else emit("update:open", false);
  } catch {
    formError.value = t.value.failed;
  } finally {
    busy.value = false;
  }
}

const toggle = (id: string, on: boolean) => {
  values.value = { ...values.value, roles: on ? [...values.value.roles, id] : values.value.roles.filter((r) => r !== id) };
};
const hasPw = computed(() => props.password && !!pw.value);
</script>

<template>
  <NqDialog :open="props.open" @update:open="(open: boolean) => !busy && emit('update:open', open)">
    <NqDialogContent class="max-w-lg">
      <form novalidate class="flex flex-col gap-5" @submit.prevent="submit">
        <NqDialogHeader>
          <NqDialogTitle>{{ t.addTitle }}</NqDialogTitle>
          <NqDialogDescription>{{ t.addBody }}</NqDialogDescription>
        </NqDialogHeader>
        <div class="flex flex-col gap-4">
          <NqField :invalid="!!errors.name">
            <NqFieldLabel>{{ t.name }}</NqFieldLabel>
            <NqInput v-model="values.name" autocomplete="off" />
            <NqFieldError :match="!!errors.name">{{ errors.name }}</NqFieldError>
          </NqField>
          <NqField :invalid="!!errors.email">
            <NqFieldLabel>{{ t.emailField }}</NqFieldLabel>
            <NqInput v-model="values.email" ltr type="email" autocomplete="off" />
            <NqFieldError :match="!!errors.email">{{ errors.email }}</NqFieldError>
          </NqField>
          <NqField v-if="props.password" :invalid="!!errors.password">
            <NqFieldLabel>{{ t.password }}</NqFieldLabel>
            <NqPasswordInput v-model="pw" name="password" autocomplete="new-password" show-strength :aria-invalid="errors.password ? true : undefined" @update:model-value="errors = { ...errors, password: undefined }" />
            <NqFieldError v-if="errors.password" match>{{ errors.password }}</NqFieldError>
            <NqFieldDescription v-else>{{ t.passwordHint }}</NqFieldDescription>
          </NqField>
          <NqField v-if="free">
            <NqFieldLabel>{{ t.rolesField }}</NqFieldLabel>
            <NqTagInput v-model="values.roles" :suggestions="props.roles.map((r) => r.id)" :placeholder="t.rolesFreePlaceholder" add-on-blur />
            <NqFieldDescription>{{ t.rolesFreeHint }}</NqFieldDescription>
          </NqField>
          <fieldset v-else class="flex min-w-0 flex-col gap-2 border-0 p-0">
            <legend class="mb-1 text-label text-foreground">{{ t.rolesField }}</legend>
            <label v-for="role in props.roles" :key="role.id" class="flex cursor-pointer items-start gap-2.5 rounded-control border border-border p-2.5 has-[[data-checked]]:border-primary has-[[data-checked]]:bg-nq-selected">
              <NqCheckbox class="mt-0.5" :model-value="values.roles.includes(role.id)" @update:model-value="(on: boolean) => toggle(role.id, on)" />
              <span class="flex min-w-0 flex-col">
                <span class="text-label text-foreground">{{ role.label }}</span>
                <span v-if="role.description" class="text-caption text-muted-foreground">{{ role.description }}</span>
              </span>
            </label>
            <p v-if="errors.roles" role="alert" class="text-caption text-nq-danger-text">{{ errors.roles }}</p>
          </fieldset>
          <div class="flex flex-col divide-y divide-border rounded-control border border-border">
            <NqField class="flex-row items-center justify-between gap-4 px-3 py-2.5">
              <div class="flex min-w-0 flex-col">
                <NqFieldLabel>{{ t.sendInvite }}</NqFieldLabel>
                <NqFieldDescription>{{ t.sendInviteHint }}</NqFieldDescription>
              </div>
              <NqSwitch :model-value="values.sendInvite && !hasPw" :disabled="hasPw" :aria-label="t.sendInvite" @update:model-value="(on: boolean) => (values = { ...values, sendInvite: on })" />
            </NqField>
            <NqField class="flex-row items-center justify-between gap-4 px-3 py-2.5">
              <div class="flex min-w-0 flex-col">
                <NqFieldLabel>{{ t.markVerified }}</NqFieldLabel>
                <NqFieldDescription>{{ t.markVerifiedHint }}</NqFieldDescription>
              </div>
              <NqSwitch v-model="values.verified" :aria-label="t.markVerified" />
            </NqField>
          </div>
          <NqAlert v-if="formError" tone="danger" role="alert">{{ formError }}</NqAlert>
        </div>
        <NqDialogFooter>
          <NqButton type="button" variant="ghost" :disabled="busy" @click="emit('update:open', false)">{{ t.cancel }}</NqButton>
          <NqButton type="submit" variant="primary" :loading="busy">{{ t.create }}</NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
