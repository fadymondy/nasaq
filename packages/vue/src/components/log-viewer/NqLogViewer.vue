<script setup lang="ts">
import { ArrowDownToLine, Check, Clock, Copy, Download, History, Pause, Play, Regex, Search, X } from "lucide-vue-next";
import { computed, onBeforeUnmount, onMounted, ref, useId, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { copyText } from "../copy-button";
import { NqInputGroup, NqInputGroupAddon, NqInputGroupInput } from "../input-group";
import { NqNativeSelect } from "../native-select";
import { NqSpinner } from "../spinner";
import { NqEmptyState } from "../states";
import { useFollowScroll } from "../terminal";
import {
  compileMatcher,
  countByLevel,
  entriesUntil,
  entryText,
  fieldsToText,
  filterLogs,
  formatLogTime,
  LOG_LEVELS,
  logsToText,
  rangeSince,
  splitByRanges,
  virtualWindow,
  type LogEntry,
  type LogLevel,
  type LogRange,
} from "./log-viewer-format";
import { LOG_VIEWER_STRINGS, type LogViewerLabels } from "./log-viewer-strings";

// A log stream that behaves like a dev tool: level filters with counts, search with highlights (optionally
// a regular expression), a time range, follow-the-tail with a jump button, pause and resume, loading older
// entries, server-side filtering (`manual`), timestamps, keyboard navigation and a detail panel. The list is
// windowed with fixed-height rows, so long streams stay smooth. Always left-to-right.

/** What the reader is asking for, for a server that does the filtering (`manual`). */
export interface LogViewerFilter {
  levels: LogLevel[];
  query: string;
  regex: boolean;
  /** The chosen time range, if the viewer has `ranges`. */
  range: LogRange | null;
  /** Keep entries at or after this time (epoch milliseconds), from the range. `null`: no limit. */
  since: number | null;
}

interface Props {
  /** Entries, oldest first. Append to stream; the list is virtualised so tens of thousands are fine. */
  entries: readonly LogEntry[];
  /** Header text. Default "Logs". */
  title?: string;
  /** More entries are still arriving: shows a live indicator. */
  streaming?: boolean;
  /** Start pinned to the newest entry. Default true. */
  follow?: boolean;
  /** Levels switched on at the start. Default all. */
  defaultLevels?: readonly LogLevel[];
  /** Initial search text. */
  defaultQuery?: string;
  /** Show timestamps. Default true. */
  timestamps?: boolean;
  /** Timestamps in UTC instead of local time. */
  utc?: boolean;
  /** Row height in pixels. Rows are single-line; open one for the full text. Default 24. */
  rowHeight?: number;
  /** Height of the list area. Default 24rem. */
  height?: string | number;
  /** Called when the user asks to download. Default: saves the visible entries as a `.log` file. */
  onDownload?: (entries: readonly LogEntry[]) => void;
  /** File name for the default download. Default "logs.log". */
  downloadFilename?: string;
  /**
   * The server filters. `entries` are shown as given (search matches are still highlighted) and every change of
   * level, search, regex or range is reported through `onFilterChange`.
   */
  manual?: boolean;
  /** Called after the reader changes a filter. Not called on mount. */
  onFilterChange?: (filter: LogViewerFilter) => void;
  /** Per-level totals for the chips, e.g. from the server. Default: counted from `entries`. */
  counts?: Partial<Record<LogLevel, number>>;
  /** How many entries match on the server, for the footer. Default: `entries.length`. */
  total?: number;
  /** Time windows to choose from, e.g. `LOG_RANGES`. Adds a range select. */
  ranges?: readonly LogRange[];
  /** Id of the range chosen at the start. Default: the last range. */
  defaultRange?: string;
  /** Older entries exist: shows "Load older entries" at the top of the list. */
  hasOlder?: boolean;
  /** Fetch older entries and prepend them; the list keeps its place. */
  onLoadOlder?: () => void | Promise<void>;
  /** Older entries are loading. Defaults to tracking the promise from `onLoadOlder`. */
  loadingOlder?: boolean;
  /**
   * Adds a pause button. Paused, the list holds still while new entries keep arriving, and the footer counts them;
   * resume to catch up. Reported with `onLiveChange`, e.g. to close a socket.
   */
  liveTail?: boolean;
  onLiveChange?: (live: boolean) => void;
  labels?: Partial<LogViewerLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  title: undefined,
  streaming: false,
  follow: true,
  defaultLevels: undefined,
  defaultQuery: "",
  timestamps: true,
  utc: false,
  rowHeight: 24,
  height: "24rem",
  onDownload: undefined,
  downloadFilename: "logs.log",
  manual: false,
  onFilterChange: undefined,
  counts: undefined,
  total: undefined,
  ranges: undefined,
  defaultRange: undefined,
  hasOlder: false,
  onLoadOlder: undefined,
  loadingOlder: undefined,
  liveTail: false,
  onLiveChange: undefined,
  labels: undefined,
});

