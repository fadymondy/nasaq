<script setup lang="ts">
import { BadgeCheck, Heart, LifeBuoy, RotateCcw, Share2, ShieldCheck, TriangleAlert, Truck } from "lucide-vue-next";
import { computed, getCurrentInstance, h, onBeforeUnmount, onMounted, ref, useSlots, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqAccordion, NqAccordionItem, NqAccordionPanel, NqAccordionTrigger } from "../accordion";
import { NqBadge } from "../badge";
import { NqBreadcrumb, NqBreadcrumbItem, NqBreadcrumbLink, NqBreadcrumbList, NqBreadcrumbPage, NqBreadcrumbSeparator } from "../breadcrumb";
import { NqButton } from "../button";
import { formatDateRange, useFormatNumber } from "../numeric";
import { NqPrice } from "../price";
import { NqRating } from "../rating";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqTabs, NqTabsList, NqTabsPanel, NqTabsTab } from "../tabs";
import { commerceFindVariant, commerceInStock, type CommerceOption, type CommerceProduct, type CommerceSelection, type CommerceVariant } from "./commerce";
import NqProductGallery from "./NqProductGallery.vue";
import NqProductQuantityStepper from "./NqProductQuantityStepper.vue";
import NqProductSizeGuide, { type ProductSizeGuideData } from "./NqProductSizeGuide.vue";
import NqProductVariantPicker from "./NqProductVariantPicker.vue";
import { clampPurchaseQuantity, deliveryWindow, displayPrice, galleryIndexForImage, imageForSelection, initialSelection, maxPurchasable, missingOptions, stockState } from "./pdp-logic";
import { usePdpStrings, type ProductDetailLabels } from "./pdp-strings";

export interface ProductBreadcrumb {
  label: string;
  href?: string;
}
export interface ProductSpec {
  label: string;
  value: string | number;
}
export interface ProductDeliveryCity {
  id: string;
  label: string;
  /** Delivery days range to this city. */
  etaDays: [number, number];
  /** Delivery fee in minor units. 0 or omitted = free. */
  fee?: number;
}
export interface ProductDeliveryConfig {
  cities: readonly ProductDeliveryCity[];
  defaultCityId?: string;
  /** 0 = Sunday ... 6 = Saturday, not counted as delivery days (Egypt: 5 and 6). */
  skipWeekdays?: readonly number[];
  /** UTC hour after which an order counts from the next day. */
  cutoffHour?: number;
  /** "Now" for the estimate. Pass a fixed date in stories and tests. Default: the current time. */
  now?: Date | string | number;
}
export type ProductTrustIcon = "secure" | "returns" | "delivery" | "authentic" | "support";
export interface ProductTrustBadge {
  id: string;
  icon?: ProductTrustIcon;
  label: string;
  description?: string;
}
export type ProductActionResult = void | { error?: string };

const TRUST_ICON = { secure: ShieldCheck, returns: RotateCcw, delivery: Truck, authentic: BadgeCheck, support: LifeBuoy } as const;

