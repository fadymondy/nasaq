<script setup lang="ts">
import { Search } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqChip, NqChipGroup } from "../chip-group";
import { NqInput } from "../field";
import { NqInstallButton, type InstallState } from "../install-button";
import { NqDateTime, useFormatNumber } from "../numeric";
import { NqPrice } from "../price";
import { NqRating } from "../rating";
import { NqSheet, NqSheetBody, NqSheetContent, NqSheetDescription, NqSheetFooter, NqSheetHeader, NqSheetTitle } from "../sheet";
import { NqEmptyState } from "../states";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import { categoryCounts, filterCatalog, sortCatalog, type CatalogSort } from "./catalog-logic";
import NqCatalogCard from "./NqCatalogCard.vue";
import NqCatalogIcon from "./NqCatalogIcon.vue";
import { useCatalogLabels, type CatalogCategory, type CatalogItem, type CatalogLabels, type CatalogResult } from "./strings";

// A store for installable things: search, category chips, sort, a grid of cards and a detail sheet with the
// install action. Describe the things as `CatalogItem`s. Slots: `toolbar-start` (controls after the search box)
// and `detail` (more content in the sheet, scoped `{ item }`).
interface Props {
  items: CatalogItem[];
  categories: CatalogCategory[];
  /** Install. Resolve to finish; return `{ error }` to show why it failed. */
  onInstall?: (item: CatalogItem) => Promise<CatalogResult>;
  /** Uninstall. Omit to hide the button. */
  onUninstall?: (item: CatalogItem) => Promise<CatalogResult>;
  /** The "Open" action once installed. */
  onOpen?: (item: CatalogItem) => void;
  /** Opens an item somewhere else (a detail page). When set, a card no longer opens the detail sheet. */
  onSelect?: (item: CatalogItem) => void;
  defaultSort?: CatalogSort;
  labels?: Partial<CatalogLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { onInstall: undefined, onUninstall: undefined, onOpen: undefined, onSelect: undefined, defaultSort: "popular", labels: undefined });
defineOptions({ inheritAttrs: false });

const { t, locale } = useCatalogLabels(() => props.labels);
const fmt = useFormatNumber();
const query = ref("");
const category = ref("all");
const sort = ref<CatalogSort>(props.defaultSort);
const detailId = ref<string | null>(null);
// Optimistic overlay over the `installed` flags the parent passes.
const override = ref<Record<string, boolean>>({});
const busy = ref<Record<string, "install" | "uninstall">>({});
const error = ref<{ id: string; message: string } | null>(null);

const isInstalled = (item: CatalogItem) => override.value[item.id] ?? item.installed ?? false;
const stateOf = (item: CatalogItem): InstallState => (busy.value[item.id] === "install" ? "installing" : isInstalled(item) ? "installed" : "available");
const installedOnly = computed(() => category.value === "installed");
const listed = computed(() => {
  const filtered = filterCatalog(props.items, { query: query.value, category: installedOnly.value ? "all" : category.value, installedOnly: installedOnly.value }, isInstalled);
  return sortCatalog(filtered, sort.value, locale.value);
});
const counts = computed(() => categoryCounts(props.items, query.value));
const installedCount = computed(() => props.items.filter(isInstalled).length);
const detail = computed(() => (detailId.value ? props.items.find((i) => i.id === detailId.value) : undefined));
const detailFree = computed(() => !detail.value?.price || detail.value.price.amount === 0);

async function run(item: CatalogItem, kind: "install" | "uninstall") {
  const fn = kind === "install" ? props.onInstall : props.onUninstall;
  if (!fn) return;
  busy.value = { ...busy.value, [item.id]: kind };
  error.value = null;
  const res = await fn(item);
  const { [item.id]: _gone, ...rest } = busy.value;
  busy.value = rest;
  if (res && res.error) error.value = { id: item.id, message: res.error };
  else override.value = { ...override.value, [item.id]: kind === "install" };
}
function openDetail(item: CatalogItem) {
  if (props.onSelect) props.onSelect(item);
  else detailId.value = item.id;
}
function clear() {
  query.value = "";
  category.value = "all";
}
function setSort(v: string[]) {
  if (v[0]) sort.value = v[0] as CatalogSort;
}
</script>

