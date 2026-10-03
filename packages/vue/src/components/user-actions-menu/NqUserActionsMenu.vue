<script setup lang="ts">
import { Ellipsis, KeyRound, Link2, Pencil, Trash2, UserCog } from "lucide-vue-next";
import { computed, ref, watch, type Component, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqAlertDialog, NqAlertDialogContent, NqAlertDialogDescription, NqAlertDialogFooter, NqAlertDialogHeader, NqAlertDialogTitle } from "../alert-dialog";
import { NqButton } from "../button";
import { NqCopyField } from "../copy-button";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqDropdownMenu, NqDropdownMenuContent, NqDropdownMenuItem, NqDropdownMenuSeparator, NqDropdownMenuTrigger } from "../dropdown-menu";
import { NqField, NqFieldDescription, NqFieldError, NqFieldLabel, NqInput } from "../field";
import { NqPasswordInput } from "../password-input";
import { NqSpinner } from "../spinner";
import { NqTagInput } from "../tag-input";
import { EMAIL, fill, STRINGS, type UserActionsMenuLabels } from "./strings";
import type { UserActionResult, UserActionsTarget, UserEditValues, UserLinkResult } from "./types";

// The actions an admin takes on one account: edit email, roles and permissions, impersonate, set a password or send
// a reset link, send a sign-in link, and delete. Each action shows only when you pass its handler. It owns its
// dialogs: confirmations for impersonate and delete, and a copyable link when the server returns one.
interface Props {
  user: UserActionsTarget;
  /** `"menu"`: a "…" button with a menu. `"toolbar"`: a row of buttons. Default `"menu"`. */
  variant?: "menu" | "toolbar";
  onEdit?: (values: UserEditValues) => Promise<UserActionResult> | UserActionResult;
  /** Asks to confirm first, with an audit warning. */
  onImpersonate?: () => Promise<UserActionResult> | UserActionResult;
  /** Set a password directly. Adds the field to the password dialog. */
  onSetPassword?: (password: string) => Promise<UserActionResult> | UserActionResult;
  /** Create a reset link. Return `{ link }` to show it with a copy button, `{ emailed: true }` when it was emailed. */
  onSendResetLink?: () => Promise<UserLinkResult> | UserLinkResult;
  /** Create a one-time sign-in link. Same result as `onSendResetLink`. */
  onSendMagicLink?: () => Promise<UserLinkResult> | UserLinkResult;
  /** Asks to confirm first. */
  onDelete?: () => Promise<UserActionResult> | UserActionResult;
  /** Offered while typing roles in the edit dialog. */
  roleSuggestions?: readonly string[];
  permissionSuggestions?: readonly string[];
  /** Minimum length for `onSetPassword`. Default 8. */
  minPasswordLength?: number;
  labels?: Partial<UserActionsMenuLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  variant: "menu",
  onEdit: undefined,
  onImpersonate: undefined,
  onSetPassword: undefined,
  onSendResetLink: undefined,
  onSendMagicLink: undefined,
  onDelete: undefined,
  roleSuggestions: undefined,
  permissionSuggestions: undefined,
  minPasswordLength: 8,
  labels: undefined,
});

type Dialogs = "edit" | "impersonate" | "password" | "delete" | null;
type LinkState = { title: string; pending: boolean; result?: UserLinkResult; error?: string } | null;

