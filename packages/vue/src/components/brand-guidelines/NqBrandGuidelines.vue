<script setup lang="ts">
import { computed, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqProductLogo } from "../product-mark";
import { NqScrollFade, NqUserText } from "../text-utilities";
import NqBrandAssetCard from "./NqBrandAssetCard.vue";
import NqBrandDoDont from "./NqBrandDoDont.vue";
import NqBrandOgCard, { type BrandOgCard } from "./NqBrandOgCard.vue";
import NqBrandSwatch from "./NqBrandSwatch.vue";
import { brandMarkDownloads, brandPalette, type BrandColor, type BrandDownload } from "./logic";
import type { BrandGuidelinesLabels, BrandRule } from "./strings";
import { useBrandStrings } from "./use-strings";

/**
 * A brand guidelines page: the logo with downloads, the palette with copyable values, typography, do and don't, and the
 * social cards. By default it shows the brand package's own mark and palette. It never draws a logo of its own and
 * never offers font files.
 */
type Asset = Omit<BrandDownload, "ground"> & { description?: string; ground?: "light" | "dark" };
interface Font {
  id: string;
  /** The family name, as the licence holder calls it. */
  family: string;
  /** What it is used for ("Headings and body", "Numbers and labels"). */
  role: string;
  /** A line set in the font. It uses the app's own faces, so it only matches when the font is loaded. */
  sample?: string;
  kind?: "sans" | "mono";
  weights?: string;
  /** One line about the licence. */
  licence?: string;
  /** Where to get the font: the foundry or licence page. */
  href?: string;
}
interface Props {
  /** The brand this page documents. Its mark, palette and downloads come from the brand package. */
  brand: string;
  /** Page title. Default: the guidelines label. */
  title?: string;
  /** One or two sentences about the brand, above the sections. */
  intro?: string;
  /** Logo downloads. Default: the official mark on a light and a dark ground. */
  assets?: readonly Asset[];
  /** Colours. Default: the brand's own palette. */
  colors?: readonly BrandColor[];
  fonts?: readonly Font[];
  /** Rules. Default: the built-in logo and colour rules. Pass `[]` to hide a column. */
  dos?: readonly BrandRule[];
  donts?: readonly BrandRule[];
  ogCards?: readonly BrandOgCard[];
  labels?: BrandGuidelinesLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { title: undefined, intro: undefined, assets: undefined, colors: undefined, fonts: () => [], dos: undefined, donts: undefined, ogCards: () => [], labels: undefined });
const emit = defineEmits<{ download: [asset: Asset] }>();
defineSlots<{ intro?: () => unknown; "asset-preview"?: (p: { asset: Asset }) => unknown; "rule-example"?: (p: { rule: BrandRule; kind: "do" | "dont" }) => unknown }>();

const t = useBrandStrings(() => props.labels);
const id = useId();
const downloads = computed<readonly Asset[]>(() => props.assets ?? brandMarkDownloads(props.brand, { light: t.value.onLight, dark: t.value.onDark }));
const palette = computed(() => props.colors ?? brandPalette(props.brand));
const doList = computed(() => props.dos ?? t.value.defaultDos);
const dontList = computed(() => props.donts ?? t.value.defaultDonts);
const visible = computed(() =>
  [
    { key: "logo", label: t.value.logo, show: downloads.value.length > 0 },
    { key: "color", label: t.value.color, show: palette.value.length > 0 },
    { key: "typography", label: t.value.typography, show: props.fonts.length > 0 },
    { key: "usage", label: t.value.usage, show: doList.value.length + dontList.value.length > 0 },
    { key: "social", label: t.value.social, show: props.ogCards.length > 0 },
  ].filter((s) => s.show),
);
</script>

