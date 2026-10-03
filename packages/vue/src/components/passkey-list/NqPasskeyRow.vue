<script setup lang="ts">
import { Check, Cloud, KeyRound, Pencil, Smartphone, Trash2, Usb, X } from "lucide-vue-next";
import { computed, nextTick, ref, type Component } from "vue";
import { NqAlertDialog, NqAlertDialogCancel, NqAlertDialogContent, NqAlertDialogDescription, NqAlertDialogFooter, NqAlertDialogHeader, NqAlertDialogTitle, NqAlertDialogTrigger } from "../alert-dialog";
import { NqButton } from "../button";
import { NqInput } from "../field";
import { NqDateTime } from "../numeric";
import type { Passkey, PasskeyKind, PasskeyLabels } from "./labels";

// One passkey: icon, name (or an inline rename form), hints, Rename and Remove. Internal to NqPasskeyList.
interface Props {
  passkey: Passkey;
  t: PasskeyLabels;
  busy: boolean;
  onRename?: (id: string, name: string) => Promise<void | { error?: string }>;
  onRemove?: (id: string) => Promise<void | { error?: string }>;
  onError: (message: string) => void;
}
const props = defineProps<Props>();

const KIND_ICON: Record<PasskeyKind, Component> = { device: Smartphone, synced: Cloud, "security-key": Usb };

const editing = ref(false);
const name = ref(props.passkey.name);
const pending = ref(false);
const error = ref<string | null>(null);
const confirmOpen = ref(false);
const removing = ref(false);
const rowEl = ref<HTMLElement | null>(null);

const Icon = computed(() => KIND_ICON[props.passkey.kind ?? "device"] ?? KeyRound);
const kindLabel = computed(() => (props.passkey.kind === "synced" ? props.t.synced : props.passkey.kind === "security-key" ? props.t.securityKey : props.t.device));

function startEdit() {
  editing.value = true;
  void nextTick(() => rowEl.value?.querySelector<HTMLInputElement>("input")?.focus());
}
function cancelEdit() {
  name.value = props.passkey.name;
  error.value = null;
  editing.value = false;
}
async function save() {
  const next = name.value.trim();
  if (!next || pending.value) return;
  if (next === props.passkey.name) {
    editing.value = false;
    return;
  }
  pending.value = true;
  error.value = null;
  try {
    const result = await props.onRename?.(props.passkey.id, next);
    if (result && result.error) error.value = result.error;
    else editing.value = false;
  } catch {
    error.value = props.t.renameFailed;
  } finally {
    pending.value = false;
  }
}
function setConfirmOpen(next: boolean) {
  if (!removing.value) confirmOpen.value = next;
}
async function confirmRemove() {
  removing.value = true;
  try {
    const result = await props.onRemove?.(props.passkey.id);
    if (result && result.error) props.onError(result.error);
  } catch {
    props.onError(props.t.removeFailed);
  } finally {
    removing.value = false;
    confirmOpen.value = false;
  }
}
</script>

<template>
  <li ref="rowEl" data-slot="passkey-row" class="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border px-4 py-3 first:border-t-0">
    <span class="inline-flex size-9 shrink-0 items-center justify-center rounded-control border border-border bg-secondary text-muted-foreground [&_svg]:size-4">
      <component :is="Icon" aria-hidden="true" />
    </span>
    <div class="flex min-w-0 flex-1 basis-48 flex-col gap-0.5">
      <form v-if="editing" class="flex items-center gap-1.5" @submit.prevent="save">
        <NqInput
          v-model="name"
          :aria-label="props.t.renameLabel"
          :aria-invalid="error ? true : undefined"
          :maxlength="64"
          :disabled="pending"
          class="h-control-sm"
          @keydown.esc.stop="cancelEdit"
        />
        <NqButton type="submit" variant="primary" size="icon-sm" :aria-label="props.t.save" :loading="pending" :disabled="!name.trim()">
          <Check aria-hidden="true" />
        </NqButton>
        <NqButton type="button" variant="ghost" size="icon-sm" :aria-label="props.t.cancel" :disabled="pending" @click="cancelEdit">
          <X aria-hidden="true" />
        </NqButton>
      </form>
      <p v-else class="truncate text-label text-foreground" :title="props.passkey.name">{{ props.passkey.name }}</p>
      <p v-if="error" role="alert" class="text-caption text-nq-danger-text">{{ error }}</p>
      <p class="flex flex-wrap gap-x-2 text-caption text-muted-foreground">
        <span>{{ props.passkey.authenticator ?? kindLabel }}</span>
        <span>{{ props.t.added }} <NqDateTime :value="props.passkey.createdAt" /></span>
        <span v-if="props.passkey.lastUsedAt">{{ props.t.lastUsed }} <NqDateTime :value="props.passkey.lastUsedAt" relative /></span>
        <span v-else>{{ props.t.neverUsed }}</span>
      </p>
    </div>
    <div v-if="!editing" class="flex items-center gap-1">
      <NqButton v-if="props.onRename" type="button" variant="ghost" size="icon-sm" :aria-label="`${props.t.rename}: ${props.passkey.name}`" :disabled="props.busy" @click="startEdit">
        <Pencil aria-hidden="true" />
      </NqButton>
      <NqAlertDialog v-if="props.onRemove" :open="confirmOpen" @update:open="setConfirmOpen">
        <NqAlertDialogTrigger as-child>
          <NqButton variant="ghost" size="icon-sm" :aria-label="`${props.t.remove}: ${props.passkey.name}`" :disabled="props.busy">
            <Trash2 aria-hidden="true" />
          </NqButton>
        </NqAlertDialogTrigger>
        <NqAlertDialogContent>
          <NqAlertDialogHeader>
            <NqAlertDialogTitle>{{ props.t.removeTitle(props.passkey.name) }}</NqAlertDialogTitle>
            <NqAlertDialogDescription>{{ props.t.removeBody }}</NqAlertDialogDescription>
          </NqAlertDialogHeader>
          <NqAlertDialogFooter>
            <NqAlertDialogCancel :disabled="removing">{{ props.t.cancel }}</NqAlertDialogCancel>
            <NqButton data-slot="confirm-button-action" variant="danger" :loading="removing" @click="confirmRemove">{{ props.t.removeConfirm }}</NqButton>
          </NqAlertDialogFooter>
        </NqAlertDialogContent>
      </NqAlertDialog>
    </div>
  </li>
</template>