const nasaq = useNasaq();
const t = computed<UserActionsMenuLabels>(() => ({ ...STRINGS[nasaq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
const name = computed(() => props.user.name || props.user.email);

const open = ref<Dialogs>(null);
const busy = ref(false);
const error = ref<string | null>(null);
const link = ref<LinkState>(null);
const initialEdit = (): UserEditValues => ({ email: props.user.email, roles: [...(props.user.roles ?? [])], permissions: [...(props.user.permissions ?? [])] });
const edit = ref<UserEditValues>(initialEdit());
const emailError = ref<string | null>(null);
const password = ref("");
const passwordError = ref<string | null>(null);
const passwordDone = ref(false);

function show(dialog: Dialogs) {
  error.value = null;
  if (dialog === "edit") {
    edit.value = initialEdit();
    emailError.value = null;
  }
  if (dialog === "password") {
    password.value = "";
    passwordError.value = null;
    passwordDone.value = false;
  }
  open.value = dialog;
}
function close() {
  if (!busy.value) open.value = null;
}
// Keep the edit form in step when the row's user changes underneath a closed dialog.
watch(
  () => props.user,
  () => {
    if (open.value !== "edit") edit.value = initialEdit();
  },
  { deep: true },
);

async function run<T>(fn: () => Promise<T> | T): Promise<{ value?: T; failed?: true }> {
  try {
    return { value: await fn() };
  } catch {
    return { failed: true };
  }
}

/** Runs an action that resolves to `{ error }`; closes the dialog on success. */
async function act(fn: () => Promise<UserActionResult> | UserActionResult, after?: () => void) {
  busy.value = true;
  error.value = null;
  const { value, failed } = await run(fn);
  busy.value = false;
  if (failed || value?.error) {
    error.value = value?.error || t.value.failed;
    return false;
  }
  if (after) after();
  else open.value = null;
  return true;
}

async function linkAction(title: string, fn: () => Promise<UserLinkResult> | UserLinkResult) {
  open.value = null;
  link.value = { title, pending: true };
  const { value, failed } = await run(fn);
  if (failed || value?.error) link.value = { title, pending: false, error: value?.error || t.value.failed };
  else link.value = { title, pending: false, result: value };
}

function saveEdit() {
  if (!EMAIL.test(edit.value.email.trim())) {
    emailError.value = t.value.emailInvalid;
    return;
  }
  void act(() => props.onEdit?.({ ...edit.value, email: edit.value.email.trim() }));
}

function savePassword() {
  if (password.value.length < props.minPasswordLength) {
    passwordError.value = fill(t.value.passwordShort, { min: String(props.minPasswordLength) });
    return;
  }
  void act(
    () => props.onSetPassword?.(password.value),
    () => (passwordDone.value = true),
  );
}

const withPassword = computed(() => Boolean(props.onSetPassword || props.onSendResetLink));
interface Item {
  id: string;
  icon: Component;
  label: string;
  select: () => void;
}
const items = computed<Item[]>(() => {
  const list: (Item | null)[] = [
    props.onEdit ? { id: "edit", icon: Pencil, label: t.value.edit, select: () => show("edit") } : null,
    props.onImpersonate ? { id: "impersonate", icon: UserCog, label: t.value.impersonate, select: () => show("impersonate") } : null,
    withPassword.value ? { id: "password", icon: KeyRound, label: t.value.password, select: () => show("password") } : null,
    props.onSendMagicLink ? { id: "magic-link", icon: Link2, label: t.value.magicLink, select: () => void linkAction(t.value.magicLinkTitle, props.onSendMagicLink!) } : null,
  ];
  return list.filter((i): i is Item => i !== null);
});

const confirming = computed(() => open.value === "impersonate" || open.value === "delete");
// Keep the confirm text while the alert dialog animates closed.
const lastConfirm = ref<"impersonate" | "delete">("impersonate");
watch(open, (next) => {
  if (next === "impersonate" || next === "delete") lastConfirm.value = next;
});
const deleting = computed(() => lastConfirm.value === "delete");
const emailTitle = computed(() => "⁨" + props.user.email + "⁩");
</script>

<template>
  <div data-slot="user-actions-menu" :data-variant="props.variant" :class="cn(props.variant === 'toolbar' ? 'flex flex-wrap items-center gap-2' : 'inline-flex', props.class)">
    <template v-if="props.variant === 'toolbar'">
      <NqButton v-for="item in items" :key="item.id" type="button" variant="secondary" size="sm" :data-action="item.id" @click="item.select">
        <component :is="item.icon" aria-hidden="true" />
        {{ item.label }}
      </NqButton>
      <NqButton v-if="props.onDelete" type="button" variant="secondary" size="sm" class="text-nq-danger-text" data-action="delete" @click="show('delete')">
        <Trash2 aria-hidden="true" />
        {{ t.delete }}
      </NqButton>
    </template>
    <NqDropdownMenu v-else>
      <NqDropdownMenuTrigger as-child>
        <NqButton variant="ghost" size="icon-sm" :aria-label="fill(t.actions, { name })">
          <Ellipsis aria-hidden="true" />
        </NqButton>
      </NqDropdownMenuTrigger>
      <NqDropdownMenuContent align="end" class="min-w-52">
        <NqDropdownMenuItem v-for="item in items" :key="item.id" :data-action="item.id" @select="item.select">
          <component :is="item.icon" aria-hidden="true" />
          {{ item.label }}
        </NqDropdownMenuItem>
        <NqDropdownMenuSeparator v-if="props.onDelete && items.length" />
        <NqDropdownMenuItem v-if="props.onDelete" variant="danger" data-action="delete" @select="show('delete')">
          <Trash2 aria-hidden="true" />
          {{ t.delete }}
        </NqDropdownMenuItem>
      </NqDropdownMenuContent>
    </NqDropdownMenu>

    <NqDialog :open="open === 'edit'" @update:open="(next: boolean) => !next && close()">
      <NqDialogContent class="max-w-lg">
        <form novalidate class="flex flex-col gap-5" @submit.prevent="saveEdit">
          <NqDialogHeader>
            <NqDialogTitle>{{ fill(t.editTitle, { name }) }}</NqDialogTitle>
            <NqDialogDescription>{{ t.editBody }}</NqDialogDescription>
          </NqDialogHeader>
          <div class="flex flex-col gap-4">
            <NqField :invalid="!!emailError">
              <NqFieldLabel>{{ t.email }}</NqFieldLabel>
              <NqInput v-model="edit.email" ltr type="email" autocomplete="off" @update:model-value="emailError = null" />
              <NqFieldError :match="!!emailError">{{ emailError }}</NqFieldError>
            </NqField>
            <NqField>
              <NqFieldLabel>{{ t.roles }}</NqFieldLabel>
              <NqTagInput v-model="edit.roles" :suggestions="props.roleSuggestions" :placeholder="t.tagPlaceholder" add-on-blur />
            </NqField>
            <NqField v-if="props.user.permissions">
              <NqFieldLabel>{{ t.permissions }}</NqFieldLabel>
              <NqTagInput v-model="edit.permissions" :suggestions="props.permissionSuggestions" placeholder="users:read" add-on-blur :input-props="{ dir: 'ltr' }" />
            </NqField>
            <NqAlert v-if="error" tone="danger" role="alert">{{ error }}</NqAlert>
          </div>
          <NqDialogFooter>
            <NqButton type="button" variant="ghost" :disabled="busy" @click="close">{{ t.cancel }}</NqButton>
            <NqButton type="submit" variant="primary" :loading="busy">{{ t.save }}</NqButton>
          </NqDialogFooter>
        </form>
      </NqDialogContent>
    </NqDialog>

    <NqDialog :open="open === 'password'" @update:open="(next: boolean) => !next && close()">
      <NqDialogContent class="max-w-md">
        <form novalidate class="flex flex-col gap-5" @submit.prevent="savePassword">
          <NqDialogHeader>
            <NqDialogTitle>{{ fill(t.passwordTitle, { name }) }}</NqDialogTitle>
            <NqDialogDescription>{{ passwordDone ? null : t.passwordBody }}</NqDialogDescription>
          </NqDialogHeader>
          <NqAlert v-if="passwordDone" tone="success" role="status">{{ t.passwordSet }}</NqAlert>
          <div v-else class="flex flex-col gap-4">
            <NqField v-if="props.onSetPassword" :invalid="!!passwordError">
              <NqFieldLabel>{{ t.newPassword }}</NqFieldLabel>
              <NqPasswordInput v-model="password" name="new-password" autocomplete="new-password" show-strength :aria-invalid="passwordError ? true : undefined" @update:model-value="passwordError = null" />
              <NqFieldError v-if="passwordError" :match="true">{{ passwordError }}</NqFieldError>
              <NqFieldDescription v-else>{{ fill(t.passwordShort, { min: String(props.minPasswordLength) }) }}</NqFieldDescription>
            </NqField>
            <NqAlert v-if="error" tone="danger" role="alert">{{ error }}</NqAlert>
          </div>
          <NqDialogFooter>
            <NqButton v-if="passwordDone" type="button" variant="primary" @click="close">{{ t.done }}</NqButton>
            <template v-else>
              <NqButton type="button" variant="ghost" :disabled="busy" @click="close">{{ t.cancel }}</NqButton>
              <NqButton v-if="props.onSendResetLink" type="button" :variant="props.onSetPassword ? 'secondary' : 'primary'" :disabled="busy" @click="linkAction(t.resetLinkTitle, props.onSendResetLink!)">{{ t.sendReset }}</NqButton>
              <NqButton v-if="props.onSetPassword" type="submit" variant="primary" :loading="busy">{{ t.setPassword }}</NqButton>
            </template>
          </NqDialogFooter>
        </form>
      </NqDialogContent>
    </NqDialog>

    <NqDialog :open="!!link" @update:open="(next: boolean) => !next && !link?.pending && (link = null)">
      <NqDialogContent class="max-w-md">
        <NqDialogHeader>
          <NqDialogTitle>{{ link?.title }}</NqDialogTitle>
          <NqDialogDescription class="sr-only">{{ props.user.email }}</NqDialogDescription>
        </NqDialogHeader>
        <div role="status" :aria-busy="link?.pending || undefined" class="flex flex-col gap-3">
          <p v-if="link?.pending" class="flex items-center gap-2 text-body-sm text-muted-foreground">
            <NqSpinner aria-hidden="true" class="size-4" />
            {{ t.working }}
          </p>
          <NqAlert v-else-if="link?.error" tone="danger">{{ link.error }}</NqAlert>
          <template v-else>
            <NqAlert v-if="link?.result?.emailed" tone="success">{{ fill(t.emailed, { email: emailTitle }) }}</NqAlert>
            <template v-if="link?.result?.link">
              <NqCopyField :value="link.result.link" :label="t.link" />
              <p class="text-caption text-muted-foreground">{{ t.shareOnce }}</p>
            </template>
            <p v-else-if="!link?.result?.emailed" class="text-body-sm text-muted-foreground">{{ t.noLink }}</p>
          </template>
        </div>
        <NqDialogFooter>
          <NqButton type="button" variant="primary" :disabled="link?.pending" @click="link = null">{{ t.done }}</NqButton>
        </NqDialogFooter>
      </NqDialogContent>
    </NqDialog>

    <NqAlertDialog :open="confirming" @update:open="(next: boolean) => !next && close()">
      <NqAlertDialogContent>
        <NqAlertDialogHeader>
          <NqAlertDialogTitle>{{ fill(deleting ? t.deleteTitle : t.impersonateTitle, { name }) }}</NqAlertDialogTitle>
          <NqAlertDialogDescription>{{ deleting ? t.deleteBody : t.impersonateBody }}</NqAlertDialogDescription>
        </NqAlertDialogHeader>
        <NqAlert v-if="error" tone="danger" role="alert">{{ error }}</NqAlert>
        <NqAlertDialogFooter>
          <NqButton variant="ghost" :disabled="busy" @click="close">{{ t.cancel }}</NqButton>
          <NqButton :variant="deleting ? 'danger' : 'primary'" :loading="busy" @click="act(() => (deleting ? props.onDelete?.() : props.onImpersonate?.()))">
            {{ deleting ? t.deleteConfirm : t.impersonateConfirm }}
          </NqButton>
        </NqAlertDialogFooter>
      </NqAlertDialogContent>
    </NqAlertDialog>
  </div>
</template>
