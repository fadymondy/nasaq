<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldDescription, NqFieldError, NqFieldLabel } from "../field";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqTagInput } from "../tag-input";
import { isEmailAddress } from "./members-rules";
import { membersManagerStrings, type MembersManagerLabels } from "./strings";
import type { InviteResult, InviteValues, MemberRoleOption } from "./types";

// Invite by email: several addresses as chips and one role for all of them. Open while `open` is true.
const props = withDefaults(
  defineProps<{
    open: boolean;
    /** Roles the signed-in person may give. */
    roles: readonly MemberRoleOption[];
    /** Role ticked at first. Default: the last role in the list. */
    defaultRole?: string;
    /** Send the invites. Return `{ error }` or `{ emailsError }` to keep the dialog open. */
    onSubmit: (values: InviteValues) => Promise<InviteResult> | InviteResult;
    labels?: MembersManagerLabels;
  }>(),
  { defaultRole: undefined, labels: undefined },
);
const emit = defineEmits<{ "update:open": [open: boolean] }>();

const nq = useNasaq();
const t = computed(() => ({ ...membersManagerStrings(nq.locale.value), ...props.labels }));
const startRole = () => props.defaultRole ?? props.roles[props.roles.length - 1]?.id ?? "";
const emails = ref<string[]>([]);
const role = ref(startRole());
const error = ref<string | null>(null);
const formError = ref<string | null>(null);
const busy = ref(false);
watch(
  () => props.open,
  (open) => {
    if (!open) return;
    emails.value = [];
    role.value = startRole();
    error.value = null;
    formError.value = null;
  },
);
const roleDescription = computed(() => props.roles.find((r) => r.id === role.value)?.description);

const validate = (tag: string, tags: readonly string[]) => (!isEmailAddress(tag) ? t.value.emailInvalid(tag) : tags.some((x) => x.toLowerCase() === tag.toLowerCase()) ? t.value.emailDuplicate(tag) : true);

async function submit() {
  if (!emails.value.length) {
    error.value = t.value.emailsRequired;
    return;
  }
  error.value = null;
  formError.value = null;
  busy.value = true;
  try {
    const result = await props.onSubmit({ emails: emails.value, role: role.value });
    if (result && typeof result === "object" && (result.error || result.emailsError)) {
      error.value = result.emailsError ?? null;
      formError.value = result.error ?? null;
    } else emit("update:open", false);
  } catch {
    formError.value = t.value.failed;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <NqDialog :open="props.open" @update:open="(next: boolean) => !busy && emit('update:open', next)">
    <NqDialogContent class="max-w-lg">
      <form novalidate class="flex flex-col gap-5" @submit.prevent="submit">
        <NqDialogHeader>
          <NqDialogTitle>{{ t.inviteTitle }}</NqDialogTitle>
          <NqDialogDescription>{{ t.inviteBody }}</NqDialogDescription>
        </NqDialogHeader>
        <div class="flex flex-col gap-4">
          <NqField :invalid="!!error">
            <NqFieldLabel>{{ t.emails }}</NqFieldLabel>
            <NqTagInput
              :model-value="emails"
              :placeholder="t.emailsPlaceholder"
              :invalid="!!error"
              :validate="validate"
              :input-props="{ dir: 'ltr', type: 'email', inputmode: 'email', 'aria-label': t.emails }"
              @update:model-value="(next: readonly string[]) => ((emails = [...next]), (error = null))"
            />
            <NqFieldError v-if="error" match>{{ error }}</NqFieldError>
            <NqFieldDescription v-else>{{ t.emailsHint }}</NqFieldDescription>
          </NqField>
          <NqField>
            <NqFieldLabel>{{ t.roleField }}</NqFieldLabel>
            <NqSelect :model-value="role" @update:model-value="(v: string | number | null) => v && (role = String(v))">
              <NqSelectTrigger><NqSelectValue /></NqSelectTrigger>
              <NqSelectContent>
                <NqSelectItem v-for="r in props.roles" :key="r.id" :value="r.id">{{ r.label }}</NqSelectItem>
              </NqSelectContent>
            </NqSelect>
            <NqFieldDescription v-if="roleDescription">{{ roleDescription }}</NqFieldDescription>
          </NqField>
          <NqAlert v-if="formError" tone="danger" role="alert">{{ formError }}</NqAlert>
        </div>
        <NqDialogFooter>
          <NqButton type="button" variant="ghost" :disabled="busy" @click="emit('update:open', false)">{{ t.cancel }}</NqButton>
          <NqButton type="submit" variant="primary" :loading="busy" :disabled="!props.roles.length">{{ t.send }}</NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
