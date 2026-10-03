<script setup lang="ts">
import { Pause } from "lucide-vue-next";
import { ref, watch } from "vue";
import { NqButton } from "../button";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqInput } from "../field";
import type { PosRegisterStrings } from "./strings";

// The small form that parks the basket with an optional note.
const props = defineProps<{ open: boolean; t: PosRegisterStrings }>();
const emit = defineEmits<{ "update:open": [open: boolean]; park: [note: string] }>();

const note = ref("");
watch(
  () => props.open,
  (open) => {
    if (open) note.value = "";
  },
  { immediate: true },
);
</script>

<template>
  <NqDialog :open="props.open" @update:open="(o: boolean) => emit('update:open', o)">
    <NqDialogContent class="max-w-md">
      <form class="flex flex-col gap-4" @submit.prevent="emit('park', note.trim())">
        <NqDialogHeader>
          <NqDialogTitle>{{ props.t.holdTitle }}</NqDialogTitle>
          <NqDialogDescription>{{ props.t.holdText }}</NqDialogDescription>
        </NqDialogHeader>
        <label class="flex flex-col gap-1.5 text-label text-foreground">
          {{ props.t.note }}
          <NqInput v-model="note" :placeholder="props.t.notePlaceholder" maxlength="80" autocomplete="off" />
        </label>
        <NqDialogFooter>
          <NqButton type="button" variant="secondary" @click="emit('update:open', false)">{{ props.t.cancel }}</NqButton>
          <NqButton type="submit" variant="primary">
            <Pause aria-hidden="true" />
            {{ props.t.park }}
          </NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
