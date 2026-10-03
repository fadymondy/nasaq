<script setup lang="ts">
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqAvatar } from "../avatar";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCatalogIcon } from "../catalog-store";
import { NqInstallButton, type InstallState } from "../install-button";
import { NqDateTime, useFormatNumber } from "../numeric";
import { NqPrice } from "../price";
import { NqRating } from "../rating";
import { NqTabs, NqTabsIndicator, NqTabsList, NqTabsPanel, NqTabsTab } from "../tabs";
import { highestRisk } from "./marketplace-format";
import NqPermissionList from "./NqPermissionList.vue";
import { riskVariant, useMarketplaceLabels, type MarketplaceLabels, type MarketplaceListing, type MarketplaceResult } from "./strings";

// An extension's page: install header, tabs for overview (with screenshots), changelog and reviews, and a side
// column with details, permissions, links and tags.
interface Props {
  listing: MarketplaceListing;
  /** Install state. Uncontrolled from `listing.installed` when omitted. */
  state?: InstallState;
  onInstall?: (listing: MarketplaceListing) => Promise<MarketplaceResult>;
  onUninstall?: (listing: MarketplaceListing) => Promise<MarketplaceResult>;
  onOpen?: (listing: MarketplaceListing) => void;
  /** Shows the back link. */
  onBack?: () => void;
  class?: HTMLAttributes["class"];
  labels?: Partial<MarketplaceLabels>;
}
const props = withDefaults(defineProps<Props>(), { state: undefined, onInstall: undefined, onUninstall: undefined, onOpen: undefined, onBack: undefined, labels: undefined });
const { t, ar } = useMarketplaceLabels(() => props.labels);
const fmt = useFormatNumber();
const installed = ref(props.listing.installed ?? false);
const busy = ref<"install" | "uninstall" | null>(null);
const error = ref<string | null>(null);
const current = computed<InstallState>(() => props.state ?? (busy.value === "install" ? "installing" : installed.value ? "installed" : "available"));
const free = computed(() => !props.listing.price || props.listing.price.amount === 0);
const perms = computed(() => props.listing.permissions ?? []);
const risk = computed(() => highestRisk(perms.value));
const paragraphs = computed(() => (props.listing.description ?? props.listing.summary).split("\n\n"));

async function run(kind: "install" | "uninstall") {
  const fn = kind === "install" ? props.onInstall : props.onUninstall;
  if (!fn) return;
  busy.value = kind;
  error.value = null;
  try {
    const res = await fn(props.listing);
    if (res && res.error) error.value = res.error;
    else installed.value = kind === "install";
  } catch {
    error.value = t.value.failed;
  } finally {
    busy.value = null;
  }
}
</script>

