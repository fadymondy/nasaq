<script setup lang="ts">
import { ArrowRight } from "lucide-vue-next";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { NqIcon } from "../icon";
import { NqStoreProductImage } from "../store-listing";
import { useMerchStrings, type MerchLabels } from "./strings";
import { MERCH_TONES, type StoreBanner } from "./types";

// Internal: one slide of the hero banner.
const props = defineProps<{ banner: StoreBanner; eager: boolean; labels?: MerchLabels }>();
const emit = defineEmits<{ select: [banner: StoreBanner] }>();
const { t } = useMerchStrings(() => props.labels);
</script>

<template>
  <div :class="cn('relative grid min-h-64 overflow-hidden rounded-card md:min-h-96 md:grid-cols-2', MERCH_TONES[props.banner.tone ?? 'brand'])">
    <div class="z-10 flex flex-col items-start justify-center gap-3 p-6 md:p-12">
      <span v-if="props.banner.eyebrow" class="text-label opacity-80">{{ props.banner.eyebrow }}</span>
      <h2 class="text-h1 text-balance">{{ props.banner.title }}</h2>
      <p v-if="props.banner.description" class="max-w-md text-body opacity-90">{{ props.banner.description }}</p>
      <NqButton size="lg" variant="secondary" as="a" :href="props.banner.href ?? '#'" @click="emit('select', props.banner)">
        {{ props.banner.cta ?? t.shopNow }}
        <NqIcon :icon="ArrowRight" directional />
      </NqButton>
    </div>
    <div class="relative order-first aspect-[16/9] md:absolute md:inset-y-0 md:end-0 md:order-none md:aspect-auto md:w-1/2">
      <NqStoreProductImage :src="props.banner.image" :alt="props.banner.imageAlt ?? ''" :eager="props.eager" />
    </div>
  </div>
</template>
