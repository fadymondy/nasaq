<script setup lang="ts">
import { LayoutTemplate, Store, Upload } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { NqCatalogIcon, NqCatalogStore, type CatalogCategory, type CatalogItem, type CatalogLabels } from "../catalog-store";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqRating } from "../rating";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import { pickFeatured, type PublishDraft } from "./marketplace-format";
import NqMarketplaceDetail from "./NqMarketplaceDetail.vue";
import NqPublishForm from "./NqPublishForm.vue";
import NqTemplateGallery from "./NqTemplateGallery.vue";
import { useMarketplaceLabels, type MarketplaceLabels, type MarketplaceListing, type MarketplacePermission, type MarketplaceResult, type MarketplaceTemplate } from "./strings";

// A store with a featured strip, categories and search (built on `NqCatalogStore`), a detail page for each
// extension, a publish form and a template gallery. It calls no backend: pass data and async callbacks.
interface Props {
  listings: MarketplaceListing[];
  categories: CatalogCategory[];
  /** Adds the Templates view and the gallery. */
  templates?: MarketplaceTemplate[];
  templateCategories?: CatalogCategory[];
  /** Permissions an author can declare in the publish form. */
  permissionOptions?: MarketplacePermission[];
  onInstall?: (listing: MarketplaceListing) => Promise<MarketplaceResult>;
  onUninstall?: (listing: MarketplaceListing) => Promise<MarketplaceResult>;
  onOpen?: (listing: MarketplaceListing) => void;
  /** Shows the Publish button and its form. */
  onPublish?: (draft: PublishDraft) => Promise<MarketplaceResult>;
  onUseTemplate?: (template: MarketplaceTemplate) => Promise<MarketplaceResult>;
  /** Called when a detail page opens or closes (`null`). */
  onSelectedChange?: (id: string | null) => void;
  class?: HTMLAttributes["class"];
  labels?: Partial<MarketplaceLabels> & { store?: Partial<CatalogLabels> };
}
const props = withDefaults(defineProps<Props>(), {
  templates: undefined,
  templateCategories: () => [],
  permissionOptions: undefined,
  onInstall: undefined,
  onUninstall: undefined,
  onOpen: undefined,
  onPublish: undefined,
  onUseTemplate: undefined,
  onSelectedChange: undefined,
  labels: undefined,
});
const own = computed<Partial<MarketplaceLabels>>(() => {
  const { store: _store, ...rest } = props.labels ?? {};
  return rest;
});
const { t } = useMarketplaceLabels(() => own.value);
const view = ref<"extensions" | "templates">("extensions");
const selected = ref<string | null>(null);
const publishing = ref(false);
const installed = ref<Record<string, boolean>>({});
const items = computed(() => props.listings.map((l) => ({ ...l, installed: installed.value[l.id] ?? l.installed ?? false })));
const byId = computed(() => new Map(items.value.map((l) => [l.id, l])));
const featured = computed(() => pickFeatured(items.value, 3));
const open = computed(() => (selected.value ? byId.value.get(selected.value) : undefined));

function select(id: string | null) {
  selected.value = id;
  props.onSelectedChange?.(id);
}
async function install(item: CatalogItem) {
  const res = await props.onInstall!(byId.value.get(item.id) as MarketplaceListing);
  if (!(res && res.error)) installed.value = { ...installed.value, [item.id]: true };
  return res;
}
async function uninstall(item: CatalogItem) {
  const res = await props.onUninstall!(byId.value.get(item.id) as MarketplaceListing);
  if (!(res && res.error)) installed.value = { ...installed.value, [item.id]: false };
  return res;
}
function setView(v: string[]) {
  if (v[0]) view.value = v[0] as "extensions" | "templates";
}
</script>

<template>
  <NqMarketplaceDetail
    v-if="open"
    :listing="open"
    :on-back="() => select(null)"
    :on-install="props.onInstall ? install : undefined"
    :on-uninstall="props.onUninstall ? uninstall : undefined"
    :on-open="props.onOpen ? (l: MarketplaceListing) => props.onOpen?.(l) : undefined"
    :class="props.class"
    :labels="own"
  />
  <div v-else data-slot="marketplace" :class="cn('flex min-w-0 flex-col gap-5', props.class)">
    <div v-if="props.templates || props.onPublish" class="flex flex-wrap items-center justify-between gap-2">
      <NqToggleGroup v-if="props.templates" :model-value="[view]" :aria-label="t.view" @update:model-value="setView">
        <NqToggle value="extensions">
          <Store aria-hidden="true" />
          {{ t.extensions }}
        </NqToggle>
        <NqToggle value="templates">
          <LayoutTemplate aria-hidden="true" />
          {{ t.templates }}
        </NqToggle>
      </NqToggleGroup>
      <span v-else />
      <NqButton v-if="props.onPublish" variant="primary" @click="publishing = true">
        <Upload aria-hidden="true" />
        {{ t.publish }}
      </NqButton>
    </div>
    <NqTemplateGallery v-if="view === 'templates' && props.templates" :templates="props.templates" :categories="props.templateCategories" :on-use="props.onUseTemplate" :labels="own" />
    <template v-else>
      <section v-if="featured.length" :aria-label="t.featured" class="flex flex-col gap-2">
        <h2 class="eyebrow">{{ t.featured }}</h2>
        <ul class="grid gap-3 md:grid-cols-3">
          <li v-for="f in featured" :key="f.id" class="min-w-0">
            <article
              :data-featured="f.id"
              class="relative flex h-full items-start gap-3 rounded-card border border-border bg-secondary p-4 transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-nq-focus hover:bg-nq-hover"
            >
              <NqCatalogIcon :item="f" class="size-12" />
              <div class="min-w-0 flex-1">
                <h3 class="text-label text-foreground">
                  <button type="button" class="text-start outline-none after:absolute after:inset-0 after:content-['']" @click="select(f.id)">{{ f.name }}</button>
                </h3>
                <p dir="auto" class="line-clamp-2 text-body-sm text-muted-foreground">{{ f.summary }}</p>
                <NqRating v-if="f.rating !== undefined" :value="f.rating" class="mt-1" :count="f.ratingCount" />
              </div>
            </article>
          </li>
        </ul>
      </section>
      <NqCatalogStore
        :items="items"
        :categories="props.categories"
        :on-select="(i: CatalogItem) => select(i.id)"
        :on-install="props.onInstall ? install : undefined"
        :on-uninstall="props.onUninstall ? uninstall : undefined"
        :on-open="props.onOpen ? (i: CatalogItem) => props.onOpen?.(byId.get(i.id) as MarketplaceListing) : undefined"
        :labels="props.labels?.store"
      />
    </template>
    <NqDialog v-if="props.onPublish" :open="publishing" @update:open="(v: boolean) => (publishing = v)">
      <NqDialogContent class="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <NqDialogHeader>
          <NqDialogTitle>{{ t.publishTitle }}</NqDialogTitle>
          <NqDialogDescription>{{ t.publishBody }}</NqDialogDescription>
        </NqDialogHeader>
        <NqPublishForm :categories="props.categories" :permission-options="props.permissionOptions" :on-submit="props.onPublish" :on-cancel="() => (publishing = false)" :labels="own" />
      </NqDialogContent>
    </NqDialog>
  </div>
</template>
