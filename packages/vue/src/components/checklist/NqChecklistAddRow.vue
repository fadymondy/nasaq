<script setup lang="ts">
import { Plus } from "lucide-vue-next";
import { computed, ref } from "vue";
import { NqButton } from "../button";
import { NqInput } from "../field";
import type { Strings } from "./checklist-strings";

// The text box and Add button used for new items and for subtasks.
interface Props {
  placeholder: string;
  label: string;
  t: Strings;
  autofocus?: boolean;
  onSubmit: (text: string) => Promise<boolean>;
}
const props = defineProps<Props>();
const emit = defineEmits<{ cancel: [] }>();
const text = ref("");
const busy = ref(false);
const empty = computed(() => text.value.trim() === "");

async function submit() {
  const value = text.value.trim();
  if (!value || busy.value) return;
  busy.value = true;
  const ok = await props.onSubmit(value);
  busy.value = false;
  if (ok) text.value = "";
}
</script>

<template>
  <form class="flex items-center gap-2" @submit.prevent="submit">
    <NqInput v-model="text" :aria-label="props.label" :placeholder="props.placeholder" :autofocus="props.autofocus" @keydown.esc="emit('cancel')" />
    <NqButton type="submit" variant="secondary" :loading="busy" :disabled="empty">
      <Plus aria-hidden="true" />
      {{ props.t.add }}
    </NqButton>
  </form>
</template>