// A complete product page: breadcrumbs, gallery, title, rating, price with compare-at and percent off, variant
// picker, quantity, stock and delivery lines, add to cart and buy now, wishlist and share, trust badges, a mobile
// sticky add bar, a size guide, description, specifications and shipping sections, and slots for reviews and
// related products. It holds no cart. Hooks out are events:
//   @add-to-cart(variant, quantity), @buy-now(variant, quantity): a handler may return a promise, or { error }, to show a failure
//   @variant-change(variant | undefined, selection), @wishlist-change(wishlisted), @share()
// "Buy now" shows only with a @buy-now listener; the heart only with @wishlist-change or a `wishlisted` prop.
// Slots: description, shipping-info, reviews, related, option-action ({ option }).
interface Props {
  product: CommerceProduct;
  /** ISO 4217 code of the store currency. Defaults to USD, or SAR in Arabic. */
  currency?: string;
  /** Digits after the decimal point of the currency's minor unit. Default 2. */
  currencyExponent?: number;
  /** Open on this variant (default: the first one in stock). */
  defaultVariantId?: string;
  /** Open with nothing picked, so the shopper must choose a size or colour first. */
  blankSelection?: boolean;
  /** Controlled heart state (v-model:wishlisted). */
  wishlisted?: boolean;
  defaultWishlisted?: boolean;
  shareUrl?: string;
  breadcrumbs?: readonly ProductBreadcrumb[];
  sizeGuide?: ProductSizeGuideData;
  /** The option axis the size guide belongs to. Default "size". */
  sizeGuideOptionId?: string;
  /** "hide" (default) removes impossible values from the picker; "disable" greys them out. */
  impossible?: "hide" | "disable";
  /** Stock at or below this reads as low stock. Default 5. */
  lowStockThreshold?: number;
  /** Most units one order may hold, on top of stock. */
  maxPerOrder?: number;
  delivery?: ProductDeliveryConfig;
  /** Long description. Default: `product.description`. The `description` slot replaces it. */
  description?: string;
  specs?: readonly ProductSpec[];
  /** Shipping and returns copy. The tab is omitted without it (or the `shipping-info` slot). */
  shippingInfo?: string;
  /** "auto" (default): tabs from 768px, an accordion below. */
  sections?: "auto" | "tabs" | "accordion";
  /** `false` hides the row; default shows four generic badges. */
  trustBadges?: readonly ProductTrustBadge[] | false;
  relatedTitle?: string;
  /** Fixed add-to-cart bar on phones once the main button scrolls away. Default true. */
  stickyBar?: boolean;
  labels?: ProductDetailLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  currency: undefined,
  currencyExponent: 2,
  defaultVariantId: undefined,
  blankSelection: false,
  wishlisted: undefined,
  defaultWishlisted: false,
  shareUrl: undefined,
  breadcrumbs: undefined,
  sizeGuide: undefined,
  sizeGuideOptionId: "size",
  impossible: "hide",
  lowStockThreshold: 5,
  maxPerOrder: undefined,
  delivery: undefined,
  description: undefined,
  specs: undefined,
  shippingInfo: undefined,
  sections: "auto",
  trustBadges: undefined,
  relatedTitle: undefined,
  stickyBar: true,
  labels: undefined,
});
const emit = defineEmits<{
  "add-to-cart": [variant: CommerceVariant, quantity: number];
  "buy-now": [variant: CommerceVariant, quantity: number];
  "variant-change": [variant: CommerceVariant | undefined, selection: CommerceSelection];
  "wishlist-change": [wishlisted: boolean];
  "update:wishlisted": [wishlisted: boolean];
  share: [];
}>();
const slots = useSlots();
defineSlots<{
  description?: () => unknown;
  "shipping-info"?: () => unknown;
  reviews?: () => unknown;
  related?: () => unknown;
  "option-action"?: (props: { option: CommerceOption }) => unknown;
}>();

const instance = getCurrentInstance();
// Listeners are read from the vnode so a returned promise or { error } can drive the button state.
const listeners = (name: string): ((...args: unknown[]) => unknown)[] => {
  const handler = (instance?.vnode.props as Record<string, unknown> | null | undefined)?.[name];
  return (Array.isArray(handler) ? handler : handler ? [handler] : []) as ((...args: unknown[]) => unknown)[];
};
const hasListener = (name: string) => listeners(name).length > 0;

const s = usePdpStrings(() => props.labels);
const currency = useCurrency(() => props.currency);
const fmt = useFormatNumber();

const query = "(min-width: 768px)";
const wide = ref(true);
let mq: MediaQueryList | undefined;
const onMq = () => {
  wide.value = mq?.matches ?? true;
};
const ctaRef = ref<HTMLElement | null>(null);
const pickerRef = ref<HTMLElement | null>(null);
const reviewsRef = ref<HTMLElement | null>(null);
let timer: ReturnType<typeof setTimeout> | undefined;
let io: IntersectionObserver | undefined;
const statusId = `nq-pdp-status-${Math.random().toString(36).slice(2, 8)}`;

const selection = ref<CommerceSelection>(initialSelection(props.product, { variantId: props.defaultVariantId, blank: props.blankSelection }));
const variant = computed(() => commerceFindVariant(props.product, selection.value));
const galleryIndex = ref(Math.max(galleryIndexForImage(props.product.images, imageForSelection(props.product, selection.value, variant.value)), 0));
const quantity = ref(1);
const pending = ref<"add" | "buy" | null>(null);
const status = ref<{ kind: "ok" | "error" | "info"; text: string } | null>(null);
const invalid = ref<string[]>([]);
const cityId = ref<string | undefined>(props.delivery?.defaultCityId ?? props.delivery?.cities[0]?.id);
const wishInner = ref(props.defaultWishlisted);
const barVisible = ref(false);

