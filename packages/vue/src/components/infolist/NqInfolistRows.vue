<script setup lang="ts">
import { Check, Minus, X } from "lucide-vue-next";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { NqCopyButton } from "../copy-button";
import { NqDateTime, NqNum } from "../numeric";
import { copyText, isBlank, type InfolistItem, type InfolistLabels } from "./types";

// The rows of one Infolist group (internal).
const props = defineProps<{
  items: readonly InfolistItem[];
  columns: number;
  layout: "stacked" | "inline";
  showEmpty: boolean;
  ar: boolean;
  t: Required<InfolistLabels>;
}>();

const grid = props.columns === 3 ? "sm:grid-cols-3" : props.columns === 2 ? "sm:grid-cols-2" : "";
const span = props.columns === 3 ? "sm:col-span-3" : props.columns === 2 ? "sm:col-span-2" : "";
const visible = () => props.items.filter((item) => props.showEmpty || !isBlank(item.value));
const isBlankItem = (item: InfolistItem) => isBlank(item.value) && !(item.type === "boolean" && item.value === false);
const optLabel = (item: InfolistItem, key: string) => {
  const opt = item.options?.[key];
  return opt ? (props.ar ? opt.labelAr || opt.label : opt.label) : key;
};
const hintOf = (item: InfolistItem) => (props.ar ? item.hintAr || item.hint : item.hint);
const RenderValue = (p: { item: InfolistItem }) => p.item.render?.(p.item.value);
</script>

<template>
  <dl :class="cn('grid grid-cols-1 gap-x-8 gap-y-4', grid)">
    <div
      v-for="item in visible()"
      :key="item.id"
      data-slot="infolist-item"
      :class="cn('min-w-0', layout === 'inline' ? 'flex items-baseline justify-between gap-4 border-b border-border pb-3' : 'flex flex-col gap-1', item.wide && span)"
    >
      <dt :class="cn('text-caption text-muted-foreground', layout === 'inline' && 'shrink-0')">
        <bdi dir="auto">{{ ar ? item.labelAr || item.label : item.label }}</bdi>
      </dt>
      <dd :class="cn('m-0 flex min-w-0 items-center gap-1.5 text-body text-foreground', layout === 'inline' && 'justify-end text-end')">
        <span v-if="isBlankItem(item)" class="inline-flex items-center gap-1 text-muted-foreground">
          <Minus aria-hidden="true" class="size-3.5" />
          {{ t.empty }}
        </span>
        <RenderValue v-else-if="item.render" :item="item" />
        <template v-else-if="item.type === 'boolean'">
          <NqBadge v-if="item.value" variant="success"><Check aria-hidden="true" />{{ t.yes }}</NqBadge>
          <NqBadge v-else variant="neutral"><X aria-hidden="true" />{{ t.no }}</NqBadge>
        </template>
        <NqBadge v-else-if="item.type === 'enum'" :variant="item.options?.[String(item.value)]?.variant ?? 'neutral'">
          <component :is="item.options![String(item.value)]!.icon" v-if="item.options?.[String(item.value)]?.icon" aria-hidden="true" />
          <bdi dir="auto">{{ optLabel(item, String(item.value)) }}</bdi>
        </NqBadge>
        <span v-else-if="item.type === 'number'" class="inline-flex items-baseline gap-1">
          <NqNum :value="Number(item.value)" />
          <bdi v-if="item.unit" dir="auto" class="text-muted-foreground">{{ item.unit }}</bdi>
        </span>
        <NqDateTime v-else-if="item.type === 'date'" :value="item.value as string | Date" />
        <NqDateTime v-else-if="item.type === 'datetime'" :value="item.value as string | Date" relative />
        <a v-else-if="item.type === 'email'" :href="`mailto:${String(item.value)}`" dir="ltr" class="break-all text-foreground underline underline-offset-2">{{ String(item.value) }}</a>
        <a v-else-if="item.type === 'tel'" :href="`tel:${String(item.value).replace(/\s+/g, '')}`" dir="ltr" class="text-foreground underline underline-offset-2">{{ String(item.value) }}</a>
        <template v-else-if="item.type === 'url'">
          <a v-if="/^https?:\/\//i.test(String(item.value))" :href="String(item.value)" target="_blank" rel="noreferrer noopener" dir="ltr" class="break-all text-foreground underline underline-offset-2">{{ String(item.value) }}</a>
          <span v-else dir="ltr" class="break-all">{{ String(item.value) }}</span>
        </template>
        <code v-else-if="item.type === 'code'" dir="ltr" class="rounded-control bg-muted px-1.5 py-0.5 font-mono text-caption break-all">{{ String(item.value) }}</code>
        <span v-else-if="item.type === 'list'" class="flex flex-wrap gap-1">
          <NqBadge v-for="(entry, i) in item.value as unknown[]" :key="`${String(entry)}-${i}`" :variant="item.options?.[String(entry)]?.variant ?? 'outline'">
            <bdi dir="auto">{{ optLabel(item, String(entry)) }}</bdi>
          </NqBadge>
        </span>
        <bdi v-else dir="auto" class="whitespace-pre-line">{{ String(item.value) }}</bdi>
        <NqCopyButton v-if="copyText(item)" :value="copyText(item)!" :label="t.copy" size="icon-sm" />
      </dd>
      <p v-if="hintOf(item)" class="text-caption text-muted-foreground">{{ hintOf(item) }}</p>
    </div>
  </dl>
</template>
