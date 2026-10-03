<script setup lang="ts">
import { computed, ref, type HTMLAttributes } from "vue";
import { useNasaq } from "../../provider";
import { NqAlertDialog, NqAlertDialogCancel, NqAlertDialogContent, NqAlertDialogDescription, NqAlertDialogFooter, NqAlertDialogHeader, NqAlertDialogTitle, NqAlertDialogTrigger } from "../alert-dialog";
import { NqButton } from "../button";
import { NqField, NqFieldDescription, NqFieldLabel, NqInput } from "../field";
import NqSettingsSection from "./NqSettingsSection.vue";
import { strings } from "./strings";

// The account-deletion block. The button opens an alert dialog that asks for a typed phrase before the red button
// enables, so it cannot be done by a stray Enter. `onDelete` is yours: call the API, sign out.
interface Props {
  /** Heading of the section. Default "Danger zone". */
  title?: string;
  /** Bold line of the row. Default "Delete account". */
  heading?: string;
  /** What deleting does and that it cannot be undone. */
  description?: string;
  /** The phrase to type before deleting: an email, a username, or the default word. Default "DELETE" / "حذف". */
  confirmText?: string;
  /** Deletes the account. Reject to keep the dialog open and show the error message. */
  onDelete: () => Promise<void>;
  /** Override any built-in English or Arabic string. */
  labels?: Partial<{
    button: string;
    confirmTitle: string;
    confirmDescription: string;
    confirmPrompt: (text: string) => string;
    confirmAction: string;
    cancel: string;
    failed: string;
  }>;
  headingLevel?: 2 | 3 | 4;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { title: undefined, heading: undefined, description: undefined, confirmText: undefined, labels: undefined, headingLevel: 2 });

const nq = useNasaq();
const t = computed(() => strings(nq.locale.value));
const phrase = computed(() => props.confirmText ?? t.value.confirmText);
const open = ref(false);
const typed = ref("");
const busy = ref(false);
const error = ref<string | null>(null);
const matches = computed(() => typed.value.trim() === phrase.value);

function reset() {
  typed.value = "";
  error.value = null;
}

function setOpen(next: boolean) {
  if (busy.value) return;
  open.value = next;
  if (!next) reset();
}

async function remove() {
  if (!matches.value || busy.value) return;
  busy.value = true;
  error.value = null;
  try {
    await props.onDelete();
    open.value = false;
    reset();
  } catch (e) {
    error.value = e instanceof Error && e.message ? e.message : (props.labels?.failed ?? t.value.deleteFailed);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <NqSettingsSection tone="danger" data-slot="danger-zone" :title="props.title ?? t.danger" :heading-level="props.headingLevel" :class="props.class">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="min-w-0">
        <p class="text-label text-foreground">{{ props.heading ?? t.dangerTitle }}</p>
        <p class="text-body-sm text-muted-foreground">{{ props.description ?? t.dangerDescription }}</p>
      </div>
      <NqAlertDialog :open="open" @update:open="setOpen">
        <NqAlertDialogTrigger as-child>
          <NqButton variant="danger" class="shrink-0">{{ props.labels?.button ?? t.dangerButton }}</NqButton>
        </NqAlertDialogTrigger>
        <NqAlertDialogContent>
          <form novalidate class="grid gap-4" @submit.prevent="remove">
            <NqAlertDialogHeader>
              <NqAlertDialogTitle>{{ props.labels?.confirmTitle ?? t.confirmTitle }}</NqAlertDialogTitle>
              <NqAlertDialogDescription>{{ props.labels?.confirmDescription ?? t.confirmDescription }}</NqAlertDialogDescription>
            </NqAlertDialogHeader>
            <NqField :invalid="!!error">
              <NqFieldLabel>{{ (props.labels?.confirmPrompt ?? t.confirmPrompt)("⁨" + phrase + "⁩") }}</NqFieldLabel>
              <NqInput
                v-model="typed"
                ltr
                name="confirm-delete"
                autocomplete="off"
                autocapitalize="none"
                autocorrect="off"
                :spellcheck="false"
                :disabled="busy"
                @update:model-value="error = null"
              />
              <NqFieldDescription v-if="error" role="alert" class="text-nq-danger-text">{{ error }}</NqFieldDescription>
            </NqField>
            <NqAlertDialogFooter>
              <NqAlertDialogCancel :disabled="busy">{{ props.labels?.cancel ?? t.cancel }}</NqAlertDialogCancel>
              <NqButton type="submit" variant="danger" :loading="busy" :disabled="!matches">{{ props.labels?.confirmAction ?? t.confirmAction }}</NqButton>
            </NqAlertDialogFooter>
          </form>
        </NqAlertDialogContent>
      </NqAlertDialog>
    </div>
  </NqSettingsSection>
</template>
