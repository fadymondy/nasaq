<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqCheckbox } from "../checkbox";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { adminUsersStrings, type AdminUsersLabels } from "./strings";
import { adminUsersAttempt, type AdminActionResult, type ManagedRole, type ManagedUser } from "./types";

// Edit the roles of one user. Open while `user` is set. At least one role must stay ticked.
const props = defineProps<{
  user: ManagedUser | null;
  roles: readonly ManagedRole[];
  /** Save the new role ids. Return `{ error }` to keep the dialog open. */
  onSave: (user: ManagedUser, roles: string[]) => Promise<AdminActionResult> | AdminActionResult;
  labels?: AdminUsersLabels;
}>();
const emit = defineEmits<{ "update:open": [open: boolean] }>();

const nq = useNasaq();
const t = computed(() => ({ ...adminUsersStrings(nq.locale.value), ...props.labels }));
const chosen = ref<string[]>([...(props.user?.roles ?? [])]);
const busy = ref(false);
const error = ref<string | null>(null);
watch(
  () => props.user,
  (user) => {
    chosen.value = [...(user?.roles ?? [])];
    error.value = null;
  },
);
const changed = computed(() => (props.user ? chosen.value.length !== props.user.roles.length || chosen.value.some((r) => !props.user!.roles.includes(r)) : false));

async function save() {
  const user = props.user;
  if (!user) return;
  busy.value = true;
  const failure = await adminUsersAttempt(() => props.onSave(user, chosen.value));
  busy.value = false;
  if (failure === null) emit("update:open", false);
  else error.value = failure || t.value.failed;
}
const toggle = (id: string, on: boolean) => (chosen.value = on ? [...chosen.value, id] : chosen.value.filter((r) => r !== id));
</script>

<template>
  <NqDialog :open="!!props.user" @update:open="(open: boolean) => !busy && emit('update:open', open)">
    <NqDialogContent class="max-w-md">
      <NqDialogHeader>
        <NqDialogTitle>{{ props.user ? t.rolesTitle(props.user.name) : "" }}</NqDialogTitle>
        <NqDialogDescription>{{ t.rolesBody }}</NqDialogDescription>
      </NqDialogHeader>
      <div class="flex flex-col gap-2">
        <label v-for="role in props.roles" :key="role.id" class="flex cursor-pointer items-start gap-2.5 rounded-control border border-border p-2.5 has-[[data-checked]]:border-primary has-[[data-checked]]:bg-nq-selected">
          <NqCheckbox class="mt-0.5" :model-value="chosen.includes(role.id)" @update:model-value="(on: boolean) => toggle(role.id, on)" />
          <span class="flex min-w-0 flex-col">
            <span class="text-label text-foreground">{{ role.label }}</span>
            <span v-if="role.description" class="text-caption text-muted-foreground">{{ role.description }}</span>
          </span>
        </label>
        <NqAlert v-if="error" tone="danger" role="alert">{{ error }}</NqAlert>
      </div>
      <NqDialogFooter>
        <NqButton variant="ghost" :disabled="busy" @click="emit('update:open', false)">{{ t.cancel }}</NqButton>
        <NqButton variant="primary" :loading="busy" :disabled="!changed || chosen.length === 0" @click="save">{{ t.saveRoles }}</NqButton>
      </NqDialogFooter>
    </NqDialogContent>
  </NqDialog>
</template>
