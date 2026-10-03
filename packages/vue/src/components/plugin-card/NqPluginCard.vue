<script setup lang="ts">
import { ExternalLink, Puzzle, Settings2 } from "lucide-vue-next";
import { computed, onBeforeUnmount, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqBadge } from "../badge";
import { buttonVariants } from "../button/variants";
import { NqSparkline } from "../chart";
import { NqCheckbox } from "../checkbox";
import { NqIconByName } from "../icon-picker";
import { NqDateTime, formatNumber } from "../numeric";
import { PLUGIN_CARD_STRINGS, pluginCardFill as fill, type PluginCardItem, type PluginCardLabels } from "./plugin-card";
import { humanizePluginKind, pluginActivity, type PluginActivity } from "./plugin-card-logic";

// A plugin in a catalogue or admin grid: icon, name, version, kind, enabled state and last activity, a description,
// a headline count with a sparkline, and Page and Details actions. With `selectable` it becomes a checkbox card for
// bulk actions (a click toggles it; a long press on touch selects it).
interface Props {
  plugin: PluginCardItem;
  selectable?: boolean;
  selected?: boolean;
  /** Details: a link when `detailHref` is set, a button with `onOpen`. */
  detailHref?: string;
  onOpen?: () => void;
  /** The plugin's own page: a link with `pageHref`, a button with `onOpenPage`. */
  pageHref?: string;
  onOpenPage?: () => void;
  /** The heading tag. Default `h3`. */
  headingAs?: string;
  now?: number;
  labels?: Partial<PluginCardLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  selectable: false,
  selected: false,
  detailHref: undefined,
  onOpen: undefined,
  pageHref: undefined,
  onOpenPage: undefined,
  headingAs: "h3",
  now: undefined,
  labels: undefined,
});
const emit = defineEmits<{ "update:selected": [selected: boolean] }>();

