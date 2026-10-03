<script setup lang="ts">
import { FolderPlus, FolderSearch } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqEmptyState, NqLoadingState } from "../states";
import NqDesktopLocationAddDialog from "./NqDesktopLocationAddDialog.vue";
import NqDesktopLocationRemoveDialog from "./NqDesktopLocationRemoveDialog.vue";
import NqDesktopLocationRow from "./NqDesktopLocationRow.vue";
import { useLabels, type DesktopLocationsLabels } from "./strings";
import type { DesktopLocation, DesktopLocationPermissions, LocationResult } from "./types";

// The folders a desktop app may touch (workspace roots): each with its path, status and per-folder permissions
// (read, write, search index), plus add, remove, make default and re-index. It has no filesystem access:
// your callbacks talk to the desktop bridge. Each action may resolve `{ error }` (or throw) to show a message.
interface Props {
  locations: readonly DesktopLocation[];
  /** Add a folder with the chosen permissions. Resolve `{ error }` to keep the dialog open with a message. */
  onAdd?: (path: string, permissions: DesktopLocationPermissions) => Promise<LocationResult> | LocationResult;
  /** Remove a location (after a confirm). Files on disk are not touched. */
  onRemove?: (id: string) => Promise<LocationResult> | LocationResult;
  onPermissionsChange?: (id: string, permissions: DesktopLocationPermissions) => Promise<LocationResult> | LocationResult;
  /** Shows "Make default" on the other locations. */
  onMakeDefault?: (id: string) => Promise<LocationResult> | LocationResult;
  /** Shows a refresh button on ready locations that have the search index on. */
  onReindex?: (id: string) => Promise<LocationResult> | LocationResult;
  /** Opens the system folder picker (the desktop bridge) and resolves the chosen path, or null when cancelled. Shows a Browse button. */
  onBrowse?: () => Promise<string | null>;
  loading?: boolean;
  title?: string;
  description?: string;
  labels?: Partial<DesktopLocationsLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  onAdd: undefined,
  onRemove: undefined,
  onPermissionsChange: undefined,
  onMakeDefault: undefined,
  onReindex: undefined,
  onBrowse: undefined,
  loading: false,
  title: undefined,
  description: undefined,
  labels: undefined,
});

const t = useLabels(() => props.labels);
const adding = ref(false);
const removing = ref<DesktopLocation | null>(null);
const busy = ref<string | null>(null);
const error = ref<string | null>(null);
const hasDefault = computed(() => props.locations.some((l) => l.primary));

async function run(id: string, action: () => Promise<LocationResult> | LocationResult) {
  busy.value = id;
  error.value = null;
  try {
    const result = await action();
    if (result?.error) error.value = result.error;
  } catch {
    error.value = t.value.genericError;
  } finally {
    busy.value = null;
  }
}
</script>

<template>
  <section data-slot="desktop-locations" :aria-label="props.title ?? t.title" :class="cn('flex min-w-0 flex-col gap-4', props.class)">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div class="flex min-w-0 flex-col gap-1">
        <h3 class="text-h3 text-foreground">{{ props.title ?? t.title }}</h3>
        <p class="max-w-prose text-body-sm text-muted-foreground">{{ props.description ?? t.description }}</p>
      </div>
      <NqButton v-if="props.onAdd" size="sm" variant="primary" @click="adding = true"><FolderPlus aria-hidden="true" />{{ t.add }}</NqButton>
    </header>

    <NqAlert v-if="error" tone="danger" role="alert" dismissible @dismiss="error = null">{{ error }}</NqAlert>

    <NqLoadingState v-if="props.loading" :label="t.loading" :rows="3" />
    <NqEmptyState v-else-if="props.locations.length === 0" :icon="FolderSearch" :title="t.emptyTitle" :description="t.emptyBody">
      <template v-if="props.onAdd" #actions>
        <NqButton variant="primary" @click="adding = true"><FolderPlus aria-hidden="true" />{{ t.add }}</NqButton>
      </template>
    </NqEmptyState>
    <template v-else>
      <ul :aria-label="t.list" class="m-0 flex list-none flex-col overflow-hidden rounded-card border border-border bg-card p-0">
        <NqDesktopLocationRow
          v-for="l in props.locations"
          :key="l.id"
          :location="l"
          :busy="busy === l.id"
          :t="t"
          :can-permissions="!!props.onPermissionsChange"
          :can-remove="!!props.onRemove"
          :can-make-default="!!props.onMakeDefault"
          :can-reindex="!!props.onReindex"
          @permissions="(p) => run(l.id, () => props.onPermissionsChange!(l.id, p))"
          @remove="removing = l"
          @make-default="run(l.id, () => props.onMakeDefault!(l.id))"
          @reindex="run(l.id, () => props.onReindex!(l.id))"
        />
      </ul>
      <p class="text-caption text-muted-foreground">{{ t.count(props.locations.length) }}{{ hasDefault || props.onMakeDefault ? ` · ${t.defaultHint}` : "" }}</p>
    </template>

    <NqDesktopLocationAddDialog v-if="adding && props.onAdd" :existing="props.locations.map((l) => l.path)" :on-add="props.onAdd" :on-browse="props.onBrowse" :t="t" @close="adding = false" />
    <NqDesktopLocationRemoveDialog v-if="removing && props.onRemove" :location="removing" :on-confirm="() => props.onRemove!(removing!.id)" :t="t" @close="removing = null" />
  </section>
</template>