const nq = useNasaq();
const isAr = computed(() => nq.locale.value.startsWith("ar"));
const t = computed<LogViewerLabels>(() => ({ ...LOG_VIEWER_STRINGS[isAr.value ? "ar" : "en"], ...props.labels }));
const uid = useId();

/** Level text uses a token colour and always a written label, so it never relies on colour alone. */
const LEVEL_TEXT: Record<LogLevel, string> = {
  trace: "text-muted-foreground",
  debug: "text-nq-info-text",
  info: "text-nq-success-text",
  warn: "text-nq-warning-text",
  error: "text-nq-danger-text",
  fatal: "text-nq-danger-text font-bold",
};
const LEVEL_ROW: Record<LogLevel, string> = {
  trace: "",
  debug: "",
  info: "",
  warn: "bg-nq-warning-soft/50",
  error: "bg-nq-danger-soft/60",
  fatal: "bg-nq-danger-soft",
};
const LEVEL_TAG: Record<LogLevel, string> = { trace: "TRACE", debug: "DEBUG", info: "INFO", warn: "WARN", error: "ERROR", fatal: "FATAL" };

const levels = ref<ReadonlySet<LogLevel>>(new Set(props.defaultLevels ?? LOG_LEVELS));
const query = ref(props.defaultQuery);
const regex = ref(false);
const showTime = ref(props.timestamps);
const selected = ref<LogEntry["id"] | null>(null);
const copied = ref("");
let flashTimer: ReturnType<typeof setTimeout> | null = null;

const rangeId = ref(props.defaultRange ?? props.ranges?.[props.ranges.length - 1]?.id ?? "");
const range = computed(() => props.ranges?.find((r) => r.id === rangeId.value) ?? null);
const pausedAt = ref<{ id: LogEntry["id"] | null } | null>(null);
const ownLoading = ref(false);
const loadingOlder = computed(() => props.loadingOlder ?? ownLoading.value);

// Paused, the list stops at the last entry it had; later entries wait and are counted.
const shown = computed(() => (pausedAt.value ? entriesUntil(props.entries, pausedAt.value.id) : props.entries));
const waiting = computed(() => (pausedAt.value ? props.entries.length - shown.value.length : 0));

const counts = computed(() => ({ ...countByLevel(shown.value), ...props.counts }));
const filtered = computed(() => {
  if (props.manual) return { entries: shown.value as LogEntry[], invalid: compileMatcher(query.value, regex.value) === "invalid" };
  return filterLogs(shown.value, { levels: levels.value, query: query.value, regex: regex.value, since: rangeSince(range.value ?? undefined) });
});
const rows = computed(() => filtered.value.entries);
const invalid = computed(() => filtered.value.invalid);
const matcher = computed(() => {
  const m = compileMatcher(query.value, regex.value);
  return m === "invalid" ? null : m;
});
const filtering = computed(() => levels.value.size < LOG_LEVELS.length || query.value !== "" || (!!range.value && range.value.ms !== null));

// Report filter changes to a server, but not the initial state.
const levelKey = computed(() => LOG_LEVELS.filter((l) => levels.value.has(l)).join(","));
watch([levelKey, query, regex, rangeId], () => {
  props.onFilterChange?.({
    levels: LOG_LEVELS.filter((l) => levels.value.has(l)),
    query: query.value,
    regex: regex.value,
    range: range.value,
    since: rangeSince(range.value ?? undefined),
  });
});

