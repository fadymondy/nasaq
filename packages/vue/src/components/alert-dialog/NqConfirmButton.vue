<script setup lang="ts">
import { computed, ref, Text, useSlots } from "vue";
import { useT } from "../../provider";
import { NqButton } from "../button";
import NqAlertDialog from "./NqAlertDialog.vue";
import NqAlertDialogCancel from "./NqAlertDialogCancel.vue";
import NqAlertDialogContent from "./NqAlertDialogContent.vue";
import NqAlertDialogDescription from "./NqAlertDialogDescription.vue";
import NqAlertDialogFooter from "./NqAlertDialogFooter.vue";
import NqAlertDialogHeader from "./NqAlertDialogHeader.vue";
import NqAlertDialogTitle from "./NqAlertDialogTitle.vue";
import NqAlertDialogTrigger from "./NqAlertDialogTrigger.vue";

// A button that asks before it acts: renders a button that opens an AlertDialog. The default slot is the trigger label.
interface Props {
  /** The question: "Delete this project?". Name what is affected. */
  title: string;
  /** What happens and whether it can be undone. */
  description?: string;
  /** Label of the confirming button. Default: the trigger label when it is plain text, else "Confirm" / "تأكيد". */
  confirmLabel?: string;
  /** Label of the cancel button. Default "Cancel" / "إلغاء" by the Nasaq locale. */
  cancelLabel?: string;
  /**
   * Runs when the user confirms. Return a promise to keep the dialog open with a loading confirm
   * button until it settles; the dialog closes on resolve and stays open on reject.
   */
  onConfirm: () => void | Promise<unknown>;
  /** Shared by the trigger and the confirm button. Default "danger". */
  variant?: "primary" | "secondary" | "ghost" | "danger" | "link";
  size?: "sm" | "md" | "lg" | "icon" | "icon-sm";
  disabled?: boolean;
}
const props = withDefaults(defineProps<Props>(), { variant: "danger" });
const t = useT();
const slots = useSlots();
const open = ref(false);
const pending = ref(false);

const triggerText = computed(() => {
  const nodes = slots.default?.() ?? [];
  const only = nodes.length === 1 ? nodes[0] : undefined;
  return only && only.type === Text && typeof only.children === "string" ? only.children.trim() : undefined;
});

function setOpen(next: boolean) {
  if (!pending.value) open.value = next;
}

async function confirm() {
  try {
    const result = props.onConfirm();
    if (result && typeof (result as Promise<unknown>).then === "function") {
      pending.value = true;
      await result;
    }
    open.value = false;
  } catch {
    // The host reports the failure; the dialog stays open so the user can retry or cancel.
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <NqAlertDialog :open="open" @update:open="setOpen">
    <NqAlertDialogTrigger as-child>
      <NqButton :variant="props.variant" :size="props.size" :disabled="props.disabled"><slot /></NqButton>
    </NqAlertDialogTrigger>
    <NqAlertDialogContent>
      <NqAlertDialogHeader>
        <NqAlertDialogTitle>{{ props.title }}</NqAlertDialogTitle>
        <NqAlertDialogDescription v-if="props.description">{{ props.description }}</NqAlertDialogDescription>
      </NqAlertDialogHeader>
      <NqAlertDialogFooter>
        <NqAlertDialogCancel :disabled="pending">{{ props.cancelLabel ?? t("Cancel", "إلغاء") }}</NqAlertDialogCancel>
        <NqButton data-slot="confirm-button-action" :variant="props.variant" :loading="pending" @click="confirm">
          {{ props.confirmLabel ?? triggerText ?? t("Confirm", "تأكيد") }}
        </NqButton>
      </NqAlertDialogFooter>
    </NqAlertDialogContent>
  </NqAlertDialog>
</template>
