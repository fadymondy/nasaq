<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import NqInfolistRows from "./NqInfolistRows.vue";
import { INFOLIST_STRINGS, type InfolistItem, type InfolistLabels, type InfolistSection } from "./types";

// A read-only description list: label and value pairs for a record's detail page. Booleans and enums become badges,
// emails and links are clickable, codes and ids can be copied, missing values say so, and sections group the rows.
interface Props {
  /** Flat rows. Use `sections` for groups. */
  items?: readonly InfolistItem[];
  sections?: readonly InfolistSection[];
  /** Columns from the `sm` breakpoint up. Default 2. */
  columns?: 1 | 2 | 3;
  /** `stacked` puts the label above the value, `inline` puts them on one row. Default `stacked`. */
  layout?: "stacked" | "inline";
  /** Show a dash-word ("Not set") for missing values. Default true; `false` hides the row. */
  showEmpty?: boolean;
  /** Accessible name for the list. */
  label?: string;
  locale?: string;
  labels?: InfolistLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { columns: 2, layout: "stacked", showEmpty: true });
const nq = useNasaq();
const ar = computed(() => (props.locale ?? nq.locale.value).startsWith("ar"));
const t = computed(() => ({ ...INFOLIST_STRINGS[ar.value ? "ar" : "en"], ...props.labels }) as Required<InfolistLabels>);
const groups = computed<InfolistSection[]>(() => (props.sections ? [...props.sections] : [{ id: "_", items: props.items ?? [] }]));
const titleOf = (g: InfolistSection) => (ar.value ? g.titleAr || g.title : g.title);
const descOf = (g: InfolistSection) => (ar.value ? g.descriptionAr || g.description : g.description);
</script>

<template>
  <div data-slot="infolist" role="group" :aria-label="props.label" :class="cn('flex flex-col gap-8', props.class)">
    <section v-for="group in groups" :key="group.id" :aria-label="titleOf(group)" class="flex flex-col gap-4">
      <header v-if="titleOf(group) || descOf(group)" class="flex flex-col gap-0.5 border-b border-border pb-2">
        <h3 v-if="titleOf(group)" class="text-h4 font-semibold text-foreground">{{ titleOf(group) }}</h3>
        <p v-if="descOf(group)" class="text-caption text-muted-foreground">{{ descOf(group) }}</p>
      </header>
      <NqInfolistRows :items="group.items" :columns="props.columns" :layout="props.layout" :show-empty="props.showEmpty" :ar="ar" :t="t" />
    </section>
  </div>
</template>
