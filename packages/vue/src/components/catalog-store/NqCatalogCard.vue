<script setup lang="ts">
import { computed } from "vue";
import { useFormatNumber } from "../numeric";
import { NqBadge } from "../badge";
import { NqInstallButton, type InstallState } from "../install-button";
import { NqPrice } from "../price";
import { NqRating } from "../rating";
import NqCatalogIcon from "./NqCatalogIcon.vue";
import { useCatalogLabels, type CatalogItem, type CatalogLabels } from "./strings";

// One store card. The whole card opens the detail; the install button works on its own.
interface Props {
  item: CatalogItem;
  state: InstallState;
  onOpenDetail: (item: CatalogItem) => void;
  /** Omit to leave the card's install button inert. */
  onInstall?: (item: CatalogItem) => void;
  onOpen?: (item: CatalogItem) => void;
  labels?: Partial<CatalogLabels>;
}
const props = withDefaults(defineProps<Props>(), { onInstall: undefined, onOpen: undefined, labels: undefined });
const { t } = useCatalogLabels(() => props.labels);
const fmt = useFormatNumber();
const free = computed(() => !props.item.price || props.item.price.amount === 0);
</script>

<template>
  <article
    data-slot="catalog-card"
    :data-item="props.item.id"
    :data-state="props.state"
    class="relative flex h-full flex-col gap-3 rounded-card border border-border bg-card p-4 shadow-xs transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-nq-focus hover:bg-nq-hover"
  >
    <div class="flex items-start gap-3">
      <NqCatalogIcon :icon="props.item.icon" />
      <div class="min-w-0 flex-1">
        <h3 class="text-label text-foreground">
          <button type="button" class="text-start outline-none after:absolute after:inset-0 after:content-['']" @click="props.onOpenDetail(props.item)">
            {{ props.item.name }}
          </button>
        </h3>
        <p v-if="props.item.publisher" class="truncate text-caption text-muted-foreground">{{ t.by(props.item.publisher) }}</p>
      </div>
      <NqBadge v-if="props.item.badge" variant="outline">{{ props.item.badge }}</NqBadge>
    </div>
    <p class="line-clamp-2 text-body-sm text-muted-foreground">{{ props.item.summary }}</p>
    <div class="mt-auto flex items-center justify-between gap-2">
      <div class="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
        <NqRating v-if="props.item.rating !== undefined" :value="props.item.rating" :count="props.item.ratingCount" />
        <span v-if="props.item.installs !== undefined"><bdi>{{ fmt(props.item.installs, { notation: "compact" }) }}</bdi> {{ t.installs }}</span>
        <NqPrice v-if="!free && props.item.price" :amount="props.item.price.amount" :currency="props.item.price.currency" :period="props.item.price.period" size="sm" />
      </div>
      <NqInstallButton
        class="relative z-10 shrink-0"
        :state="props.state"
        :app-name="props.item.name"
        :free="free"
        @install="props.onInstall?.(props.item)"
        @open="props.onOpen?.(props.item)"
      />
    </div>
  </article>
</template>
