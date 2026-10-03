<script setup lang="ts">
import { Download } from "lucide-vue-next";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCard } from "../card";
import { NqProductMark } from "../product-mark";
import { NqUserText } from "../text-utilities";
import { fill, type BrandDownload } from "./logic";
import type { BrandGuidelinesLabels } from "./strings";
import { useBrandStrings } from "./use-strings";

/** One downloadable file on a light or dark ground, with the file type and a download link. The `preview` slot replaces the default mark. */
interface Props {
  asset: Omit<BrandDownload, "ground"> & { description?: string; ground?: "light" | "dark" };
  brand?: string;
  labels?: BrandGuidelinesLabels;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const emit = defineEmits<{ download: [asset: Props["asset"]] }>();
const t = useBrandStrings(() => props.labels);
</script>

<template>
  <NqCard data-slot="brand-asset-card" :class="cn('overflow-hidden', props.class)">
    <div :data-theme="props.asset.ground === 'dark' ? 'dark' : 'light'" class="flex aspect-[16/10] items-center justify-center border-b border-border bg-background p-6">
      <slot name="preview" :asset="props.asset"><NqProductMark :brand="props.brand" :size="72" :on-dark="props.asset.ground === 'dark'" title="" /></slot>
    </div>
    <div class="flex items-center justify-between gap-3 p-3">
      <div class="flex min-w-0 flex-col gap-0.5">
        <span class="flex items-center gap-2 text-label text-foreground">
          <NqUserText class="truncate">{{ props.asset.name }}</NqUserText>
          <NqBadge variant="outline">{{ props.asset.format }}</NqBadge>
        </span>
        <span v-if="props.asset.description" class="text-caption text-muted-foreground">{{ props.asset.description }}</span>
      </div>
      <NqButton variant="secondary" size="sm" as-child :aria-label="fill(t.downloadFor, { name: props.asset.name })">
        <a :href="props.asset.href" :download="props.asset.filename" @click="emit('download', props.asset)">
          <Download aria-hidden="true" />
          {{ t.download }}
        </a>
      </NqButton>
    </div>
  </NqCard>
</template>
