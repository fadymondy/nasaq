<script setup lang="ts">
import { Puzzle, RotateCw } from "lucide-vue-next";
import { computed, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqSparkline } from "../chart";
import { NqIconByName } from "../icon-picker";
import { NqDateTime, formatNumber } from "../numeric";
import { NqErrorState, NqLoadingState, NqSkeleton } from "../states";
import {
  DETAIL_LAYOUT_STRINGS,
  detailLayoutFill as fill,
  type DetailActivity,
  type DetailIdentity,
  type DetailLayoutLabels,
  type DetailTab,
} from "./detail-layout";
import { groupDetailTabs, stepDetailTab } from "./detail-layout-logic";

// A detail page for one thing (a plugin, a customer, a server): a sub-sidebar of tabs grouped in sections, which
// becomes a scrolling tab bar on small screens, a header with its identity and recent activity, and the active tab's
// content (the default slot). Handles loading and error states.
interface Props {
  tabs: readonly DetailTab[];
  /** The active tab's key: `v-model:active-tab`. */
  activeTab: string;
  identity?: DetailIdentity;
  activity?: DetailActivity;
  /** Shows skeletons for the header and a loading state for the content. */
  loading?: boolean;
  /** `true` or a message: replaces the header and content with an error and **Try again** (with `onRetry`). */
  error?: boolean | string;
  onRetry?: () => void;
  /** The heading tag. Default `h1`. */
  headingAs?: string;
  labels?: Partial<DetailLayoutLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  identity: undefined,
  activity: undefined,
  loading: false,
  error: false,
  onRetry: undefined,
  headingAs: "h1",
  labels: undefined,
});
const emit = defineEmits<{ "update:activeTab": [key: string] }>();