<template>
  <div data-slot="catalog-store" :class="cn('flex min-w-0 flex-col gap-4', props.class)" v-bind="$attrs">
    <div class="flex flex-wrap items-center gap-2">
      <div class="relative min-w-48 flex-1 sm:max-w-sm">
        <Search aria-hidden="true" class="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <NqInput v-model="query" type="search" :placeholder="t.search" :aria-label="t.search" class="ps-8" />
      </div>
      <slot name="toolbar-start" />
      <NqToggleGroup :model-value="[sort]" :aria-label="t.sort" class="ms-auto" @update:model-value="setSort">
        <NqToggle value="popular">{{ t.sortPopular }}</NqToggle>
        <NqToggle value="newest">{{ t.sortNewest }}</NqToggle>
        <NqToggle value="name">{{ t.sortName }}</NqToggle>
      </NqToggleGroup>
    </div>
    <NqChipGroup v-model="category" :ariaLabel="t.categories">
      <NqChip value="all">
        {{ t.all }} <bdi class="text-caption tabular-nums opacity-70">{{ fmt(counts.get("all") ?? 0) }}</bdi>
      </NqChip>
      <NqChip v-for="c in props.categories" :key="c.id" :value="c.id">
        <template v-if="c.icon" #icon><component :is="c.icon" aria-hidden="true" /></template>
        {{ c.label }} <bdi class="text-caption tabular-nums opacity-70">{{ fmt(counts.get(c.id) ?? 0) }}</bdi>
      </NqChip>
      <NqChip value="installed">
        {{ t.installed }} <bdi class="text-caption tabular-nums opacity-70">{{ fmt(installedCount) }}</bdi>
      </NqChip>
    </NqChipGroup>
    <p class="sr-only" role="status">{{ t.results(fmt(listed.length)) }}</p>
    <NqEmptyState v-if="listed.length === 0" :title="t.emptyTitle" :description="t.emptyBody">
      <template v-if="query || category !== 'all'" #actions>
        <NqButton variant="secondary" @click="clear">{{ t.clear }}</NqButton>
      </template>
    </NqEmptyState>
    <ul v-else class="grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-3">
      <li v-for="item in listed" :key="item.id" class="min-w-0">
        <NqCatalogCard :item="item" :state="stateOf(item)" :on-open-detail="openDetail" :on-install="props.onInstall ? (i) => run(i, 'install') : undefined" :on-open="props.onOpen" :labels="props.labels" />
      </li>
    </ul>

    <NqSheet :open="detail !== undefined" @update:open="(o: boolean) => !o && (detailId = null)">
      <NqSheetContent class="w-full sm:max-w-md">
        <template v-if="detail">
          <NqSheetHeader>
            <div class="flex items-start gap-3">
              <NqCatalogIcon :icon="detail.icon" class="size-12" />
              <div class="min-w-0">
                <NqSheetTitle class="text-h3">{{ detail.name }}</NqSheetTitle>
                <NqSheetDescription>
                  {{ detail.publisher ? t.by(detail.publisher) : detail.summary }}
                  <template v-if="detail.version">
                    {{ " · " }}<bdi>v{{ detail.version }}</bdi>
                  </template>
                </NqSheetDescription>
              </div>
            </div>
            <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <NqBadge v-if="detail.badge" variant="outline">{{ detail.badge }}</NqBadge>
              <NqRating v-if="detail.rating !== undefined" :value="detail.rating" :count="detail.ratingCount" />
              <span v-if="detail.installs !== undefined" class="text-caption text-muted-foreground"><bdi>{{ fmt(detail.installs, { notation: "compact" }) }}</bdi> {{ t.installs }}</span>
              <NqPrice v-if="detail.price && detail.price.amount > 0" :amount="detail.price.amount" :currency="detail.price.currency" :period="detail.price.period" size="sm" />
              <span v-else class="text-caption text-muted-foreground">{{ t.free }}</span>
            </div>
          </NqSheetHeader>
          <NqSheetBody class="flex flex-col gap-5 p-4">
            <section class="flex flex-col gap-1.5">
              <h4 class="eyebrow">{{ t.about }}</h4>
              <p class="text-body-sm text-foreground">{{ detail.description ?? detail.summary }}</p>
            </section>
            <slot name="detail" :item="detail" />
            <section v-if="detail.details?.length || detail.updatedAt !== undefined" class="flex flex-col gap-1.5">
              <h4 class="eyebrow">{{ t.details }}</h4>
              <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-body-sm">
                <div v-for="d in detail.details" :key="d.label" class="col-span-2 grid grid-cols-subgrid">
                  <dt class="text-muted-foreground">{{ d.label }}</dt>
                  <dd class="text-foreground">{{ d.value }}</dd>
                </div>
                <div v-if="detail.updatedAt !== undefined" class="col-span-2 grid grid-cols-subgrid">
                  <dt class="text-muted-foreground">{{ t.updated }}</dt>
                  <dd class="text-foreground"><NqDateTime :value="detail.updatedAt" /></dd>
                </div>
              </dl>
            </section>
            <section v-if="detail.tags?.length" class="flex flex-col gap-1.5">
              <h4 class="eyebrow">{{ t.tags }}</h4>
              <div class="flex flex-wrap gap-1.5">
                <NqBadge v-for="tag in detail.tags" :key="tag" variant="neutral">{{ tag }}</NqBadge>
              </div>
            </section>
          </NqSheetBody>
          <NqSheetFooter class="flex-wrap">
            <p v-if="error?.id === detail.id" role="alert" class="w-full text-body-sm text-nq-danger-text">{{ error.message }}</p>
            <NqInstallButton
              :state="stateOf(detail)"
              :app-name="detail.name"
              :free="detailFree"
              size="md"
              variant="primary"
              @install="props.onInstall && run(detail, 'install')"
              @open="props.onOpen?.(detail)"
            />
            <NqButton v-if="isInstalled(detail) && props.onUninstall" variant="ghost" :loading="busy[detail.id] === 'uninstall'" @click="run(detail, 'uninstall')">
              {{ busy[detail.id] === "uninstall" ? t.uninstalling : t.uninstall }}
            </NqButton>
            <span v-if="isInstalled(detail) && !props.onUninstall" class="text-caption text-muted-foreground">{{ t.installedNote }}</span>
          </NqSheetFooter>
        </template>
      </NqSheetContent>
    </NqSheet>
  </div>
</template>
