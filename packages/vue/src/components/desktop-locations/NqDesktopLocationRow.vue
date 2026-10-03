<script setup lang="ts">
import { FolderOpen, FolderX, RefreshCw, Star, Trash2 } from "lucide-vue-next";
import { computed, useId } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqDateTime } from "../numeric";
import { NqStatus, type StatusTone } from "../status";
import { NqSwitch } from "../switch";
import { baseName } from "./location-path";
import type { DesktopLocationsLabels } from "./strings";
import type { DesktopLocation, DesktopLocationPermissions, DesktopLocationStatus } from "./types";

// One folder: path, status, file count and the three permission switches. Internal to NqDesktopLocations.
interface Props {
  location: DesktopLocation;
  busy: boolean;
  t: DesktopLocationsLabels;
  canPermissions: boolean;
  canRemove: boolean;
  canMakeDefault: boolean;
  canReindex: boolean;
}
const props = defineProps<Props>();
const emit = defineEmits<{ permissions: [value: DesktopLocationPermissions]; remove: []; makeDefault: []; reindex: [] }>();

const STATUS_TONE: Record<DesktopLocationStatus, StatusTone> = {
  ready: "success",
  indexing: "info",
  missing: "danger",
  "not-directory": "danger",
  denied: "warning",
};
const id = useId();
const name = computed(() => props.location.label?.trim() || baseName(props.location.path));
const usable = computed(() => props.location.status === "ready" || props.location.status === "indexing");
const broken = computed(() => props.location.status === "missing" || props.location.status === "not-directory");
const perms = computed(() => props.location.permissions);
const toggles = computed(() => [
  { key: "read" as const, label: props.t.read, hint: props.t.readHint },
  { key: "write" as const, label: props.t.write, hint: props.t.writeHint },
  { key: "index" as const, label: props.t.index, hint: props.t.indexHint },
]);
function toggle(key: keyof DesktopLocationPermissions, checked: boolean) {
  emit("permissions", { ...perms.value, [key]: checked, ...(key === "read" && !checked ? { write: false, index: false } : {}) });
}
</script>

<template>
  <li data-slot="desktop-location" :data-status="props.location.status" class="flex flex-col gap-3 border-b border-border px-4 py-3 last:border-b-0">
    <div class="flex flex-wrap items-start gap-3">
      <span :class="cn('mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-control border border-border bg-secondary [&_svg]:size-4.5', broken ? 'text-nq-danger-text' : 'text-muted-foreground')">
        <component :is="broken ? FolderX : FolderOpen" aria-hidden="true" />
      </span>
      <div class="flex min-w-0 flex-1 flex-col gap-1">
        <div class="flex min-w-0 flex-wrap items-center gap-2">
          <bdi dir="auto" class="truncate text-label text-foreground">{{ name }}</bdi>
          <NqBadge v-if="props.location.primary" variant="accent"><Star aria-hidden="true" />{{ props.t.primary }}</NqBadge>
          <NqStatus :tone="STATUS_TONE[props.location.status]">{{ props.t.status[props.location.status] }}</NqStatus>
        </div>
        <bdi dir="ltr" :title="props.location.path" class="block break-all font-mono text-code text-muted-foreground">{{ props.location.path }}</bdi>
        <span v-if="usable" class="text-caption text-muted-foreground">
          <template v-if="props.location.fileCount !== undefined">
            <bdi>{{ props.t.files(props.location.fileCount) }}</bdi>{{ !perms.index || props.location.indexedAt ? " · " : "" }}
          </template>
          <template v-if="perms.index && props.location.indexedAt">{{ props.t.indexed }} <NqDateTime :value="props.location.indexedAt" relative /></template>
          <template v-else-if="!perms.index">{{ props.t.notIndexed }}</template>
        </span>
      </div>
      <div class="flex shrink-0 items-center gap-0.5">
        <NqButton v-if="props.canMakeDefault && !props.location.primary && usable" variant="ghost" size="icon-sm" :disabled="props.busy" :aria-label="props.t.makeDefault(name)" :title="props.t.makeDefault(name)" @click="emit('makeDefault')">
          <Star aria-hidden="true" />
        </NqButton>
        <NqButton v-if="props.canReindex && usable && perms.index" variant="ghost" size="icon-sm" :disabled="props.busy || props.location.status === 'indexing'" :aria-label="props.t.reindex(name)" :title="props.t.reindex(name)" @click="emit('reindex')">
          <RefreshCw aria-hidden="true" :class="cn(props.location.status === 'indexing' && 'motion-safe:animate-spin')" />
        </NqButton>
        <NqButton v-if="props.canRemove" variant="ghost" size="icon-sm" :disabled="props.busy" :aria-label="props.t.remove(name)" :title="props.t.remove(name)" class="text-nq-danger-text" @click="emit('remove')">
          <Trash2 aria-hidden="true" />
        </NqButton>
      </div>
    </div>
    <div role="group" :aria-label="`${props.t.permissions}: ${name}`" class="grid gap-2 sm:grid-cols-3">
      <div v-for="x in toggles" :key="x.key" class="flex items-center justify-between gap-3 rounded-control border border-border px-3 py-2">
        <label :for="`${id}-${x.key}`" class="flex min-w-0 flex-col">
          <span class="text-body-sm text-foreground">{{ x.label }}</span>
          <span class="truncate text-caption text-muted-foreground">{{ x.hint }}</span>
        </label>
        <NqSwitch :id="`${id}-${x.key}`" :model-value="perms[x.key]" :disabled="props.busy || !usable || !props.canPermissions" @update:model-value="(c: boolean) => toggle(x.key, c)" />
      </div>
    </div>
  </li>
</template>