const { el: listEl, following, setFollowing, onScroll: onFollowScroll } = useFollowScroll<HTMLDivElement>(() => rows.value.length, props.follow);
const scroll = ref({ top: 0, height: 0 });
let observer: ResizeObserver | null = null;
onMounted(() => {
  const el = listEl.value;
  if (!el) return;
  const measure = () => {
    if (scroll.value.height !== el.clientHeight) scroll.value = { top: el.scrollTop, height: el.clientHeight };
  };
  measure();
  if (typeof ResizeObserver !== "undefined") {
    observer = new ResizeObserver(measure);
    observer.observe(el);
  }
});
onBeforeUnmount(() => {
  observer?.disconnect();
  if (flashTimer) clearTimeout(flashTimer);
});
function onScroll() {
  onFollowScroll();
  const el = listEl.value;
  if (el) scroll.value = { top: el.scrollTop, height: el.clientHeight };
}

// Keep the reader's place when older entries are prepended.
const OLDER_BAR = 36;
const head = computed(() => (props.hasOlder || loadingOlder.value ? OLDER_BAR : 0));
let anchor: { height: number; top: number } | null = null;
watch(
  [() => rows.value.length, head],
  () => {
    const el = listEl.value;
    if (!el || !anchor || el.scrollHeight === anchor.height) return;
    el.scrollTop = anchor.top + (el.scrollHeight - anchor.height);
    anchor = null;
    onScroll();
  },
  { flush: "post" },
);
async function loadOlder() {
  if (!props.onLoadOlder || loadingOlder.value) return;
  const el = listEl.value;
  if (el) anchor = { height: el.scrollHeight, top: el.scrollTop };
  setFollowing(false);
  ownLoading.value = true;
  try {
    await props.onLoadOlder();
  } finally {
    ownLoading.value = false;
  }
}
function setLive(live: boolean) {
  pausedAt.value = live ? null : { id: props.entries.length ? props.entries[props.entries.length - 1]!.id : null };
  if (live) setFollowing(true);
  props.onLiveChange?.(live);
}

const windowed = computed(() => virtualWindow({ scrollTop: Math.max(0, scroll.value.top - head.value), viewport: scroll.value.height, rowHeight: props.rowHeight, count: rows.value.length }));
const visible = computed(() => rows.value.slice(windowed.value.start, windowed.value.end).map((entry, i) => ({ entry, index: windowed.value.start + i })));
const selectedIndex = computed(() => (selected.value === null ? -1 : rows.value.findIndex((r) => r.id === selected.value)));
const selectedEntry = computed(() => (selectedIndex.value >= 0 ? rows.value[selectedIndex.value] : undefined));
const timeOptions = computed(() => ({ utc: props.utc }));

function reveal(index: number) {
  const el = listEl.value;
  if (!el) return;
  const top = head.value + index * props.rowHeight;
  if (top < el.scrollTop) el.scrollTop = index === 0 ? 0 : top;
  else if (top + props.rowHeight > el.scrollTop + el.clientHeight) el.scrollTop = top + props.rowHeight - el.clientHeight;
}
function onKeyDown(e: KeyboardEvent) {
  if (!rows.value.length) return;
  const page = Math.max(1, Math.floor(scroll.value.height / props.rowHeight) - 1);
  const at = selectedIndex.value;
  const move: Record<string, number> = {
    ArrowDown: at + 1,
    ArrowUp: at < 0 ? rows.value.length - 1 : at - 1,
    PageDown: at + page,
    PageUp: at - page,
    Home: 0,
    End: rows.value.length - 1,
  };
  if (e.key === "Escape") {
    selected.value = null;
    return;
  }
  if (!(e.key in move)) return;
  e.preventDefault();
  const next = Math.min(rows.value.length - 1, Math.max(0, move[e.key] as number));
  selected.value = (rows.value[next] as LogEntry).id;
  reveal(next);
}

