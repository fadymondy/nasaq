<script setup lang="ts">
import { computed, ref, type HTMLAttributes } from "vue";
import { useNasaq } from "../../provider";
import { NqBadge } from "../badge";
import { NqCatalogStore, type CatalogCategory, type CatalogItem, type CatalogLabels, type CatalogResult } from "../catalog-store";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import { NqWorkflowNetwork } from "../workflow-network";
import { WORKFLOW_MARKETPLACE_STRINGS, type WorkflowListing, type WorkflowListingKind, type WorkflowMarketplaceLabels } from "./types";

// The store of workflow steps and ready-made presets. Steps show what they take, give and ask for; presets show the
// diagram they install. It is a thin layer over NqCatalogStore.
interface Props {
  listings: WorkflowListing[];
  categories: CatalogCategory[];
  /** Install a step into the workspace's palette or a preset as a new workflow. */
  onInstall?: (listing: WorkflowListing) => Promise<CatalogResult>;
  onUninstall?: (listing: WorkflowListing) => Promise<CatalogResult>;
  /** The "Open" action once installed (open the builder). */
  onOpen?: (listing: WorkflowListing) => void;
  class?: HTMLAttributes["class"];
  labels?: Partial<WorkflowMarketplaceLabels> & { store?: Partial<CatalogLabels> };
}
const props = withDefaults(defineProps<Props>(), { onInstall: undefined, onUninstall: undefined, onOpen: undefined, labels: undefined });
defineOptions({ inheritAttrs: false });

const nasaq = useNasaq();
const ar = computed(() => nasaq.locale.value.startsWith("ar"));
const t = computed(() => {
  const { store: _store, ...own } = props.labels ?? {};
  return { ...WORKFLOW_MARKETPLACE_STRINGS[ar.value ? "ar" : "en"], ...own } as WorkflowMarketplaceLabels;
});
const kind = ref<"all" | WorkflowListingKind>("all");
const byId = computed(() => new Map(props.listings.map((l) => [l.id, l])));
const shown = computed<CatalogItem[]>(() => {
  const list = kind.value === "all" ? props.listings : props.listings.filter((l) => l.kind === kind.value);
  return list.map((l): CatalogItem => {
    const { kind: k, step: _step, preset: _preset, ...rest } = l;
    return { ...rest, badge: k === "preset" ? (ar.value ? "قالب" : "Preset") : l.step?.role === "trigger" ? t.value.trigger : t.value.action };
  });
});
const back = (item: CatalogItem) => byId.value.get(item.id) as WorkflowListing;
const enNumber = new Intl.NumberFormat("en");
const listing = (item: CatalogItem) => byId.value.get(item.id);
const takesGives = (l: WorkflowListing) =>
  [
    [t.value.inputs, l.step?.inputs],
    [t.value.outputs, l.step?.outputs],
  ] as const;
function setKind(v: string[]) {
  if (v[0]) kind.value = v[0] as "all" | WorkflowListingKind;
}
</script>

<template>
  <NqCatalogStore
    v-bind="$attrs"
    :class="props.class"
    :items="shown"
    :categories="props.categories"
    :on-install="props.onInstall ? (i: CatalogItem) => props.onInstall!(back(i)) : undefined"
    :on-uninstall="props.onUninstall ? (i: CatalogItem) => props.onUninstall!(back(i)) : undefined"
    :on-open="props.onOpen ? (i: CatalogItem) => props.onOpen!(back(i)) : undefined"
    :labels="props.labels?.store"
  >
    <template #toolbar-start>
      <NqToggleGroup :model-value="[kind]" :aria-label="t.kindLabel" @update:model-value="setKind">
        <NqToggle value="all">{{ t.kindAll }}</NqToggle>
        <NqToggle value="step">{{ t.kindStep }}</NqToggle>
        <NqToggle value="preset">{{ t.kindPreset }}</NqToggle>
      </NqToggleGroup>
    </template>
    <template #detail="{ item }">
      <template v-if="listing(item)">
        <section v-if="listing(item)!.kind === 'preset' && listing(item)!.preset" class="flex flex-col gap-1.5">
          <h4 class="eyebrow">
            {{ t.preview }} <NqBadge variant="neutral">{{ t.stepsCount(enNumber.format(listing(item)!.preset!.steps.length)) }}</NqBadge>
          </h4>
          <NqWorkflowNetwork :steps="listing(item)!.preset!.steps" :links="listing(item)!.preset!.links" layout="vertical" />
        </section>
        <template v-else-if="listing(item)!.step">
          <section class="grid grid-cols-2 gap-3">
            <div v-for="[title, list] in takesGives(listing(item)!)" :key="title" class="flex flex-col gap-1.5">
              <h4 class="eyebrow">{{ title }}</h4>
              <div class="flex flex-wrap gap-1.5">
                <template v-if="list?.length">
                  <NqBadge v-for="x in list" :key="x" variant="outline">{{ x }}</NqBadge>
                </template>
                <span v-else class="text-caption text-muted-foreground">{{ t.none }}</span>
              </div>
            </div>
          </section>
          <section v-if="listing(item)!.step!.fields?.length" class="flex flex-col gap-1.5">
            <h4 class="eyebrow">{{ t.fields }}</h4>
            <ul class="divide-y divide-border rounded-card border border-border">
              <li v-for="f in listing(item)!.step!.fields" :key="f.name" class="flex items-center justify-between gap-3 px-3 py-2 text-body-sm">
                <span class="text-foreground">
                  {{ f.label }}
                  <span v-if="f.required" class="ms-1 text-caption text-muted-foreground">({{ t.required }})</span>
                </span>
                <code dir="ltr" class="text-caption text-muted-foreground">{{ f.kind }}</code>
              </li>
            </ul>
          </section>
        </template>
      </template>
    </template>
  </NqCatalogStore>
</template>