const nq = useNasaq();
const t = computed(() => ({ ...DETAIL_LAYOUT_STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
const navId = useId();
const panelId = useId();
const groups = computed(() => groupDetailTabs(props.tabs));
const ordered = computed(() => groups.value.flatMap((g) => g.tabs));
const hue = computed(() => props.identity?.hue ?? "gray");
const tile = computed(() => ({ "--tile-solid": `var(--nq-tag-${hue.value})`, "--tile-soft": `var(--nq-tag-${hue.value}-soft)` }));
const series = computed(() => (props.activity?.series?.length ? props.activity.series : null));
const toneBadge = { success: "success", warning: "warning", danger: "danger", info: "info", neutral: "neutral" } as const;

const buttons = { side: new Map<string, HTMLButtonElement>(), bar: new Map<string, HTMLButtonElement>() };
const setRef = (map: Map<string, HTMLButtonElement>, key: string) => (el: unknown) => {
  if (el instanceof HTMLButtonElement) map.set(key, el);
  else map.delete(key);
};

function onKey(e: KeyboardEvent, vertical: boolean, map: Map<string, HTMLButtonElement>) {
  const rtl = getComputedStyle(e.currentTarget as HTMLElement).direction === "rtl";
  const next =
    e.key === "Home" ? "first" : e.key === "End" ? "last"
    : (vertical ? e.key === "ArrowDown" : e.key === (rtl ? "ArrowLeft" : "ArrowRight")) ? 1
    : (vertical ? e.key === "ArrowUp" : e.key === (rtl ? "ArrowRight" : "ArrowLeft")) ? -1
    : null;
  if (next === null) return;
  const tab = stepDetailTab(ordered.value, props.activeTab, next);
  if (!tab) return;
  e.preventDefault();
  emit("update:activeTab", tab.key);
  map.get(tab.key)?.focus();
}

function tabClass(tab: DetailTab, compact: boolean) {
  const active = tab.key === props.activeTab;
  return cn(
    "flex items-center gap-2 rounded-control text-start outline-none transition-colors duration-150 ease-nq",
    "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-nq-focus disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:size-4 [&_svg]:shrink-0",
    compact ? "h-control-sm shrink-0 whitespace-nowrap px-3 text-label" : "h-control w-full px-3 text-label",
    active ? "bg-nq-selected text-foreground" : "text-muted-foreground hover:bg-nq-hover hover:text-foreground",
  );
}
</script>

<template>
  <div data-slot="detail-layout" :class="cn('flex min-h-0 flex-col md:flex-row', props.class)">
    <aside data-slot="detail-sidebar" class="hidden w-56 shrink-0 border-e border-border bg-card md:block">
      <nav :aria-label="t.nav" :id="navId" class="flex flex-col gap-4 p-3">
        <div v-for="(group, i) in groups" :key="group.section ?? `__${i}`" class="flex flex-col gap-0.5">
          <p v-if="group.section" dir="auto" class="px-3 pb-1 text-caption text-muted-foreground">{{ group.section }}</p>
          <button
            v-for="tab in group.tabs"
            :key="tab.key"
            :ref="setRef(buttons.side, tab.key)"
            type="button"
            data-slot="detail-tab"
            :data-active="tab.key === props.activeTab || undefined"
            :aria-current="tab.key === props.activeTab ? 'page' : undefined"
            :aria-controls="panelId"
            :disabled="tab.disabled"
            :tabindex="tab.key === props.activeTab ? 0 : -1"
            :class="tabClass(tab, false)"
            @click="emit('update:activeTab', tab.key)"
            @keydown="onKey($event, true, buttons.side)"
          >
            <NqIconByName v-if="tab.icon" :name="tab.icon" class="size-4" />
            <span class="min-w-0 flex-1 truncate">{{ tab.label }}</span>
            <span v-if="tab.badge !== undefined && tab.badge !== null" class="text-caption tabular-nums text-muted-foreground">{{ tab.badge }}</span>
          </button>
        </div>
      </nav>
    </aside>
    <div class="flex min-w-0 flex-1 flex-col">
      <nav :aria-label="t.nav" data-slot="detail-tabbar" class="flex gap-1 overflow-x-auto border-b border-border bg-card px-3 py-2 md:hidden">
        <button
          v-for="tab in ordered"
          :key="tab.key"
          :ref="setRef(buttons.bar, tab.key)"
          type="button"
          data-slot="detail-tab"
          :data-active="tab.key === props.activeTab || undefined"
          :aria-current="tab.key === props.activeTab ? 'page' : undefined"
          :aria-controls="panelId"
          :disabled="tab.disabled"
          :tabindex="tab.key === props.activeTab ? 0 : -1"
          :class="tabClass(tab, true)"
          @click="emit('update:activeTab', tab.key)"
          @keydown="onKey($event, false, buttons.bar)"
        >
          <NqIconByName v-if="tab.icon" :name="tab.icon" class="size-4" />
          <span class="min-w-0 flex-1 truncate">{{ tab.label }}</span>
          <span v-if="tab.badge !== undefined && tab.badge !== null" class="text-caption tabular-nums text-muted-foreground">{{ tab.badge }}</span>
        </button>
      </nav>
      <NqErrorState v-if="props.error" :title="t.errorTitle" :description="props.error === true ? t.errorBody : props.error" class="m-6">
        <template v-if="props.onRetry" #actions>
          <NqButton @click="props.onRetry?.()"><RotateCw aria-hidden="true" />{{ t.retry }}</NqButton>
        </template>
      </NqErrorState>
      <template v-else>
        <div v-if="props.loading" data-slot="detail-hero" aria-hidden="true" class="flex flex-wrap items-center gap-4 border-b border-border bg-card px-6 py-6">
          <NqSkeleton class="size-16 rounded-card" />
          <div class="flex min-w-48 flex-1 flex-col gap-2">
            <NqSkeleton class="h-6 w-56 max-w-full" />
            <NqSkeleton class="h-4 w-80 max-w-full" />
            <NqSkeleton class="h-4 w-32" />
          </div>
          <NqSkeleton class="h-16 w-48 rounded-card" />
        </div>
        <header v-else-if="props.identity" data-slot="detail-hero" class="flex flex-wrap items-start gap-4 border-b border-border bg-card px-6 py-6">
          <span aria-hidden="true" class="flex size-16 shrink-0 items-center justify-center rounded-card bg-[var(--tile-soft)] text-[var(--tile-solid)]" :style="tile">
            <slot name="icon">
              <NqIconByName v-if="props.identity.icon" :name="props.identity.icon" class="size-7"><Puzzle aria-hidden="true" class="size-7" /></NqIconByName>
              <Puzzle v-else aria-hidden="true" class="size-7" />
            </slot>
          </span>
          <div class="flex min-w-48 flex-1 flex-col gap-1.5">
            <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <component :is="props.headingAs" dir="auto" class="text-h2 text-foreground">{{ props.identity.name }}</component>
              <bdi v-if="props.identity.version" dir="ltr" class="font-mono text-caption text-muted-foreground">{{ props.identity.version }}</bdi>
            </div>
            <div v-if="props.identity.kind || props.identity.status" class="flex flex-wrap items-center gap-1.5">
              <NqBadge v-if="props.identity.kind" variant="neutral">{{ props.identity.kind }}</NqBadge>
              <NqBadge v-if="props.identity.status" :variant="toneBadge[props.identity.status.tone ?? 'neutral']">{{ props.identity.status.label }}</NqBadge>
            </div>
            <p v-if="props.identity.description" dir="auto" class="max-w-prose text-body-sm text-muted-foreground">{{ props.identity.description }}</p>
            <bdi v-if="props.identity.slug" dir="ltr" class="w-fit font-mono text-caption text-muted-foreground">{{ props.identity.slug }}</bdi>
          </div>
          <div v-if="props.activity" data-slot="detail-activity" class="flex items-end gap-4 rounded-card border border-border bg-background px-4 py-3">
            <div class="flex flex-col">
              <span v-if="props.activity.countLabel" class="text-caption text-muted-foreground">{{ props.activity.countLabel }}</span>
              <bdi v-if="props.activity.count !== undefined" class="text-h3 tabular-nums" :title="formatNumber(props.activity.count, nq.locale.value)">{{ formatNumber(props.activity.count, nq.locale.value, { notation: "compact", maximumFractionDigits: 1 }) }}</bdi>
              <span class="text-caption text-muted-foreground">
                <span class="sr-only">{{ t.lastActive }}: </span>
                <template v-if="props.activity.lastActiveAt == null || props.activity.lastActiveAt === ''">{{ t.never }}</template>
                <NqDateTime v-else :value="props.activity.lastActiveAt" relative />
              </span>
            </div>
            <NqSparkline v-if="series" :data="series" :color="`var(--nq-tag-${hue})`" :label="fill(t.activity, { name: props.identity.name })" class="h-12 w-32" />
          </div>
          <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-center gap-2"><slot name="actions" /></div>
        </header>
        <div :id="panelId" data-slot="detail-content" class="min-w-0 flex-1 p-6">
          <NqLoadingState v-if="props.loading" :label="t.loading" />
          <slot v-else />
        </div>
      </template>
    </div>
  </div>
</template>