function flash(message: string) {
  copied.value = message;
  if (flashTimer) clearTimeout(flashTimer);
  flashTimer = setTimeout(() => (copied.value = ""), 1500);
}
function download() {
  if (props.onDownload) return props.onDownload(rows.value);
  const blob = new Blob([`${logsToText(rows.value, timeOptions.value)}\n`], { type: "text/plain;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = props.downloadFilename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(href), 0);
}
function toggleLevel(level: LogLevel) {
  const next = new Set(levels.value);
  if (next.has(level)) next.delete(level);
  else next.add(level);
  levels.value = next;
}
function reset() {
  levels.value = new Set(LOG_LEVELS);
  query.value = "";
  regex.value = false;
  if (props.ranges?.length) rangeId.value = props.ranges.find((r) => r.ms === null)?.id ?? props.ranges[props.ranges.length - 1]!.id;
}
async function copyVisible() {
  if (await copyText(logsToText(rows.value, timeOptions.value))) flash(t.value.copied);
}
const detailText = computed(() => {
  const e = selectedEntry.value;
  return e ? `${logsToText([e], timeOptions.value)}${e.fields ? `\n${fieldsToText(e.fields)}` : ""}` : "";
});
async function copyEntry() {
  if (await copyText(detailText.value)) flash(t.value.entryCopied);
}
const pieces = (entry: LogEntry) => splitByRanges(entry.message, matcher.value ? matcher.value.ranges(entry.message) : []);
const fieldText = (v: unknown) => (typeof v === "string" ? v : JSON.stringify(v));
const fieldRows = computed(() => (selectedEntry.value?.fields ? Object.entries(selectedEntry.value.fields) : []));

watch(
  () => props.entries,
  () => {
    if (selected.value !== null && !props.entries.some((e) => e.id === selected.value)) selected.value = null;
  },
);
</script>

<template>
  <div
    data-slot="log-viewer"
    :data-streaming="props.streaming || undefined"
    :data-paused="pausedAt ? '' : undefined"
    dir="ltr"
    :class="cn('relative flex min-w-0 flex-col overflow-hidden rounded-surface border border-border bg-nq-surface-soft text-start', props.class)"
  >
    <div data-slot="log-viewer-toolbar" class="flex flex-wrap items-center gap-2 border-b border-border p-2">
      <NqInputGroup class="min-w-40 flex-1 basis-56">
        <NqInputGroupAddon align="start">
          <Search aria-hidden="true" class="size-4 text-muted-foreground" />
        </NqInputGroupAddon>
        <NqInputGroupInput
          v-model="query"
          ltr
          type="search"
          :placeholder="t.searchPlaceholder"
          :aria-label="t.search"
          :aria-invalid="invalid || undefined"
          :aria-describedby="invalid ? `${uid}-invalid` : undefined"
          class="font-mono text-code"
        />
        <NqInputGroupAddon align="end">
          <NqButton
            type="button"
            variant="ghost"
            size="icon-sm"
            :aria-label="t.regex"
            :aria-pressed="regex"
            :data-active="regex || undefined"
            class="data-active:bg-nq-selected"
            @click="regex = !regex"
          >
            <Regex aria-hidden="true" />
          </NqButton>
        </NqInputGroupAddon>
      </NqInputGroup>
      <NqNativeSelect
        v-if="props.ranges?.length"
        v-model="rangeId"
        size="sm"
        :aria-label="t.range"
        data-slot="log-viewer-range"
        :options="props.ranges.map((r) => ({ value: r.id, label: (isAr && r.labelAr) || r.label }))"
        class="w-auto"
      />
      <div role="group" :aria-label="t.levels" class="flex flex-wrap items-center gap-1">
        <button
          v-for="level in LOG_LEVELS"
          :key="level"
          type="button"
          :aria-pressed="levels.has(level)"
          :data-level="level"
          :class="
            cn(
              'inline-flex h-control-sm items-center gap-1.5 rounded-control border px-2 text-caption outline-none transition-colors duration-150 ease-nq',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus',
              levels.has(level) ? 'border-border bg-card text-foreground' : 'border-transparent text-muted-foreground line-through hover:bg-nq-hover',
            )
          "
          @click="toggleLevel(level)"
        >
          <span :class="cn('font-mono', levels.has(level) && LEVEL_TEXT[level])">{{ t.level[level] }}</span>
          <span class="tabular-nums text-muted-foreground">{{ counts[level] ?? 0 }}</span>
        </button>
      </div>
      <div class="ms-auto flex items-center gap-0.5">
        <slot name="toolbar" />
        <NqButton
          v-if="props.liveTail"
          type="button"
          variant="ghost"
          size="icon-sm"
          :aria-label="pausedAt ? t.resume : t.pause"
          :aria-pressed="!!pausedAt"
          data-slot="log-viewer-live"
          :data-active="pausedAt ? true : undefined"
          class="data-active:bg-nq-selected"
          @click="setLive(!!pausedAt)"
        >
          <Play v-if="pausedAt" aria-hidden="true" />
          <Pause v-else aria-hidden="true" />
        </NqButton>
        <NqButton
          type="button"
          variant="ghost"
          size="icon-sm"
          :aria-label="t.timestamps"
          :aria-pressed="showTime"
          :data-active="showTime || undefined"
          class="data-active:bg-nq-selected"
          @click="showTime = !showTime"
        >
          <Clock aria-hidden="true" />
        </NqButton>
        <NqButton
          type="button"
          variant="ghost"
          size="icon-sm"
          :aria-label="t.follow"
          :aria-pressed="following"
          :data-active="following || undefined"
          class="data-active:bg-nq-selected"
          @click="setFollowing(!following)"
        >
          <ArrowDownToLine aria-hidden="true" />
        </NqButton>
        <NqButton
          type="button"
          variant="ghost"
          size="icon-sm"
          :aria-label="t.copy"
          :data-copied="copied === t.copied || undefined"
          class="data-copied:text-nq-success-text"
          @click="copyVisible"
        >
          <Check v-if="copied === t.copied" aria-hidden="true" />
          <Copy v-else aria-hidden="true" />
        </NqButton>
        <NqButton type="button" variant="ghost" size="icon-sm" :aria-label="t.download" @click="download">
          <Download aria-hidden="true" />
        </NqButton>
      </div>
    </div>
    <p v-if="invalid" :id="`${uid}-invalid`" class="border-b border-border px-3 py-1 text-caption text-nq-danger-text">{{ t.invalidRegex }}</p>

    <div class="relative">
      <div
        ref="listEl"
        data-slot="log-viewer-list"
        role="log"
        :aria-label="props.title ?? t.list"
        aria-live="off"
        :aria-activedescendant="selectedEntry ? `${uid}-${selectedEntry.id}` : undefined"
        tabindex="0"
        :style="{ height: typeof props.height === 'number' ? `${props.height}px` : props.height }"
        class="overflow-auto font-mono text-code outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus"
        @scroll="onScroll"
        @keydown="onKeyDown"
      >
        <template v-if="rows.length === 0">
          <div v-if="props.hasOlder || loadingOlder" data-slot="log-viewer-older" class="flex items-center justify-center border-b border-border/60" :style="{ height: `${OLDER_BAR}px` }">
            <span v-if="loadingOlder" role="status" class="inline-flex items-center gap-2 font-sans text-caption text-muted-foreground">
              <NqSpinner class="size-3" />
              {{ t.loadingOlder }}
            </span>
            <NqButton v-else-if="props.onLoadOlder" type="button" size="sm" variant="ghost" @click="loadOlder">
              <History aria-hidden="true" />
              {{ t.loadOlder }}
            </NqButton>
          </div>
          <NqEmptyState
            class="m-3 border-0"
            :title="props.entries.length === 0 ? t.emptyTitle : t.noMatchTitle"
            :description="props.entries.length === 0 ? t.emptyBody : t.noMatchBody"
          >
            <template v-if="props.entries.length > 0 && filtering" #actions>
              <NqButton type="button" size="sm" @click="reset">
                <X aria-hidden="true" />
                {{ t.resetFilters }}
              </NqButton>
            </template>
          </NqEmptyState>
        </template>
        <div v-else :style="{ height: `${head + rows.length * props.rowHeight}px` }" class="relative min-w-full w-max">
          <div v-if="props.hasOlder || loadingOlder" class="absolute inset-x-0 top-0">
            <div v-if="props.hasOlder || loadingOlder" data-slot="log-viewer-older" class="flex items-center justify-center border-b border-border/60" :style="{ height: `${OLDER_BAR}px` }">
              <span v-if="loadingOlder" role="status" class="inline-flex items-center gap-2 font-sans text-caption text-muted-foreground">
                <NqSpinner class="size-3" />
                {{ t.loadingOlder }}
              </span>
              <NqButton v-else-if="props.onLoadOlder" type="button" size="sm" variant="ghost" @click="loadOlder">
                <History aria-hidden="true" />
                {{ t.loadOlder }}
              </NqButton>
            </div>
          </div>
          <div
            v-for="{ entry, index } in visible"
            :id="`${uid}-${entry.id}`"
            :key="entry.id"
            role="listitem"
            :aria-posinset="index + 1"
            :aria-setsize="rows.length"
            :aria-current="entry.id === selected || undefined"
            :data-level="entry.level"
            :data-selected="entry.id === selected || undefined"
            :title="entryText(entry).length > 200 ? undefined : entryText(entry)"
            :style="{ position: 'absolute', insetInlineStart: 0, insetInlineEnd: 0, top: `${head + index * props.rowHeight}px`, height: `${props.rowHeight}px` }"
            :class="cn('flex cursor-default items-center gap-3 whitespace-pre px-3 hover:bg-nq-hover', LEVEL_ROW[entry.level], entry.id === selected && 'bg-nq-selected hover:bg-nq-selected')"
            @click="selected = entry.id === selected ? null : entry.id"
          >
            <span v-if="showTime" class="shrink-0 text-muted-foreground tabular-nums">{{ formatLogTime(entry.time, timeOptions) }}</span>
            <span :class="cn('w-[5ch] shrink-0', LEVEL_TEXT[entry.level])">{{ LEVEL_TAG[entry.level] }}</span>
            <span v-if="entry.source" class="max-w-[16ch] shrink-0 truncate text-nq-info-text">{{ entry.source }}</span>
            <span class="text-foreground">
              <template v-for="(part, i) in pieces(entry)" :key="i">
                <mark v-if="part.match" class="rounded-[2px] bg-nq-accent/30 text-inherit">{{ part.text }}</mark>
                <span v-else>{{ part.text }}</span>
              </template>
            </span>
          </div>
        </div>
      </div>
      <NqButton v-if="pausedAt && waiting > 0" type="button" size="sm" variant="primary" class="absolute end-3 bottom-3 shadow-sm" @click="setLive(true)">
        <Play aria-hidden="true" />
        {{ t.newWhilePaused(waiting) }}
      </NqButton>
      <NqButton v-else-if="!following && rows.length > 0 && !pausedAt" type="button" size="sm" variant="secondary" class="absolute end-3 bottom-3 shadow-sm" @click="setFollowing(true)">
        <ArrowDownToLine aria-hidden="true" />
        {{ t.jump }}
      </NqButton>
    </div>

    <section
      v-if="selectedEntry"
      data-slot="log-viewer-detail"
      :aria-label="t.detail"
      class="max-h-48 shrink-0 overflow-auto border-t border-border bg-card p-3 font-mono text-code"
    >
      <div class="mb-2 flex items-center justify-between gap-2">
        <span :class="cn('text-caption', LEVEL_TEXT[selectedEntry.level])">
          {{ LEVEL_TAG[selectedEntry.level] }}
          <span class="text-muted-foreground">{{ formatLogTime(selectedEntry.time, { date: true, utc: props.utc }) }}</span>
          <span v-if="selectedEntry.source" class="text-nq-info-text"> {{ selectedEntry.source }}</span>
        </span>
        <span class="flex items-center">
          <NqButton type="button" variant="ghost" size="icon-sm" :aria-label="t.copyEntry" @click="copyEntry">
            <Copy aria-hidden="true" />
          </NqButton>
          <NqButton type="button" variant="ghost" size="icon-sm" :aria-label="t.closeDetail" @click="selected = null">
            <X aria-hidden="true" />
          </NqButton>
        </span>
      </div>
      <p class="whitespace-pre-wrap break-all text-foreground">{{ selectedEntry.message }}</p>
      <dl v-if="fieldRows.length" class="mt-2 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-0.5">
        <div v-for="[k, v] in fieldRows" :key="k" class="contents">
          <dt class="text-muted-foreground">{{ k }}</dt>
          <dd class="m-0 break-all text-foreground">{{ fieldText(v) }}</dd>
        </div>
      </dl>
    </section>

    <div data-slot="log-viewer-footer" class="flex h-8 items-center justify-between gap-2 border-t border-border px-3 text-caption text-muted-foreground">
      <span class="tabular-nums">{{ t.count(rows.length, props.total ?? shown.length) }}</span>
      <span v-if="pausedAt" role="status" class="inline-flex items-center gap-1 text-nq-warning-text">
        <Pause aria-hidden="true" class="size-3" />
        {{ t.paused }}
        <span v-if="waiting > 0" class="tabular-nums text-muted-foreground"> · {{ t.newWhilePaused(waiting) }}</span>
      </span>
      <span v-else-if="props.streaming" class="inline-flex items-center gap-1 text-nq-success-text">
        <NqSpinner class="size-3" />
        {{ t.streaming }}
      </span>
    </div>
    <span role="status" aria-live="polite" class="sr-only">{{ copied }}</span>
  </div>
</template>