<template>
  <div data-slot="marketplace-detail" :data-listing="props.listing.id" :class="cn('flex min-w-0 flex-col gap-5', props.class)">
    <div v-if="props.onBack">
      <NqButton variant="ghost" size="sm" @click="props.onBack">
        <component :is="ar ? ArrowRight : ArrowLeft" aria-hidden="true" />
        {{ t.back }}
      </NqButton>
    </div>
    <header class="flex flex-wrap items-start gap-4">
      <NqCatalogIcon :item="props.listing" class="size-16 [&_svg]:size-8" />
      <div class="flex min-w-0 flex-1 flex-col gap-1.5">
        <div class="flex flex-wrap items-center gap-2">
          <h1 class="text-title-lg text-foreground">{{ props.listing.name }}</h1>
          <NqBadge v-if="props.listing.badge" variant="outline">{{ props.listing.badge }}</NqBadge>
        </div>
        <p dir="auto" class="text-body text-muted-foreground">{{ props.listing.summary }}</p>
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-muted-foreground">
          <span v-if="props.listing.publisher">{{ t.by(props.listing.publisher) }}</span>
          <NqRating v-if="props.listing.rating !== undefined" :value="props.listing.rating" :count="props.listing.ratingCount" />
          <span v-if="props.listing.installs !== undefined"><bdi>{{ fmt(props.listing.installs, { notation: "compact" }) }}</bdi> {{ t.installs }}</span>
          <span v-if="free">{{ t.free }}</span>
          <NqPrice v-else-if="props.listing.price" :amount="props.listing.price.amount" :currency="props.listing.price.currency" :period="props.listing.price.period" size="sm" />
        </div>
      </div>
      <div class="flex flex-col items-stretch gap-2 max-sm:w-full sm:items-end">
        <div class="flex flex-wrap items-center gap-2">
          <NqInstallButton
            :state="current"
            :app-name="props.listing.name"
            :free="free"
            size="lg"
            variant="primary"
            @install="props.onInstall && run('install')"
            @open="props.onOpen?.(props.listing)"
          />
          <NqButton v-if="installed && props.onUninstall" variant="ghost" size="lg" :loading="busy === 'uninstall'" @click="run('uninstall')">
            {{ busy === "uninstall" ? t.uninstalling : t.uninstall }}
          </NqButton>
        </div>
        <p v-if="error" role="alert" class="text-caption text-nq-danger-text">{{ error }}</p>
      </div>
    </header>

    <div class="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <NqTabs default-value="overview" class="min-w-0">
        <NqTabsList variant="underline">
          <NqTabsTab value="overview">{{ t.overview }}</NqTabsTab>
          <NqTabsTab value="changelog">{{ t.changelog }}</NqTabsTab>
          <NqTabsTab value="reviews">
            {{ t.reviews }}
            <bdi v-if="props.listing.reviews?.length" class="text-caption tabular-nums opacity-70">{{ fmt(props.listing.reviews.length) }}</bdi>
          </NqTabsTab>
          <NqTabsIndicator />
        </NqTabsList>
        <NqTabsPanel value="overview" class="flex flex-col gap-5">
          <p v-for="para in paragraphs" :key="para" dir="auto" class="text-body text-foreground">{{ para }}</p>
          <section v-if="props.listing.screenshots?.length" class="flex flex-col gap-2" :aria-label="t.screenshots">
            <h2 class="eyebrow">{{ t.screenshots }}</h2>
            <ul class="grid gap-3 sm:grid-cols-2">
              <li v-for="s in props.listing.screenshots" :key="s.src" class="overflow-hidden rounded-card border border-border bg-muted">
                <img :src="s.src" :alt="s.alt" class="block h-auto w-full" />
              </li>
            </ul>
          </section>
        </NqTabsPanel>
        <NqTabsPanel value="changelog">
          <ol v-if="props.listing.changelog?.length" class="flex flex-col gap-4">
            <li v-for="r in props.listing.changelog" :key="r.version" class="flex flex-col gap-1.5 rounded-card border border-border bg-card p-4">
              <div class="flex items-center justify-between gap-2">
                <span class="text-label text-foreground"><bdi dir="ltr">v{{ r.version }}</bdi></span>
                <span class="text-caption text-muted-foreground"><NqDateTime :value="r.date" /></span>
              </div>
              <ul class="list-disc ps-5 text-body-sm text-foreground">
                <li v-for="n in r.notes" :key="n" dir="auto">{{ n }}</li>
              </ul>
            </li>
          </ol>
          <p v-else class="text-body-sm text-muted-foreground">{{ t.noChangelog }}</p>
        </NqTabsPanel>
        <NqTabsPanel value="reviews">
          <ul v-if="props.listing.reviews?.length" class="flex flex-col gap-3">
            <li v-for="r in props.listing.reviews" :key="r.id" class="flex flex-col gap-1.5 rounded-card border border-border bg-card p-4">
              <div class="flex items-center gap-2">
                <NqAvatar :name="r.author" size="sm" />
                <span class="text-label text-foreground">{{ r.author }}</span>
                <NqRating :value="r.rating" class="ms-auto" />
              </div>
              <p dir="auto" class="text-body-sm text-foreground">{{ r.body }}</p>
              <span class="text-caption text-muted-foreground"><NqDateTime :value="r.date" relative /></span>
            </li>
          </ul>
          <p v-else class="text-body-sm text-muted-foreground">{{ t.noReviews }}</p>
        </NqTabsPanel>
      </NqTabs>

      <aside class="flex min-w-0 flex-col gap-5 self-start">
        <section class="flex flex-col gap-2" :aria-label="t.details">
          <h2 class="eyebrow">{{ t.details }}</h2>
          <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-card border border-border bg-card p-3 text-body-sm">
            <div v-if="props.listing.publisher" class="col-span-2 grid grid-cols-subgrid">
              <dt class="text-muted-foreground">{{ t.publisher }}</dt>
              <dd class="min-w-0 truncate text-foreground">{{ props.listing.publisher }}</dd>
            </div>
            <div v-if="props.listing.version" class="col-span-2 grid grid-cols-subgrid">
              <dt class="text-muted-foreground">{{ t.version }}</dt>
              <dd class="min-w-0 truncate text-foreground"><bdi dir="ltr">{{ props.listing.version }}</bdi></dd>
            </div>
            <div v-if="props.listing.updatedAt !== undefined" class="col-span-2 grid grid-cols-subgrid">
              <dt class="text-muted-foreground">{{ t.updated }}</dt>
              <dd class="min-w-0 truncate text-foreground"><NqDateTime :value="props.listing.updatedAt" /></dd>
            </div>
            <div v-if="props.listing.compatibility" class="col-span-2 grid grid-cols-subgrid">
              <dt class="text-muted-foreground">{{ t.compatibility }}</dt>
              <dd class="min-w-0 truncate text-foreground"><bdi dir="ltr">{{ props.listing.compatibility }}</bdi></dd>
            </div>
            <div v-if="props.listing.size" class="col-span-2 grid grid-cols-subgrid">
              <dt class="text-muted-foreground">{{ t.size }}</dt>
              <dd class="min-w-0 truncate text-foreground"><bdi dir="ltr">{{ props.listing.size }}</bdi></dd>
            </div>
            <div v-if="props.listing.license" class="col-span-2 grid grid-cols-subgrid">
              <dt class="text-muted-foreground">{{ t.license }}</dt>
              <dd class="min-w-0 truncate text-foreground"><bdi dir="ltr">{{ props.listing.license }}</bdi></dd>
            </div>
          </dl>
        </section>
        <section class="flex flex-col gap-2" :aria-label="t.permissions">
          <h2 class="eyebrow flex items-center gap-2">
            {{ t.permissions }}
            <NqBadge v-if="risk" :variant="riskVariant[risk]">{{ t.risk[risk] }}</NqBadge>
          </h2>
          <NqPermissionList :permissions="perms" :labels="props.labels" />
        </section>
        <section v-if="props.listing.links?.length" class="flex flex-col gap-2" :aria-label="t.links">
          <h2 class="eyebrow">{{ t.links }}</h2>
          <ul class="flex flex-col gap-1">
            <li v-for="l in props.listing.links" :key="l.href">
              <a :href="l.href" target="_blank" rel="noreferrer" class="inline-flex items-center gap-1.5 text-body-sm text-nq-info-text underline-offset-2 hover:underline">
                {{ l.label }}
                <ExternalLink aria-hidden="true" class="size-3.5 rtl:-scale-x-100" />
              </a>
            </li>
          </ul>
        </section>
        <section v-if="props.listing.tags?.length" class="flex flex-col gap-2" :aria-label="t.tags">
          <h2 class="eyebrow">{{ t.tags }}</h2>
          <div class="flex flex-wrap gap-1.5">
            <NqBadge v-for="tag in props.listing.tags" :key="tag" variant="neutral">{{ tag }}</NqBadge>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>
