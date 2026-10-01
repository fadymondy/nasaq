<script setup lang="ts">
import { provide, ref } from "vue";
import { useT } from "../../provider";
import {
  NqAlertDialog,
  NqAlertDialogCancel,
  NqAlertDialogContent,
  NqAlertDialogDescription,
  NqAlertDialogFooter,
  NqAlertDialogHeader,
  NqAlertDialogTitle,
} from "../alert-dialog";
import { NqButton } from "../button";
import { CONFIRM_KEY, type ConfirmFn, type ConfirmOptions } from "./confirm";

// Holds one AlertDialog for the whole app, so any handler can `await confirm({...})` before it acts.
// Mount it once, inside NasaqProvider.
const t = useT();
const options = ref<ConfirmOptions | null>(null);
const open = ref(false);
let resolver: ((value: boolean) => void) | null = null;

function settle(value: boolean) {
  resolver?.(value);
  resolver = null;
  open.value = false;
}

const confirm: ConfirmFn = (next) => {
  // A second request while one is open cancels the first.
  resolver?.(false);
  options.value = next;
  open.value = true;
  return new Promise<boolean>((resolve) => {
    resolver = resolve;
  });
};
provide(CONFIRM_KEY, confirm);
</script>

<template>
  <slot />
  <NqAlertDialog :open="open" @update:open="(next: boolean) => !next && settle(false)">
    <NqAlertDialogContent data-slot="confirm-dialog">
      <NqAlertDialogHeader>
        <NqAlertDialogTitle>{{ options?.title }}</NqAlertDialogTitle>
        <NqAlertDialogDescription v-if="options?.description">{{ options.description }}</NqAlertDialogDescription>
      </NqAlertDialogHeader>
      <NqAlertDialogFooter>
        <NqAlertDialogCancel>{{ options?.cancelLabel ?? t("Cancel", "إلغاء") }}</NqAlertDialogCancel>
        <NqButton :variant="options?.danger === false ? 'primary' : 'danger'" @click="settle(true)">
          {{ options?.confirmLabel ?? t("Confirm", "تأكيد") }}
        </NqButton>
      </NqAlertDialogFooter>
    </NqAlertDialogContent>
  </NqAlertDialog>
</template>
