<script setup lang="ts">
import { ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { useExtensionStrings, type ExtensionPopupLabels } from "./strings";
import type { ExtensionOptionsSection } from "./types";

// The extension's options page: a centred column of titled sections and a save bar that says what state it is in.
// Each section's body is the slot named after its `id`; the mark and name above the title is the `brand` slot.
interface Props {
  title: string;
  description?: string;
  sections: readonly ExtensionOptionsSection[];
  /** Shows a sticky save bar. `dirty` says whether there is anything to save. */
  onSave?: () => Promise<void | { error?: string }>;
  dirty?: boolean;
  labels?: ExtensionPopupLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { description: undefined, onSave: undefined, dirty: undefined, labels: undefined });
const slots = defineSlots<Record<string, (() => unknown) | undefined>>();
const { t } = useExtensionStrings(() => props.labels);
const saving = ref(false);
const error = ref<string | null>(null);

async function save() {
  saving.value = true;
  error.value = null;
  try {
    const result = await props.onSave?.();
    if (result?.error) error.value = result.error;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div data-slot="extension-options" :class="cn('mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 text-foreground sm:p-6', props.class)">
    <header class="flex flex-col gap-1">
      <div v-if="slots.brand" class="mb-2 flex items-center gap-2 text-label font-semibold"><slot name="brand" /></div>
      <h1 class="text-h1">{{ props.title }}</h1>
      <p v-if="props.description" class="text-body text-muted-foreground">{{ props.description }}</p>
    </header>
    <section v-for="section in props.sections" :key="section.id" :aria-labelledby="`${section.id}-title`" class="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div class="flex flex-col gap-0.5">
        <h2 :id="`${section.id}-title`" class="text-h3">{{ section.title }}</h2>
        <p v-if="section.description" class="text-caption text-muted-foreground">{{ section.description }}</p>
      </div>
      <slot :name="section.id" />
    </section>
    <div v-if="props.onSave" class="sticky bottom-0 flex items-center gap-3 border-t border-border bg-background/90 py-3 backdrop-blur">
      <NqButton variant="primary" :loading="saving" :disabled="!props.dirty" @click="save">{{ t.save }}</NqButton>
      <span role="status" :class="cn('text-caption', error ? 'text-nq-danger-text' : 'text-muted-foreground')">{{ error ?? (props.dirty ? t.unsaved : t.saved) }}</span>
    </div>
  </div>
</template>