const wish = computed(() => props.wishlisted ?? wishInner.value);
const stock = computed(() => stockState(variant.value, props.lowStockThreshold));
const max = computed(() => maxPurchasable(variant.value, props.maxPerOrder));
const qty = computed(() => clampPurchaseQuantity(quantity.value, variant.value, props.maxPerOrder));
const price = computed(() => displayPrice(props.product, variant.value));
const soldOut = computed(() => stock.value.kind === "out");
const minor = computed(() => 10 ** props.currencyExponent);
const money = (amount: number) =>
  fmt(amount / minor.value, { style: "currency", currency: currency.value, minimumFractionDigits: 0, maximumFractionDigits: amount % minor.value === 0 ? 0 : props.currencyExponent });

onMounted(() => {
  if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
    mq = window.matchMedia(query);
    wide.value = mq.matches;
    mq.addEventListener?.("change", onMq);
  }
  if (ctaRef.value && props.stickyBar && typeof IntersectionObserver !== "undefined") {
    io = new IntersectionObserver(([entry]) => (barVisible.value = entry ? !entry.isIntersecting && entry.boundingClientRect.top < 0 : false), { threshold: 0 });
    io.observe(ctaRef.value);
  }
});
onBeforeUnmount(() => {
  clearTimeout(timer);
  io?.disconnect();
  mq?.removeEventListener?.("change", onMq);
});

const change = (next: CommerceSelection) => {
  selection.value = next;
  invalid.value = [];
  status.value = null;
  const nextVariant = commerceFindVariant(props.product, next);
  const at = galleryIndexForImage(props.product.images, imageForSelection(props.product, next, nextVariant));
  if (at >= 0) galleryIndex.value = at;
  quantity.value = clampPurchaseQuantity(quantity.value, nextVariant, props.maxPerOrder);
  emit("variant-change", nextVariant, next);
};

const flash = (next: { kind: "ok" | "error" | "info"; text: string } | null) => {
  status.value = next;
  clearTimeout(timer);
  if (next?.kind === "ok" || next?.kind === "info") timer = setTimeout(() => (status.value = null), 4000);
};

const run = async (kind: "add" | "buy") => {
  if (pending.value) return;
  const v = variant.value;
  if (!v) {
    const missing = missingOptions(props.product, selection.value);
    invalid.value = missing.map((o) => o.id);
    flash({ kind: "error", text: s.value.t.pickFirst(missing.map((o) => o.name).join(" / ")) });
    pickerRef.value?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    return;
  }
  if (!commerceInStock(v, qty.value)) return;
  const name = kind === "add" ? "onAddToCart" : "onBuyNow";
  const handlers = listeners(name);
  if (!handlers.length) return;
  pending.value = kind;
  flash(null);
  try {
    const results = await Promise.all(handlers.map((fn) => fn(v, qty.value)));
    const failure = results.find((r) => r && typeof r === "object" && (r as { error?: string }).error) as { error: string } | undefined;
    if (failure) flash({ kind: "error", text: failure.error });
    else if (kind === "add") flash({ kind: "ok", text: s.value.t.added });
  } catch {
    flash({ kind: "error", text: s.value.t.addFailed });
  } finally {
    pending.value = null;
  }
};

const toggleWish = () => {
  const next = !wish.value;
  if (props.wishlisted === undefined) wishInner.value = next;
  emit("update:wishlisted", next);
  emit("wishlist-change", next);
};

const share = async () => {
  if (hasListener("onShare")) {
    emit("share");
    return;
  }
  const url = props.shareUrl ?? (typeof location === "undefined" ? "" : location.href);
  try {
    if (typeof navigator !== "undefined" && "share" in navigator && typeof navigator.share === "function") await navigator.share({ title: props.product.name, url });
    else {
      await navigator.clipboard.writeText(url);
      flash({ kind: "info", text: s.value.t.linkCopied });
    }
  } catch {
    /* dismissed */
  }
};

