<script setup lang="ts">
import { ChevronDown, Flag } from "lucide-vue-next";
import { computed, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCollapsible, NqCollapsiblePanel, NqCollapsibleTrigger } from "../collapsible";
import { NqDateTime, formatNumber } from "../numeric";
import { NqSkeleton } from "../states";
import { NqUserText } from "../text-utilities";
import { healthFill, healthStrings, type FlaggedEntry, type HealthTrackersLabels } from "./health-trackers-strings";

// The day's flagged entries behind a disclosure on the count. Flagged means recorded and then marked against the
// protocol: the list explains why, and does not call them errors. Loads lazily when given `onLoad`.
const props = withDefaults(
  defineProps<{
    /** The count to show on the toggle before the list loads. Defaults to `entries.length`. */
    count?: number;
    /** The entries, when you already have them. */
    entries?: readonly FlaggedEntry[];
    /** Loads the entries the first time the disclosure opens (and on retry). Use instead of `entries`. */
    onLoad?: () => Promise<readonly FlaggedEntry[]>;
    defaultOpen?: boolean;
    labels?: HealthTrackersLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { count: undefined, entries: undefined, onLoad: undefined, defaultOpen: false, labels: undefined },
);

const nq = useNasaq();
const locale = computed(() => nq.locale.value);
const t = computed(() => healthStrings(locale.value, props.labels));
const open = ref(props.defaultOpen);
const loaded = ref<readonly FlaggedEntry[] | undefined>(props.entries);
const state = ref<"idle" | "loading" | "error">("idle");
let started = false;
watch(() => props.entries, (next) => (loaded.value = next));

async function load() {
  if (!props.onLoad) return;
  state.value = "loading";
  try {
    loaded.value = await props.onLoad();
    state.value = "idle";
  } catch {
    state.value = "error";
  }
}

watch(
  open,
  (isOpen) => {
    if (isOpen && props.onLoad && !started) {
      started = true;
      void load();
    }
  },
  { immediate: true },
);

const total = computed(() => loaded.value?.length ?? props.count ?? 0);
</script>

<template>
  <NqCollapsible v-model:open="open" data-slot="flagged-entries" :class="cn('min-w-0', props.class)">
    <NqCollapsibleTrigger
      class="flex w-full items-center justify-between gap-3 rounded-control border border-border px-3 py-2 text-start text-label text-foreground outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus"
    >
      <span class="flex items-center gap-2">
        <Flag aria-hidden="true" class="size-4 text-nq-warning-text" />
        {{ t.flaggedTitle }}
        <NqBadge :variant="total > 0 ? 'warning' : 'neutral'">{{ healthFill(t.flaggedCount, { count: formatNumber(total, locale) }) }}</NqBadge>
      </span>
      <ChevronDown aria-hidden="true" :class="cn('size-4 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none', open && 'rotate-180')" />
    </NqCollapsibleTrigger>
    <NqCollapsiblePanel>
      <div class="flex flex-col gap-3 px-1 pt-3">
        <div v-if="state === 'loading'" role="status" :aria-label="t.flaggedLoading" class="flex flex-col gap-2">
          <NqSkeleton class="h-10 w-full" />
          <NqSkeleton class="h-10 w-full" />
        </div>
        <p v-else-if="state === 'error'" role="alert" class="flex flex-wrap items-center gap-2 text-caption text-nq-danger-text">
          {{ t.flaggedFailed }}
          <NqButton variant="link" size="sm" @click="load">{{ t.retry }}</NqButton>
        </p>
        <p v-else-if="loaded && loaded.length === 0" class="text-body-sm text-muted-foreground">{{ t.flaggedNone }}</p>
        <template v-else>
          <p class="text-caption text-muted-foreground">{{ t.flaggedIntro }}</p>
          <ul class="flex flex-col divide-y divide-border rounded-control border border-border">
            <li v-for="entry in loaded" :key="entry.id" class="flex flex-col gap-0.5 px-3 py-2">
              <span class="flex flex-wrap items-baseline justify-between gap-x-3">
                <NqUserText class="text-label text-foreground">{{ entry.label }}</NqUserText>
                <NqDateTime :value="entry.at" :format="{ timeStyle: 'short' }" class="text-caption tabular-nums text-muted-foreground" />
              </span>
              <span class="text-body-sm text-muted-foreground">
                <span v-if="entry.area" class="text-foreground">{{ entry.area }}: </span>
                <NqUserText>{{ entry.reason }}</NqUserText>
              </span>
            </li>
          </ul>
        </template>
      </div>
    </NqCollapsiblePanel>
  </NqCollapsible>
</template>
