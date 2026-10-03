<script setup lang="ts">
import { ChevronRight, ImageIcon, Monitor, Smartphone } from "lucide-vue-next";
import { computed, getCurrentInstance, h, ref, type FunctionalComponent, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { NqField, NqFieldLabel, NqInput, NqTextarea } from "../field";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { NqTabs, NqTabsList, NqTabsPanel, NqTabsTab } from "../tabs";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import NqLengthMeter from "./NqLengthMeter.vue";
import { breadcrumbFor, hostOf, truncateAt } from "./seo-math";
import { SEO_STRINGS, type SeoMeta, type SeoPreviewLabels, type SeoPreviewPlatform } from "./seo-strings";

// A Google result (desktop and mobile) and Open Graph, X, WhatsApp and LinkedIn share cards for one page, with the
// title and description length meters and optional editing fields. Platform names are text: no logo is drawn.
interface Props {
  /** Controlled meta (`v-model`). */
  modelValue?: SeoMeta;
  /** Initial meta when uncontrolled. */
  defaultValue?: SeoMeta;
  /** Which preview shows first. Default "google". */
  defaultPlatform?: SeoPreviewPlatform;
  /** Show the fields even when nothing listens to `update:modelValue`. Default: only with a listener. */
  editable?: boolean;
  title?: string;
  description?: string;
  labels?: Partial<SeoPreviewLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { modelValue: undefined, defaultValue: undefined, defaultPlatform: "google", editable: undefined, title: undefined, description: undefined, labels: undefined });
const emit = defineEmits<{ "update:modelValue": [value: SeoMeta] }>();

const t = useAnalyticsLabels(SEO_STRINGS, () => props.labels);
const instance = getCurrentInstance();
const state = ref<SeoMeta>(props.defaultValue ?? { title: "", description: "", url: "" });
const platform = ref<string>(props.defaultPlatform);
const device = ref<"desktop" | "mobile">("desktop");
const meta = computed(() => props.modelValue ?? state.value);
const canEdit = computed(() => props.editable ?? typeof instance?.vnode.props?.["onUpdate:modelValue"] !== "undefined");
function set(patch: Partial<SeoMeta>) {
  const next = { ...meta.value, ...patch };
  if (props.modelValue === undefined) state.value = next;
  emit("update:modelValue", next);
}
function setDevice(v: string[]) {
  if (v[0]) device.value = v[0] as "desktop" | "mobile";
}

const mobile = computed(() => device.value === "mobile");
const site = computed(() => meta.value.siteName || hostOf(meta.value.url) || t.value.siteFallback);
const crumbs = computed(() => breadcrumbFor(meta.value.url, meta.value.breadcrumb));
const shownTitle = computed(() => meta.value.title.trim() || t.value.noTitle);
const shownDescription = computed(() => meta.value.description.trim() || t.value.noDescription);
const googleTitle = computed(() => (meta.value.title.trim() ? truncateAt(meta.value.title, mobile.value ? 70 : 60) : t.value.noTitle));
const googleDescription = computed(() => (meta.value.description.trim() ? truncateAt(meta.value.description, mobile.value ? 120 : 160) : t.value.noDescription));
const host = computed(() => hostOf(meta.value.url));
const firstLetter = computed(() => [...(meta.value.siteName || hostOf(meta.value.url))][0]);

/** The card's favicon: the image, or the first letter of the site name. */
const Favicon: FunctionalComponent<{ class?: string }> = (p) =>
  meta.value.favicon
    ? h("img", { src: meta.value.favicon, alt: "", class: cn("size-[18px] shrink-0 rounded-full", p.class) })
    : h("span", { "aria-hidden": "true", class: cn("flex size-[18px] shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold uppercase text-muted-foreground", p.class) }, firstLetter.value);
Favicon.props = ["class"];

/** The share image, or a placeholder. */
const ShareImage: FunctionalComponent<{ class?: string }> = (p) =>
  meta.value.image
    ? h("img", { src: meta.value.image, alt: "", class: cn("aspect-[1.91/1] w-full object-cover", p.class) })
    : h("div", { class: cn("flex aspect-[1.91/1] w-full flex-col items-center justify-center gap-1 bg-secondary text-caption text-muted-foreground", p.class) }, [h(ImageIcon, { "aria-hidden": "true", class: "size-6" }), t.value.noImage]);
ShareImage.props = ["class"];
</script>

<template>
  <NqCard data-slot="seo-preview" :class="props.class">
    <NqCardHeader>
      <NqCardTitle as="h3"><slot name="title">{{ props.title ?? t.title }}</slot></NqCardTitle>
      <NqCardDescription><slot name="description">{{ props.description ?? t.description }}</slot></NqCardDescription>
    </NqCardHeader>
    <NqCardContent class="flex flex-col gap-5">
      <NqTabs v-model="platform">
        <NqTabsList variant="underline">
          <NqTabsTab value="google">{{ t.google }}</NqTabsTab>
          <NqTabsTab value="open-graph">{{ t.openGraph }}</NqTabsTab>
          <NqTabsTab value="x">{{ t.x }}</NqTabsTab>
          <NqTabsTab value="whatsapp">{{ t.whatsapp }}</NqTabsTab>
          <NqTabsTab value="linkedin">{{ t.linkedin }}</NqTabsTab>
        </NqTabsList>
        <NqTabsPanel value="google" class="flex flex-col gap-3 pt-4">
          <NqToggleGroup :model-value="[device]" :aria-label="t.device" @update:model-value="setDevice">
            <NqToggle value="desktop">
              <Monitor aria-hidden="true" />
              {{ t.desktop }}
            </NqToggle>
            <NqToggle value="mobile">
              <Smartphone aria-hidden="true" />
              {{ t.mobile }}
            </NqToggle>
          </NqToggleGroup>
          <div data-slot="seo-google" :data-device="mobile ? 'mobile' : 'desktop'" :class="cn('flex flex-col gap-1 rounded-card border border-border bg-card p-4', mobile ? 'w-full max-w-[22rem]' : 'max-w-[41rem]')">
            <div class="flex items-center gap-2.5">
              <Favicon class="size-7 border border-border" />
              <div class="flex min-w-0 flex-col leading-tight">
                <span class="truncate text-body-sm text-foreground" dir="auto">{{ site }}</span>
                <span dir="ltr" class="flex min-w-0 items-center gap-1 text-caption text-muted-foreground">
                  <span v-for="(c, i) in crumbs" :key="`${c}-${i}`" class="flex min-w-0 items-center gap-1">
                    <ChevronRight v-if="i > 0" aria-hidden="true" class="size-3 shrink-0" />
                    <span class="truncate">{{ c }}</span>
                  </span>
                </span>
              </div>
            </div>
            <p dir="auto" :class="cn('mt-1 font-medium text-nq-info-text', mobile ? 'line-clamp-2 text-body' : 'line-clamp-1 text-h5')">{{ googleTitle }}</p>
            <p dir="auto" :class="cn('text-body-sm text-muted-foreground', mobile ? 'line-clamp-3' : 'line-clamp-2')">{{ googleDescription }}</p>
          </div>
        </NqTabsPanel>
        <NqTabsPanel value="open-graph" class="pt-4">
          <div data-slot="seo-open-graph" class="w-full max-w-[32rem] overflow-hidden rounded-card border border-border bg-card">
            <ShareImage />
            <div class="flex flex-col gap-0.5 border-t border-border bg-secondary/50 p-3">
              <span dir="ltr" class="truncate text-start text-caption uppercase text-muted-foreground">{{ host }}</span>
              <p dir="auto" class="line-clamp-2 text-label text-foreground">{{ shownTitle }}</p>
              <p dir="auto" class="line-clamp-2 text-caption text-muted-foreground">{{ shownDescription }}</p>
            </div>
          </div>
        </NqTabsPanel>
        <NqTabsPanel value="x" class="pt-4">
          <div data-slot="seo-x" class="w-full max-w-[32rem]">
            <div class="relative overflow-hidden rounded-2xl border border-border bg-card">
              <ShareImage class="aspect-[2/1]" />
              <span dir="auto" class="absolute bottom-2 start-2 max-w-[80%] truncate rounded-md bg-foreground/70 px-1.5 py-0.5 text-caption text-background">{{ shownTitle }}</span>
            </div>
            <p dir="ltr" class="mt-1 px-1 text-start text-caption text-muted-foreground">{{ host }}</p>
          </div>
        </NqTabsPanel>
        <NqTabsPanel value="whatsapp" class="pt-4">
          <div data-slot="seo-whatsapp" class="flex w-full max-w-[24rem] flex-col gap-1 rounded-card bg-secondary p-2">
            <div class="overflow-hidden rounded-md bg-card">
              <ShareImage />
              <div class="flex flex-col gap-0.5 p-2.5">
                <p dir="auto" class="line-clamp-2 text-label text-foreground">{{ shownTitle }}</p>
                <p dir="auto" class="line-clamp-2 text-caption text-muted-foreground">{{ shownDescription }}</p>
                <span dir="ltr" class="truncate text-start text-caption text-muted-foreground">{{ host }}</span>
              </div>
            </div>
            <span dir="ltr" class="truncate px-1 text-start text-caption text-nq-info-text">{{ meta.url }}</span>
          </div>
        </NqTabsPanel>
        <NqTabsPanel value="linkedin" class="pt-4">
          <div data-slot="seo-linkedin" class="w-full max-w-[32rem] overflow-hidden rounded-card border border-border bg-card">
            <ShareImage />
            <div class="flex flex-col gap-0.5 p-3">
              <p dir="auto" class="line-clamp-2 text-label text-foreground">{{ shownTitle }}</p>
              <span dir="ltr" class="truncate text-start text-caption text-muted-foreground">{{ host }}</span>
            </div>
          </div>
        </NqTabsPanel>
      </NqTabs>
      <div class="grid gap-4 md:grid-cols-2">
        <template v-if="canEdit">
          <NqField>
            <NqFieldLabel>{{ t.fieldTitle }}</NqFieldLabel>
            <NqInput dir="auto" :model-value="meta.title" @update:model-value="(v) => set({ title: String(v ?? '') })" />
          </NqField>
          <NqField>
            <NqFieldLabel>{{ t.fieldUrl }}</NqFieldLabel>
            <NqInput ltr :model-value="meta.url" @update:model-value="(v) => set({ url: String(v ?? '') })" />
          </NqField>
          <NqField class="md:col-span-2">
            <NqFieldLabel>{{ t.fieldDescription }}</NqFieldLabel>
            <NqTextarea dir="auto" rows="3" :model-value="meta.description" @update:model-value="(v) => set({ description: v ?? '' })" />
          </NqField>
          <NqField class="md:col-span-2">
            <NqFieldLabel>{{ t.fieldImage }}</NqFieldLabel>
            <NqInput ltr :model-value="meta.image ?? ''" @update:model-value="(v) => set({ image: String(v ?? '') || undefined })" />
          </NqField>
        </template>
        <NqLengthMeter field="title" :text="meta.title" :labels="props.labels" />
        <NqLengthMeter field="description" :text="meta.description" :labels="props.labels" />
      </div>
    </NqCardContent>
  </NqCard>
</template>
