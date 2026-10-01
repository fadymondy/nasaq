<script setup lang="ts">
import { Ruler } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogHeader, NqDialogTitle, NqDialogTrigger } from "../dialog";
import { usePdpStrings, type ProductDetailLabels } from "./pdp-strings";

export interface ProductSizeGuideData {
  /** Dialog title. Default "Size guide". */
  title?: string;
  description?: string;
  /** Column headings; the first column names the size. */
  columns: readonly string[];
  /** One row per size. Cells stay left-to-right so measurements like "38-40" read correctly in Arabic. */
  rows: readonly (readonly (string | number)[])[];
  /** Size the shopper has selected; its row is highlighted. Matches the first cell. */
  highlight?: string;
  /** How to measure, fit advice, unit switch… (a string, or the `footer` slot). */
  footer?: string;
}

// A "Size guide" link that opens a dialog with the measurement table.
interface Props {
  guide: ProductSizeGuideData;
  /** Highlight this size's row (the first cell). Overrides `guide.highlight`. */
  selectedSize?: string;
  labels?: ProductDetailLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { selectedSize: undefined, labels: undefined });
const s = usePdpStrings(() => props.labels);
const highlight = computed(() => props.selectedSize ?? props.guide.highlight);
</script>

<template>
  <NqDialog>
    <NqDialogTrigger as-child>
      <NqButton type="button" variant="link" size="sm" :class="cn('gap-1 text-caption', props.class)">
        <Ruler aria-hidden="true" />
        {{ s.t.sizeGuide }}
      </NqButton>
    </NqDialogTrigger>
    <NqDialogContent>
      <NqDialogHeader>
        <NqDialogTitle>{{ guide.title ?? s.t.sizeGuideTitle }}</NqDialogTitle>
        <NqDialogDescription>{{ guide.description ?? s.t.sizeGuideDescription }}</NqDialogDescription>
      </NqDialogHeader>
      <div class="overflow-x-auto rounded-control border border-border">
        <table class="w-full min-w-max border-collapse text-body-sm">
          <thead class="bg-secondary text-start">
            <tr>
              <th v-for="(c, i) in guide.columns" :key="i" scope="col" class="px-3 py-2 text-start text-label text-foreground">{{ c }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, r) in guide.rows" :key="r" :data-selected="row[0] === highlight ? '' : undefined" class="border-t border-border data-selected:bg-nq-selected">
              <td v-for="(cell, c) in row" :key="c" :class="cn('px-3 py-2 tabular-nums', c === 0 ? 'text-label text-foreground' : 'text-muted-foreground')">
                <bdi>{{ cell }}</bdi>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="guide.footer || $slots.footer" class="text-caption text-muted-foreground"><slot name="footer">{{ guide.footer }}</slot></div>
    </NqDialogContent>
  </NqDialog>
</template>
