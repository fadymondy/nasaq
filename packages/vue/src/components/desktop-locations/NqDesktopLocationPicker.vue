<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { baseName, shortenPath } from "./location-path";
import { useLabels, type DesktopLocationsLabels } from "./strings";
import type { DesktopLocation, DesktopLocationPermissions } from "./types";

// A select for choosing one of the locations, e.g. where to save or which folder to open. Broken, denied or
// permission-less ones are listed but disabled.
interface Props {
  locations: readonly DesktopLocation[];
  /** The chosen location id: `v-model`. */
  modelValue?: string | null;
  /** Only locations with this permission are selectable (default `read`). */
  requires?: keyof DesktopLocationPermissions;
  disabled?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  labels?: Partial<DesktopLocationsLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { modelValue: undefined, requires: "read", placeholder: undefined, ariaLabel: undefined, labels: undefined });
const emit = defineEmits<{ "update:modelValue": [id: string]; change: [id: string, location: DesktopLocation] }>();
const t = useLabels(() => props.labels);
const name = (l: DesktopLocation) => l.label?.trim() || baseName(l.path);
const usable = (l: DesktopLocation) => (l.status === "ready" || l.status === "indexing") && l.permissions[props.requires];
const any = computed(() => props.locations.some(usable));
function pick(v: string | number | null) {
  const found = props.locations.find((l) => l.id === v);
  if (v && found) {
    emit("update:modelValue", String(v));
    emit("change", String(v), found);
  }
}
</script>

<template>
  <NqSelect :model-value="props.modelValue ?? undefined" :disabled="props.disabled || !any" @update:model-value="pick">
    <NqSelectTrigger :class="props.class" :aria-label="props.ariaLabel ?? t.pick">
      <NqSelectValue :placeholder="any ? (props.placeholder ?? t.pick) : t.pickEmpty" />
    </NqSelectTrigger>
    <NqSelectContent>
      <NqSelectItem v-for="l in props.locations" :key="l.id" :value="l.id" :disabled="!usable(l)">
        <span class="flex min-w-0 flex-col">
          <span class="truncate">
            <bdi dir="auto">{{ name(l) }}</bdi>
            <span v-if="!usable(l)" class="ms-2 text-caption text-muted-foreground">{{ t.unavailable }}</span>
          </span>
          <bdi dir="ltr" class="truncate font-mono text-caption text-muted-foreground">{{ shortenPath(l.path, 40) }}</bdi>
        </span>
      </NqSelectItem>
    </NqSelectContent>
  </NqSelect>
</template>
