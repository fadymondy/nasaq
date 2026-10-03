<script setup lang="ts">
import { PinOff } from "lucide-vue-next";
import { computed, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { NqContextMenuActions, type ContextMenuAction } from "../context-menu";
import { NqSkeleton } from "../states";
import { NqScrollFade, NqUserText } from "../text-utilities";
import { healthFill, healthStrings, type HealthTrackerResult, type HealthTrackersLabels, type QuickLogItem, type QuickLogResult } from "./health-trackers-strings";

// The handful of things you log every day, as one-tap buttons in a row that scrolls with faded edges. A flagged entry
// is a warning, not an error: it was recorded. A refusal shows the server's sentence and, when it allows, "Log anyway".
const props = withDefaults(
  defineProps<{
    items: readonly QuickLogItem[];
    /** Logs one entry. The server decides what it means; the strip only shows the answer. */
    onLog: (item: QuickLogItem, options: { override: boolean }) => Promise<QuickLogResult>;
    /** Adds an "Unpin" action to each button's context menu. */
    onUnpin?: (item: QuickLogItem) => Promise<HealthTrackerResult>;
    /** Where the empty state sends people to pin items. */
    catalogueHref?: string;
    loading?: boolean;
    title?: string;
    labels?: HealthTrackersLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { onUnpin: undefined, catalogueHref: undefined, loading: false, title: undefined, labels: undefined },
);

const nq = useNasaq();
const ar = computed(() => nq.locale.value.startsWith("ar"));
const t = computed(() => healthStrings(nq.locale.value, props.labels));
const headingId = useId();
const busyId = ref<string>();
const outcome = ref<{ tone: "success" | "warning" | "danger"; text: string; retry?: () => void }>();

const nameOf = (item: QuickLogItem) => (ar.value && item.nameAr ? item.nameAr : item.name);

async function run(item: QuickLogItem, override = false) {
  busyId.value = item.id;
  outcome.value = undefined;
  const name = nameOf(item);
  try {
    const result = await props.onLog(item, { override });
    if (result && result.error) outcome.value = { tone: "danger", text: result.error, retry: result.canOverride ? () => void run(item, true) : undefined };
    else if (result && result.flagged) outcome.value = { tone: "warning", text: result.message ?? healthFill(t.value.pinnedFlagged, { name }) };
    else outcome.value = { tone: "success", text: (result && result.message) ?? healthFill(t.value.pinnedLogged, { name }) };
  } catch {
    outcome.value = { tone: "danger", text: healthFill(t.value.pinnedFailed, { name }) };
  } finally {
    busyId.value = undefined;
  }
}

const actionsFor = (item: QuickLogItem): ContextMenuAction[] => {
  const unpin = props.onUnpin;
  return unpin ? [{ id: "unpin", label: t.value.unpin, icon: PinOff, onSelect: () => void unpin(item) }] : [];
};
</script>

<template>
  <section data-slot="quick-log-strip" :aria-labelledby="headingId" :class="cn('flex min-w-0 flex-col gap-2', props.class)">
    <h3 :id="headingId" class="text-eyebrow text-muted-foreground">{{ props.title ?? t.pinnedTitle }}</h3>
    <div v-if="props.loading" class="flex gap-2">
      <NqSkeleton class="h-control w-24" />
      <NqSkeleton class="h-control w-28" />
      <NqSkeleton class="h-control w-20" />
    </div>
    <p v-else-if="props.items.length === 0" class="flex flex-wrap items-center gap-x-2 text-body-sm text-muted-foreground">
      {{ t.pinnedEmpty }}
      <a v-if="props.catalogueHref" :href="props.catalogueHref" class="text-foreground underline decoration-nq-line underline-offset-4 hover:decoration-current">{{ t.pinnedOpenCatalogue }}</a>
    </p>
    <NqScrollFade v-else :label="props.title ? undefined : t.pinnedTitle" content-class="pb-1">
      <NqContextMenuActions v-for="item in props.items" :key="item.id" :actions="actionsFor(item)" class="shrink-0">
        <NqButton variant="secondary" :loading="busyId === item.id" :disabled="busyId !== undefined && busyId !== item.id" @click="run(item)">
          <component :is="item.icon" v-if="item.icon" aria-hidden="true" />
          <NqUserText>{{ nameOf(item) }}</NqUserText>
        </NqButton>
      </NqContextMenuActions>
    </NqScrollFade>
    <div role="status" aria-live="polite" class="min-h-5">
      <p
        v-if="outcome"
        :class="cn('flex flex-wrap items-center gap-x-3 gap-y-1 text-caption', outcome.tone === 'success' && 'text-nq-success-text', outcome.tone === 'warning' && 'text-nq-warning-text', outcome.tone === 'danger' && 'text-nq-danger-text')"
      >
        {{ outcome.text }}
        <NqButton v-if="outcome.retry" variant="link" size="sm" @click="outcome.retry">{{ t.logAnyway }}</NqButton>
      </p>
    </div>
  </section>
</template>