const city = computed(() => props.delivery?.cities.find((c) => c.id === cityId.value));
const eta = computed(() => {
  const d = props.delivery;
  const c = city.value;
  if (!d || !c) return null;
  const { from, to } = deliveryWindow(d.now ?? Date.now(), c.etaDays, { skipWeekdays: d.skipWeekdays, cutoffHour: d.cutoffHour });
  return formatDateRange(from, to, s.value.locale, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
});

const selectedSize = computed(() => props.product.options.find((o) => o.id === props.sizeGuideOptionId)?.values.find((v) => v.id === selection.value[props.sizeGuideOptionId])?.label);
const stockLine = computed(() => {
  const t = s.value.t;
  const st = stock.value;
  if (st.kind === "low") return { text: t.lowStock(fmt(st.left)), tone: "text-nq-warning-text", dot: "bg-nq-warning" };
  if (st.kind === "in-stock" || st.kind === "untracked") return { text: t.inStock, tone: "text-nq-success-text", dot: "bg-nq-success" };
  if (st.kind === "backorder") return { text: t.backorder, tone: "text-nq-info-text", dot: "bg-nq-info" };
  if (st.kind === "out") return { text: t.outOfStock, tone: "text-nq-danger-text", dot: "bg-nq-danger" };
  return null;
});

const trust = computed<readonly ProductTrustBadge[]>(() => {
  if (props.trustBadges === false) return [];
  const t = s.value.t;
  return (
    props.trustBadges ?? [
      { id: "secure", icon: "secure", label: t.trustSecure, description: t.trustSecureText },
      { id: "returns", icon: "returns", label: t.trustReturns, description: t.trustReturnsText },
      { id: "delivery", icon: "delivery", label: t.trustDelivery, description: t.trustDeliveryText },
      { id: "authentic", icon: "authentic", label: t.trustAuthentic, description: t.trustAuthenticText },
    ]
  );
});

const longDescription = computed(() => props.description ?? props.product.description);
const specRows = computed(() => {
  const t = s.value.t;
  const v = variant.value;
  return [
    ...(v?.sku ? [{ label: t.sku, value: v.sku, ltr: true }] : []),
    ...(props.product.brand ? [{ label: t.brand, value: props.product.brand, ltr: false }] : []),
    ...(props.product.category ? [{ label: t.category, value: props.product.category, ltr: false }] : []),
    ...(props.specs ?? []).map((r) => ({ ...r, ltr: false })),
  ];
});
const panels = computed(() => {
  const t = s.value.t;
  return [
    ...(slots.description || longDescription.value ? [{ id: "description", title: t.description }] : []),
    ...(specRows.value.length ? [{ id: "specs", title: t.specs }] : []),
    ...(slots["shipping-info"] || props.shippingInfo ? [{ id: "shipping", title: t.shipping }] : []),
  ];
});
const asTabs = computed(() => props.sections === "tabs" || (props.sections === "auto" && wide.value));

// The body of one section, shared by the tabs and the accordion.
const PanelBody = (p: { id: string }) => {
  const prose = "text-pretty text-body text-muted-foreground";
  if (p.id === "description") return slots.description ? slots.description() : h("p", { class: prose }, longDescription.value);
  if (p.id === "shipping") return slots["shipping-info"] ? slots["shipping-info"]() : h("p", { class: prose }, props.shippingInfo);
  return h(
    "dl",
    { class: "grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] gap-x-4 text-body-sm" },
    specRows.value.map((row, i) =>
      h("div", { key: i, class: "col-span-2 grid grid-cols-subgrid border-b border-border py-2 last:border-b-0" }, [
        h("dt", { class: "text-muted-foreground" }, row.label),
        h("dd", { class: "text-foreground" }, row.ltr ? h("bdi", { dir: "ltr" }, String(row.value)) : String(row.value)),
      ]),
    ),
  );
};

const addLabel = computed(() => (pending.value === "add" ? s.value.t.adding : soldOut.value ? s.value.t.soldOut : s.value.t.addToCart));
const showSticky = computed(() => props.stickyBar && !wide.value && barVisible.value);
const showWishlist = computed(() => hasListener("onWishlistChange") || props.wishlisted !== undefined);
const pickedLabels = computed(() =>
  props.product.options
    .map((o) => o.values.find((v) => v.id === selection.value[o.id])?.label)
    .filter(Boolean)
    .join(" · "),
);
const scrollToReviews = () => reviewsRef.value?.scrollIntoView?.({ behavior: "smooth", block: "start" });
</script>

<template>
  <div data-slot="product-detail" :class="cn('mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 md:px-6', showSticky && 'pb-24', props.class)">
    <NqBreadcrumb v-if="props.breadcrumbs && props.breadcrumbs.length > 0">
      <NqBreadcrumbList>
        <span v-for="(crumb, i) in props.breadcrumbs" :key="`${crumb.label}-${i}`" class="contents">
          <NqBreadcrumbItem>
            <NqBreadcrumbPage v-if="i === props.breadcrumbs.length - 1 || !crumb.href">{{ crumb.label }}</NqBreadcrumbPage>
            <NqBreadcrumbLink v-else :href="crumb.href">{{ crumb.label }}</NqBreadcrumbLink>
          </NqBreadcrumbItem>
          <NqBreadcrumbSeparator v-if="i !== props.breadcrumbs.length - 1" />
        </span>
      </NqBreadcrumbList>
    </NqBreadcrumb>

    <div class="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-12">
      <div class="min-w-0 lg:sticky lg:top-6 lg:self-start">
        <NqProductGallery v-model:index="galleryIndex" :images="props.product.images" :name="props.product.name" :labels="props.labels" />
      </div>

      <div class="flex min-w-0 flex-col gap-5">
        <header class="flex flex-col gap-2">
          <div v-if="(props.product.badges?.length ?? 0) > 0" class="flex flex-wrap gap-1.5">
            <NqBadge v-for="b in props.product.badges" :key="b" variant="accent">{{ b }}</NqBadge>
          </div>
          <p v-if="props.product.brand" class="text-label text-muted-foreground">{{ props.product.brand }}</p>
          <h1 class="text-balance text-h1 text-foreground">{{ props.product.name }}</h1>
          <button
            v-if="props.product.rating"
            type="button"
            class="w-fit rounded-[3px] outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus"
            @click="scrollToReviews"
          >
            <NqRating :value="props.product.rating.average" :count="props.product.rating.count" :count-label="s.t.reviews" />
          </button>
        </header>

        <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span v-if="price.from" class="text-body-sm text-muted-foreground">{{ s.t.from }}</span>
          <NqPrice :amount="price.price / minor" :currency="currency" size="lg" :compare-at="price.compareAt ? price.compareAt / minor : undefined" />
          <NqBadge v-if="price.percentOff > 0" variant="danger">{{ s.t.percentOff(fmt(price.percentOff / 100, { style: "percent" })) }}</NqBadge>
        </div>

        <div v-if="props.product.options.length > 0" ref="pickerRef" class="scroll-mt-24">
          <NqProductVariantPicker :product="props.product" :model-value="selection" :impossible="props.impossible" :invalid="invalid" :labels="props.labels" @update:model-value="change">
            <template v-if="props.sizeGuide || slots['option-action']" #option-action="{ option }">
              <NqProductSizeGuide v-if="props.sizeGuide && option.id === props.sizeGuideOptionId" :guide="props.sizeGuide" :selected-size="selectedSize" :labels="props.labels" />
              <slot v-else name="option-action" :option="option" />
            </template>
          </NqProductVariantPicker>
        </div>

        <div class="flex flex-wrap items-start gap-x-6 gap-y-3">
          <NqProductQuantityStepper :model-value="qty" :max="max" :disabled="soldOut" :labels="props.labels" @update:model-value="quantity = $event" />
          <p aria-live="polite" :class="cn('flex h-control items-center gap-2 text-label', stockLine?.tone)">
            <template v-if="stockLine">
              <span aria-hidden="true" :class="cn('size-2 rounded-full', stockLine.dot)" />
              {{ stockLine.text }}
            </template>
          </p>
        </div>

        <div v-if="props.delivery && city && eta" data-slot="product-delivery" class="flex flex-col gap-2 rounded-card border border-border p-3">
          <div class="flex flex-wrap items-center gap-2">
            <Truck aria-hidden="true" class="size-4 text-muted-foreground" />
            <span class="text-label text-foreground">{{ s.t.deliverTo }}</span>
            <NqSelect :model-value="cityId ?? null" @update:model-value="cityId = ($event as string | null) ?? undefined">
              <NqSelectTrigger :aria-label="s.t.city" class="w-auto min-w-32">
                <NqSelectValue />
              </NqSelectTrigger>
              <NqSelectContent>
                <NqSelectItem v-for="c in props.delivery.cities" :key="c.id" :value="c.id">{{ c.label }}</NqSelectItem>
              </NqSelectContent>
            </NqSelect>
          </div>
          <p class="text-body-sm text-muted-foreground">{{ s.t.arrives(eta) }} · {{ city.fee ? s.t.deliveryFee(money(city.fee)) : s.t.freeDelivery }}</p>
        </div>

        <div ref="ctaRef" class="flex flex-col gap-2">
          <div class="flex flex-wrap gap-2">
            <NqButton type="button" variant="primary" size="lg" :loading="pending === 'add'" :disabled="soldOut" :aria-describedby="statusId" class="min-w-44 flex-1" @click="run('add')">{{ addLabel }}</NqButton>
            <NqButton v-if="hasListener('onBuyNow')" type="button" variant="secondary" size="lg" :loading="pending === 'buy'" :disabled="soldOut" class="min-w-32 flex-1" @click="run('buy')">{{ s.t.buyNow }}</NqButton>
            <NqButton
              v-if="showWishlist"
              type="button"
              variant="secondary"
              size="lg"
              :aria-pressed="wish"
              :aria-label="wish ? s.t.removeWishlist : s.t.addWishlist"
              :title="wish ? s.t.removeWishlist : s.t.addWishlist"
              class="w-[calc(var(--nq-control)+8px)] px-0"
              @click="toggleWish"
            >
              <Heart aria-hidden="true" :class="cn(wish && 'fill-nq-danger text-nq-danger')" />
            </NqButton>
            <NqButton type="button" variant="secondary" size="lg" :aria-label="s.t.share" :title="s.t.share" class="w-[calc(var(--nq-control)+8px)] px-0" @click="share">
              <Share2 aria-hidden="true" />
            </NqButton>
          </div>
          <p
            :id="statusId"
            :role="status?.kind === 'error' ? 'alert' : 'status'"
            aria-live="polite"
            :class="cn('flex items-center gap-1.5 text-body-sm', status ? (status.kind === 'error' ? 'text-nq-danger-text' : status.kind === 'ok' ? 'text-nq-success-text' : 'text-muted-foreground') : 'sr-only')"
          >
            <TriangleAlert v-if="status?.kind === 'error'" aria-hidden="true" class="size-4 shrink-0" />
            {{ status?.text }}
          </p>
        </div>

        <ul v-if="trust.length > 0" data-slot="product-trust" class="grid grid-cols-1 gap-3 border-t border-border pt-5 sm:grid-cols-2">
          <li v-for="b in trust" :key="b.id" class="flex items-start gap-2.5">
            <component :is="TRUST_ICON[b.icon ?? 'secure']" aria-hidden="true" class="mt-0.5 size-5 shrink-0 text-muted-foreground" />
            <span class="flex min-w-0 flex-col">
              <span class="text-label text-foreground">{{ b.label }}</span>
              <span v-if="b.description" class="text-caption text-muted-foreground">{{ b.description }}</span>
            </span>
          </li>
        </ul>
      </div>
    </div>

    <template v-if="panels.length > 0">
      <NqTabs v-if="asTabs" :default-value="panels[0]!.id" :aria-label="s.t.sections">
        <NqTabsList variant="underline">
          <NqTabsTab v-for="p in panels" :key="p.id" :value="p.id">{{ p.title }}</NqTabsTab>
        </NqTabsList>
        <NqTabsPanel v-for="p in panels" :key="p.id" :value="p.id" class="max-w-3xl">
          <PanelBody :id="p.id" />
        </NqTabsPanel>
      </NqTabs>
      <NqAccordion v-else :default-value="[panels[0]!.id]" multiple :aria-label="s.t.sections">
        <NqAccordionItem v-for="p in panels" :key="p.id" :value="p.id">
          <NqAccordionTrigger>{{ p.title }}</NqAccordionTrigger>
          <NqAccordionPanel><PanelBody :id="p.id" /></NqAccordionPanel>
        </NqAccordionItem>
      </NqAccordion>
    </template>

    <section v-if="slots.reviews" id="reviews" ref="reviewsRef" data-slot="product-detail-reviews" :aria-label="s.t.reviews" class="scroll-mt-6 border-t border-border pt-8">
      <slot name="reviews" />
    </section>

    <section v-if="slots.related" data-slot="product-detail-related" :aria-label="props.relatedTitle ?? s.t.related" class="flex flex-col gap-4 border-t border-border pt-8">
      <h2 class="text-h2 text-foreground">{{ props.relatedTitle ?? s.t.related }}</h2>
      <slot name="related" />
    </section>

    <div v-if="showSticky" data-slot="product-sticky-bar" role="region" :aria-label="s.t.stickyBar" class="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-border bg-background p-3 shadow-lg md:hidden">
      <div class="flex min-w-0 flex-1 flex-col">
        <NqPrice :amount="price.price / minor" :currency="currency" size="md" :compare-at="price.compareAt ? price.compareAt / minor : undefined" />
        <span v-if="variant && props.product.options.length > 0" class="truncate text-caption text-muted-foreground">{{ pickedLabels }}</span>
      </div>
      <NqButton type="button" variant="primary" size="lg" :loading="pending === 'add'" :disabled="soldOut" class="shrink-0" @click="run('add')">{{ addLabel }}</NqButton>
    </div>
  </div>
</template>
