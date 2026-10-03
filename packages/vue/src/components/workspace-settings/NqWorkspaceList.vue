<script setup lang="ts">
import { Check, Plus } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAvatar } from "../avatar";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { formatNumber } from "../numeric";
import { NqEmptyState } from "../states";
import { workspaceStrings, type WorkspaceSettingsLabels } from "./strings";
import type { WorkspaceListItem } from "./types";

// Every workspace you belong to, with your role, its size and a button to open it.
const props = defineProps<{
  workspaces: readonly WorkspaceListItem[];
  title?: string;
  onOpen: (workspace: WorkspaceListItem) => void | Promise<void>;
  /** Adds the "New workspace" button. */
  onCreate?: () => void;
  labels?: WorkspaceSettingsLabels;
  class?: HTMLAttributes["class"];
}>();
const nq = useNasaq();
const t = computed(() => ({ ...workspaceStrings(nq.locale.value), ...props.labels }));
const opening = ref<string | null>(null);

async function open(w: WorkspaceListItem) {
  opening.value = w.id;
  try {
    await props.onOpen(w);
  } finally {
    opening.value = null;
  }
}
</script>

<template>
  <section data-slot="workspace-list" :aria-label="title ?? t.listLabel" :class="cn('flex flex-col gap-4', props.class)">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 class="text-h3 text-foreground">{{ title ?? t.listTitle }}</h2>
      <NqButton v-if="onCreate" variant="secondary" @click="onCreate()"><Plus />{{ t.newWorkspace }}</NqButton>
    </div>
    <ul v-if="workspaces.length" :aria-label="t.listLabel" class="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
      <li v-for="w in workspaces" :key="w.id" class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <NqAvatar :name="w.name" :src="w.logo" shape="square" size="lg" />
        <div class="flex min-w-0 flex-1 flex-col">
          <span class="flex items-center gap-2 truncate text-label text-foreground">
            {{ w.name }}
            <NqBadge v-if="w.current" variant="brand"><Check aria-hidden />{{ t.current }}</NqBadge>
          </span>
          <span class="flex flex-wrap items-center gap-x-2 text-caption text-muted-foreground">
            <bdi v-if="w.slug" dir="ltr">{{ w.slug }}</bdi>
            <span v-if="w.members !== undefined">{{ t.members(formatNumber(w.members, nq.locale.value)) }}</span>
          </span>
        </div>
        <NqBadge v-if="w.role" variant="neutral">{{ w.role }}</NqBadge>
        <NqButton size="sm" :variant="w.current ? 'ghost' : 'secondary'" :disabled="w.current" :loading="opening === w.id" @click="open(w)">{{ t.open }}</NqButton>
      </li>
    </ul>
    <NqEmptyState v-else :title="t.listEmpty" :description="t.listEmptyHint">
      <template v-if="onCreate" #actions>
        <NqButton variant="primary" @click="onCreate()"><Plus />{{ t.newWorkspace }}</NqButton>
      </template>
    </NqEmptyState>
  </section>
</template>