<template>
  <div data-slot="brand-guidelines" :class="cn('flex min-w-0 flex-col gap-10', props.class)">
    <header class="flex flex-col gap-4">
      <NqProductLogo :brand="props.brand" :size="40" />
      <h1 class="text-h1 text-foreground">{{ props.title ?? t.guidelines }}</h1>
      <p v-if="props.intro || $slots.intro" class="max-w-prose text-body text-muted-foreground"><slot name="intro">{{ props.intro }}</slot></p>
      <nav v-if="visible.length > 1" :aria-label="t.sections">
        <NqScrollFade :label="t.sections">
          <NqButton v-for="s in visible" :key="s.key" variant="secondary" size="sm" as-child>
            <a :href="`#${id}-${s.key}`">{{ s.label }}</a>
          </NqButton>
        </NqScrollFade>
      </nav>
    </header>

    <section v-if="downloads.length" :aria-labelledby="`${id}-logo`" class="flex flex-col gap-4">
      <div class="flex flex-col gap-1">
        <h2 :id="`${id}-logo`" class="text-h2 text-foreground">{{ t.logo }}</h2>
        <p class="max-w-prose text-body text-muted-foreground">{{ t.logoIntro }}</p>
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <NqBrandAssetCard v-for="asset in downloads" :key="asset.id" :asset="asset" :brand="props.brand" :labels="props.labels" @download="emit('download', $event)">
          <template v-if="$slots['asset-preview']" #preview="{ asset: a }"><slot name="asset-preview" :asset="a" /></template>
        </NqBrandAssetCard>
      </div>
    </section>

    <section v-if="palette.length" :aria-labelledby="`${id}-color`" class="flex flex-col gap-4">
      <div class="flex flex-col gap-1">
        <h2 :id="`${id}-color`" class="text-h2 text-foreground">{{ t.color }}</h2>
        <p class="max-w-prose text-body text-muted-foreground">{{ t.colorIntro }}</p>
      </div>
      <div class="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-3">
        <NqBrandSwatch v-for="color in palette" :key="color.id" :color="color" :labels="props.labels" />
      </div>
    </section>

    <section v-if="props.fonts.length" :aria-labelledby="`${id}-typography`" class="flex flex-col gap-4">
      <div class="flex flex-col gap-1">
        <h2 :id="`${id}-typography`" class="text-h2 text-foreground">{{ t.typography }}</h2>
        <p class="max-w-prose text-body text-muted-foreground">{{ t.typographyIntro }}</p>
      </div>
      <ul class="grid gap-4 sm:grid-cols-2">
        <li v-for="font in props.fonts" :key="font.id" class="flex min-w-0 flex-col gap-2 rounded-card border border-border bg-card p-4">
          <span class="flex items-center justify-between gap-2">
            <bdi dir="ltr" class="text-label text-foreground">{{ font.family }}</bdi>
            <NqBadge variant="outline">{{ font.role }}</NqBadge>
          </span>
          <NqUserText v-if="font.sample" block :class="cn('text-h2 text-foreground', font.kind === 'mono' ? 'font-mono' : 'font-sans')">{{ font.sample }}</NqUserText>
          <dl class="flex flex-col gap-0.5 text-caption text-muted-foreground">
            <div v-if="font.weights" class="flex gap-2">
              <dt>{{ t.weights }}</dt>
              <dd dir="ltr">{{ font.weights }}</dd>
            </div>
            <div v-if="font.licence" class="flex gap-2">
              <dt>{{ t.licence }}</dt>
              <dd>
                <a v-if="font.href" class="underline underline-offset-4" :href="font.href" target="_blank" rel="noopener noreferrer">{{ font.licence }}</a>
                <template v-else>{{ font.licence }}</template>
              </dd>
            </div>
          </dl>
        </li>
      </ul>
    </section>

    <section v-if="doList.length + dontList.length > 0" :aria-labelledby="`${id}-usage`" class="flex flex-col gap-4">
      <div class="flex flex-col gap-1">
        <h2 :id="`${id}-usage`" class="text-h2 text-foreground">{{ t.usage }}</h2>
        <p class="max-w-prose text-body text-muted-foreground">{{ t.usageIntro }}</p>
      </div>
      <NqBrandDoDont :dos="doList" :donts="dontList" :labels="props.labels">
        <template v-if="$slots['rule-example']" #example="p"><slot name="rule-example" v-bind="p" /></template>
      </NqBrandDoDont>
    </section>

    <section v-if="props.ogCards.length" :aria-labelledby="`${id}-social`" class="flex flex-col gap-4">
      <div class="flex flex-col gap-1">
        <h2 :id="`${id}-social`" class="text-h2 text-foreground">{{ t.social }}</h2>
        <p class="max-w-prose text-body text-muted-foreground">{{ t.socialIntro }}</p>
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <NqBrandOgCard v-for="card in props.ogCards" :key="card.id" :card="card" :brand="props.brand" :labels="props.labels" />
      </div>
    </section>

    <p v-if="visible.length === 0" class="text-body text-muted-foreground">{{ t.noSections }}</p>
  </div>
</template>
