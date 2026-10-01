<script setup lang="ts">
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger } from "../select";
import { NqStatus } from "../status";
import type { ProviderCapability, ProviderOption, ProviderSwitcherLabels } from "./types";

// Lists an app's swappable capabilities (data, queue, cache, storage…) with the backend each one runs on,
// and lets an operator switch backends at runtime. Rows on their configured default say so; switched rows
// are marked as overridden.
interface Props {
  capabilities: readonly ProviderCapability[];
  /**
   * Switch a capability to another backend. Return a promise to show the row as busy until it settles.
   * Use it as `@select="..."`; leave it out for a read-only view.
   */
  onSelect?: (capability: string, backend: string) => void | Promise<void>;
  /** Override the built-in strings. */
  labels?: Partial<ProviderSwitcherLabels>;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();

const STRINGS = {
  en: {
    capability: "Capability",
    backend: "Backend",
    isDefault: "Default",
    overridden: "Overridden",
    empty: "No swappable capabilities.",
    choose: (capability: string) => `Backend for ${capability}`,
  },
  ar: {
    capability: "القدرة",
    backend: "المزوّد",
    isDefault: "افتراضي",
    overridden: "مُعدَّل",
    empty: "لا توجد قدرات قابلة للتبديل.",
    choose: (capability: string) => `مزوّد ${capability}`,
  },
};

const nasaq = useNasaq();
const t = computed(() => ({ ...STRINGS[nasaq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
const busy = ref<string | null>(null);

const toOption = (o: string | ProviderOption): ProviderOption => (typeof o === "string" ? { id: o } : o);
const rows = computed(() =>
  props.capabilities.map((row) => {
    const options = row.options.map(toOption);
    return { row, options, name: row.label ?? row.capability };
  }),
);

async function change(capability: string, backend: string) {
  if (!props.onSelect) return;
  busy.value = capability;
  try {
    await props.onSelect(capability, backend);
  } finally {
    busy.value = null;
  }
}
</script>

<template>
  <div
    v-if="props.capabilities.length === 0"
    data-slot="provider-switcher"
    :class="cn('rounded-card border border-border p-6 text-center text-body-sm text-muted-foreground', props.class)"
  >
    {{ t.empty }}
  </div>
  <div v-else data-slot="provider-switcher" :class="cn('overflow-hidden rounded-card border border-border bg-card', props.class)">
    <div
      aria-hidden="true"
      class="hidden grid-cols-[minmax(0,1fr)_minmax(10rem,14rem)] gap-4 border-b border-border px-4 py-2 text-caption text-muted-foreground sm:grid"
    >
      <span>{{ t.capability }}</span>
      <span>{{ t.backend }}</span>
    </div>
    <ul class="divide-y divide-border">
      <li
        v-for="{ row, options, name } in rows"
        :key="row.capability"
        data-slot="provider-switcher-row"
        :data-capability="row.capability"
        :aria-busy="busy === row.capability || undefined"
        class="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(10rem,14rem)] sm:items-center sm:gap-4"
      >
        <div class="flex min-w-0 flex-col gap-0.5">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-label text-foreground">{{ row.label ?? row.capability }}</span>
            <template v-if="row.isDefault !== undefined">
              <NqStatus v-if="row.isDefault" tone="neutral">{{ t.isDefault }}</NqStatus>
              <NqStatus v-else tone="info">{{ t.overridden }}</NqStatus>
            </template>
          </div>
          <p v-if="row.description" class="text-caption text-muted-foreground">{{ row.description }}</p>
        </div>
        <NqSelect
          :model-value="row.active"
          :disabled="!props.onSelect || row.locked || busy === row.capability"
          @update:model-value="(v) => v && String(v) !== row.active && change(row.capability, String(v))"
        >
          <NqSelectTrigger data-slot="provider-switcher-select" :aria-label="t.choose(name)" class="w-full">
            <span data-slot="select-value" class="min-w-0 flex-1 truncate text-start">{{
              options.find((o) => o.id === row.active)?.label ?? row.active
            }}</span>
          </NqSelectTrigger>
          <NqSelectContent>
            <NqSelectItem v-for="o in options" :key="o.id" :value="o.id" :disabled="o.disabled">
              <span class="flex flex-col">
                <span>{{ o.label ?? o.id }}</span>
                <span v-if="o.description" class="text-caption text-muted-foreground">{{ o.description }}</span>
              </span>
            </NqSelectItem>
          </NqSelectContent>
        </NqSelect>
      </li>
    </ul>
  </div>
</template>
