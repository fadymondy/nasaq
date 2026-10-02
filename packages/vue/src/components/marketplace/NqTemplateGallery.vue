<script setup lang="ts">
import { LayoutTemplate } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import type { CatalogCategory } from "../catalog-store";
import { NqChip, NqChipGroup } from "../chip-group";
import { useFormatNumber } from "../numeric";
import { NqEmptyState } from "../states";
import { useMarketplaceLabels, type MarketplaceLabels, type MarketplaceResult, type MarketplaceTemplate } from "./strings";

// Ready-made starting points: a preview, name, summary and a "Use template" button, filtered by category.
interface Props {
  templates: MarketplaceTemplate[];
  categories: CatalogCategory[];
  /** Create something from the template. Resolve to finish; return `{ error }` to show why it failed. */
  onUse?: (template: MarketplaceTemplate) => Promise<MarketplaceResult>;
  class?: HTMLAttributes["class"];
  labels?: Partial<MarketplaceLabels>;
}
const props = withDefaults(defineProps<Props>(), { onUse: undefined, labels: undefined });
const { t } = useMarketplaceLabels(() => props.labels);
const fmt = useFormatNumber();
const category = ref("all");
const busy = ref<string | null>(null);
const error = ref<{ id: string; message: string } | null>(null);
const shown = computed(() => (category.value === "all" ? props.templates : props.templates.filter((x) => x.category === category.value)));

async function use(tpl: MarketplaceTemplate) {
  if (!props.onUse) return;
  busy.value = tpl.id;
  error.value = null;
  try {
    const res = await props.onUse(tpl);
    if (res && res.error) error.value = { id: tpl.id, message: res.error };
  } catch {
    error.value = { id: tpl.id, message: t.value.failed };
  } finally {
    busy.value = null;
  }
}
</script>

<template>
  <div data-slot="template-gallery" :class="cn('flex min-w-0 flex-col gap-4', props.class)">
    <NqChipGroup v-model="category" :ariaLabel="t.templateCategories">
      <NqChip value="all">{{ t.allTemplates }}</NqChip>
      <NqChip v-for="c in props.categories" :key="c.id" :value="c.id">{{ c.label }}</NqChip>
    </NqChipGroup>
    <NqEmptyState v-if="shown.length === 0" :title="t.noTemplates" :description="t.noTemplatesBody" />
    <ul v-else class="grid grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))] gap-3">
      <li v-for="tpl in shown" :key="tpl.id" class="min-w-0">
        <article :data-template="tpl.id" class="flex h-full flex-col overflow-hidden rounded-card border border-border bg-card shadow-xs">
          <div class="flex aspect-[16/9] items-center justify-center overflow-hidden border-b border-border bg-secondary text-muted-foreground">
            <img v-if="tpl.preview" :src="tpl.preview" :alt="tpl.previewAlt ?? ''" class="size-full object-cover" />
            <component :is="tpl.icon ?? LayoutTemplate" v-else aria-hidden="true" class="size-10" />
          </div>
          <div class="flex flex-1 flex-col gap-2 p-4">
            <h3 dir="auto" class="text-label text-foreground">{{ tpl.name }}</h3>
            <p dir="auto" class="line-clamp-2 text-body-sm text-muted-foreground">{{ tpl.summary }}</p>
            <div class="mt-auto flex items-center justify-between gap-2 pt-1">
              <span class="min-w-0 truncate text-caption text-muted-foreground">
                <template v-if="tpl.uses !== undefined"><bdi>{{ fmt(tpl.uses, { notation: "compact" }) }}</bdi> {{ t.uses }}</template>
                <template v-else>{{ tpl.author }}</template>
              </span>
              <NqButton v-if="props.onUse" size="sm" variant="secondary" :loading="busy === tpl.id" @click="use(tpl)">
                {{ busy === tpl.id ? t.using : t.useTemplate }}
              </NqButton>
            </div>
            <p v-if="error?.id === tpl.id" role="alert" class="text-caption text-nq-danger-text">{{ error.message }}</p>
          </div>
        </article>
      </li>
    </ul>
  </div>
</template>