const nq = useNasaq();
const base = computed(() => PLUGIN_CARD_STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"]);
const t = computed(() => ({ ...base.value, ...props.labels, kinds: { ...base.value.kinds, ...props.labels?.kinds } }));
const titleId = useId();
const name = computed(() => props.plugin.name);
const kind = computed(() => (props.plugin.kind ? (t.value.kinds[props.plugin.kind] ?? humanizePluginKind(props.plugin.kind)) : null));
const hue = computed(() => props.plugin.hue ?? "gray");
const activity = computed<PluginActivity>(() => pluginActivity(props.plugin.lastActiveAt, props.now));
const series = computed(() => (props.plugin.series?.length ? props.plugin.series : null));
const tileStyle = computed(() => ({ "--tile-solid": `var(--nq-tag-${hue.value})`, "--tile-soft": `var(--nq-tag-${hue.value}-soft)` }));
const activityBadge: Record<PluginActivity, "success" | "warning" | "outline"> = { live: "success", recent: "warning", idle: "outline", never: "outline" };

const LONG_PRESS_MS = 500;
let press: ReturnType<typeof setTimeout> | null = null;
let pressed = false;
const cancelPress = () => {
  if (press) clearTimeout(press);
  press = null;
};
onBeforeUnmount(cancelPress);

function onClick(e: MouseEvent) {
  if (!props.selectable || e.defaultPrevented) return;
  if (pressed) {
    pressed = false;
    return;
  }
  if ((e.target as HTMLElement).closest("a, button, input, label, [role='checkbox'], [role='button']")) return;
  emit("update:selected", !props.selected);
}
function onPointerDown(e: PointerEvent) {
  if (!props.selectable || e.pointerType === "mouse" || props.selected) return;
  cancelPress();
  press = setTimeout(() => {
    pressed = true;
    emit("update:selected", true);
  }, LONG_PRESS_MS);
}
const ghostSm = buttonVariants({ variant: "ghost", size: "sm" });
</script>

<template>
  <article
    data-slot="plugin-card"
    :data-selected="props.selected || undefined"
    :data-activity="activity"
    :aria-labelledby="titleId"
    :class="cn(
      'flex h-full flex-col rounded-card border bg-card transition-colors duration-150 ease-nq',
      props.selected ? 'border-primary bg-nq-selected' : 'border-border',
      props.selectable && 'cursor-pointer select-none hover:border-nq-line-strong',
      props.class,
    )"
    @click="onClick"
    @pointerdown="onPointerDown"
    @pointerup="cancelPress"
    @pointerleave="cancelPress"
    @pointercancel="cancelPress"
  >
    <div class="flex flex-1 flex-col gap-3 p-4">
      <div class="flex items-start gap-3">
        <NqCheckbox
          v-if="props.selectable"
          :model-value="props.selected"
          :aria-label="fill(t.select, { name })"
          class="mt-0.5"
          @update:model-value="(v: boolean) => emit('update:selected', v === true)"
        />
        <span
          aria-hidden="true"
          data-slot="plugin-card-icon"
          class="flex size-11 shrink-0 items-center justify-center rounded-control bg-[var(--tile-soft)] text-[var(--tile-solid)]"
          :style="tileStyle"
        >
          <slot name="icon">
            <NqIconByName v-if="props.plugin.icon" :name="props.plugin.icon" class="size-5"><Puzzle aria-hidden="true" class="size-5" /></NqIconByName>
            <Puzzle v-else aria-hidden="true" class="size-5" />
          </slot>
        </span>
        <div class="flex min-w-0 flex-1 flex-col gap-1.5">
          <div class="flex items-start justify-between gap-2">
            <div class="flex min-w-0 items-baseline gap-2">
              <component :is="props.headingAs" :id="titleId" dir="auto" class="truncate text-label text-foreground" :title="name">{{ name }}</component>
              <bdi v-if="props.plugin.version" dir="ltr" class="shrink-0 font-mono text-caption text-muted-foreground">{{ props.plugin.version }}</bdi>
            </div>
            <NqBadge :variant="activityBadge[activity]" class="shrink-0" data-slot="plugin-card-activity">
              <span aria-hidden="true" :class="cn('size-1.5 rounded-full', activity === 'live' ? 'bg-nq-success' : activity === 'recent' ? 'bg-nq-warning' : 'bg-muted-foreground')" />
              <span class="sr-only">{{ t.lastActive }}: </span>
              <template v-if="activity === 'never' || props.plugin.lastActiveAt == null">{{ t.never }}</template>
              <NqDateTime v-else :value="props.plugin.lastActiveAt" relative />
            </NqBadge>
          </div>
          <div class="flex flex-wrap items-center gap-1.5">
            <NqBadge v-if="kind" variant="neutral">{{ kind }}</NqBadge>
            <template v-if="props.plugin.enabled !== undefined">
              <NqBadge v-if="props.plugin.enabled" variant="success">{{ t.enabled }}</NqBadge>
              <NqBadge v-else variant="outline">{{ t.disabled }}</NqBadge>
            </template>
            <slot name="badges" />
          </div>
        </div>
      </div>
      <p dir="auto" :class="cn('line-clamp-2 text-body-sm', props.plugin.description ? 'text-muted-foreground' : 'text-muted-foreground/70 italic')">{{ props.plugin.description || t.noDescription }}</p>
    </div>
    <div v-if="props.plugin.count !== undefined || series" data-slot="plugin-card-metric" class="flex items-end justify-between gap-3 border-t border-border bg-secondary/40 px-4 py-3">
      <div class="flex min-w-0 flex-col">
        <span v-if="props.plugin.countLabel" class="truncate text-caption text-muted-foreground">{{ props.plugin.countLabel }}</span>
        <bdi v-if="props.plugin.count !== undefined" class="text-h3 tabular-nums" :title="formatNumber(props.plugin.count, nq.locale.value)">{{ formatNumber(props.plugin.count, nq.locale.value, { notation: "compact", maximumFractionDigits: 1 }) }}</bdi>
      </div>
      <NqSparkline v-if="series" :data="series" :color="`var(--nq-tag-${hue})`" :label="fill(t.activity, { name })" class="h-10 w-28" />
    </div>
    <footer class="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
      <bdi dir="ltr" class="min-w-0 truncate font-mono text-caption text-muted-foreground" :title="props.plugin.slug ?? props.plugin.id">{{ props.plugin.slug ?? props.plugin.id }}</bdi>
      <div class="flex shrink-0 items-center gap-1">
        <slot name="actions" />
        <template v-if="props.pageHref || props.onOpenPage">
          <a v-if="props.pageHref" :href="props.pageHref" :aria-label="fill(t.openPage, { name })" :class="ghostSm"><ExternalLink aria-hidden="true" />{{ t.page }}</a>
          <button v-else type="button" :aria-label="fill(t.openPage, { name })" :class="ghostSm" @click="props.onOpenPage?.()"><ExternalLink aria-hidden="true" />{{ t.page }}</button>
        </template>
        <template v-if="props.detailHref || props.onOpen">
          <a v-if="props.detailHref" :href="props.detailHref" :aria-label="fill(t.openDetails, { name })" :class="ghostSm"><Settings2 aria-hidden="true" />{{ t.details }}</a>
          <button v-else type="button" :aria-label="fill(t.openDetails, { name })" :class="ghostSm" @click="props.onOpen?.()"><Settings2 aria-hidden="true" />{{ t.details }}</button>
        </template>
      </div>
    </footer>
  </article>
</template>
