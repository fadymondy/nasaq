<script setup lang="ts">
import { ArrowLeft, History, RotateCcw } from "lucide-vue-next";
import { computed, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlertDialog, NqAlertDialogCancel, NqAlertDialogContent, NqAlertDialogDescription, NqAlertDialogFooter, NqAlertDialogHeader, NqAlertDialogTitle } from "../alert-dialog";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCodeBlock } from "../code-block";
import { NqDateTime, useFormatNumber } from "../numeric";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqEmptyState, NqSkeleton } from "../states";
import { NqTabs, NqTabsList, NqTabsPanel, NqTabsTab } from "../tabs";
import { diffLines, diffStats, foldDiff, sortVersions } from "./diff";
import { STRINGS, type HistoryVersion, type VersionHistoryLabels } from "./strings";

// Saved versions newest first. Choose one to read it (read-only), compare it with the previous version, the current one
// or any other, and restore it after a confirmation. No backend: `onRestore` does the saving. Slots `preview` and `diff`
// replace the text views for content that is not text.
interface Props {
  versions: readonly HistoryVersion[];
  /** The version live now. Default: the newest. */
  currentId?: string;
  selectedId?: string | null;
  defaultSelectedId?: string | null;
  /** Restore is itself a new version. Return `{ error }` to show why it failed. Without it there is no restore button. */
  onRestore?: (version: HistoryVersion) => Promise<void | { error?: string }>;
  /** Syntax for the preview and diff text. */
  language?: string;
  loading?: boolean;
  labels?: VersionHistoryLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { currentId: undefined, selectedId: undefined, defaultSelectedId: null, onRestore: undefined, language: "text", loading: false, labels: undefined });
const emit = defineEmits<{ select: [version: HistoryVersion | null]; "update:selectedId": [id: string | null] }>();

const nq = useNasaq();
const t = computed(() => ({ ...STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
const uid = useId();
const fmt = useFormatNumber();
const sorted = computed(() => sortVersions(props.versions));
const liveId = computed(() => props.currentId ?? sorted.value[0]?.id);
const selectedState = ref<string | null>(props.defaultSelectedId);
const selectedId = computed(() => (props.selectedId === undefined ? selectedState.value : props.selectedId));
const selected = computed(() => sorted.value.find((v) => v.id === selectedId.value) ?? null);
const baseline = ref("previous");
const tab = ref("preview");
const confirm = ref<HistoryVersion | null>(null);
const busy = ref(false);
const error = ref<string | null>(null);

function choose(v: HistoryVersion | null) {
  if (props.selectedId === undefined) selectedState.value = v?.id ?? null;
  error.value = null;
  emit("update:selectedId", v?.id ?? null);
  emit("select", v);
}
const base = computed(() => {
  const sel = selected.value;
  if (!sel) return undefined;
  if (baseline.value === "previous") return sorted.value[sorted.value.findIndex((v) => v.id === sel.id) + 1];
  if (baseline.value === "current") return sorted.value.find((v) => v.id === liveId.value);
  return sorted.value.find((v) => v.id === baseline.value);
});
const lines = computed(() => (selected.value && base.value ? diffLines(base.value.content, selected.value.content) : []));
const stats = computed(() => diffStats(lines.value));
const items = computed(() => foldDiff(lines.value, 3));

async function restore(v: HistoryVersion) {
  if (!props.onRestore) return;
  busy.value = true;
  error.value = null;
  let res: void | { error?: string };
  try {
    res = await props.onRestore(v);
  } finally {
    busy.value = false;
  }
  if (res && res.error) error.value = res.error;
  confirm.value = null;
}

const baselineItems = computed(() => [
  { value: "previous", label: t.value.previous },
  { value: "current", label: t.value.currentVersion },
  ...sorted.value.filter((v) => v.id !== selected.value?.id).map((v) => ({ value: v.id, label: t.value.version(fmt(v.version)) })),
]);
const baselineLabel = computed(() => baselineItems.value.find((o) => o.value === baseline.value)?.label);
const dateFormat = { dateStyle: "medium", timeStyle: "short" } as const;
</script>

<template>
  <div data-slot="version-history" :aria-busy="props.loading || undefined" :class="cn('grid min-w-0 gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-start', props.class)">
    <section :aria-label="t.list" :class="cn('min-w-0 rounded-card border border-border bg-card', selected && 'hidden lg:block')">
      <div v-if="props.loading" class="flex flex-col gap-2 p-3">
        <NqSkeleton v-for="i in 3" :key="i" class="h-16" />
      </div>
      <NqEmptyState v-else-if="sorted.length === 0" :icon="History" :title="t.none" :description="t.noneBody" />
      <ol v-else class="divide-y divide-border">
        <li v-for="v in sorted" :key="v.id" :data-version-row="v.version" :class="cn(v.id === selectedId && 'bg-nq-selected')">
          <button
            type="button"
            :aria-pressed="v.id === selectedId"
            class="block w-full px-4 py-3 text-start outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus"
            @click="choose(v.id === selectedId ? null : v)"
          >
            <span class="flex flex-wrap items-center gap-2">
              <span class="text-label text-foreground">{{ t.version(fmt(v.version)) }}</span>
              <NqBadge v-if="v.id === liveId" variant="success">{{ t.current }}</NqBadge>
            </span>
            <span class="block text-caption text-muted-foreground">
              <NqDateTime :value="v.savedAt" :format="dateFormat" />
              <template v-if="v.author"> · {{ t.by(v.author) }}</template>
            </span>
            <span v-if="v.note" dir="auto" class="mt-1 block text-body-sm text-foreground">{{ v.note }}</span>
          </button>
        </li>
      </ol>
    </section>

    <section :aria-label="selected ? t.version(fmt(selected.version)) : t.pick" :class="cn('min-w-0 rounded-card border border-border bg-card p-4', !selected && 'hidden lg:block')">
      <div v-if="selected" class="flex flex-col gap-4">
        <header class="flex flex-wrap items-start gap-3">
          <NqButton variant="ghost" size="icon-sm" class="lg:hidden" :aria-label="t.back" :title="t.back" @click="choose(null)">
            <ArrowLeft aria-hidden="true" class="rtl:-scale-x-100" />
          </NqButton>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-h4 text-foreground">{{ t.version(fmt(selected.version)) }}</h2>
              <NqBadge v-if="selected.id === liveId" variant="success">{{ t.current }}</NqBadge>
              <NqBadge v-else variant="outline">{{ t.readOnly }}</NqBadge>
            </div>
            <p class="text-body-sm text-muted-foreground">
              <NqDateTime :value="selected.savedAt" :format="dateFormat" />
              <template v-if="selected.author"> · {{ t.by(selected.author) }}</template>
            </p>
            <p v-if="selected.note" dir="auto" class="mt-1 text-body-sm text-foreground">{{ selected.note }}</p>
          </div>
          <NqButton v-if="props.onRestore && selected.id !== liveId" variant="primary" size="sm" @click="confirm = selected">
            <RotateCcw aria-hidden="true" />
            {{ t.restore }}
          </NqButton>
        </header>
        <p v-if="error" role="alert" class="rounded-control bg-nq-danger-soft px-3 py-2 text-body-sm text-nq-danger-text">{{ error }}</p>
        <NqTabs v-model="tab">
          <NqTabsList variant="underline">
            <NqTabsTab value="preview">{{ t.preview }}</NqTabsTab>
            <NqTabsTab value="changes">{{ t.changes }}</NqTabsTab>
          </NqTabsList>
          <NqTabsPanel value="preview">
            <slot name="preview" :version="selected">
              <NqCodeBlock :code="selected.content" :language="props.language" :label="t.version(fmt(selected.version))" pre-class-name="max-h-[28rem]" />
            </slot>
          </NqTabsPanel>
          <NqTabsPanel value="changes">
            <div class="flex flex-col gap-3">
              <div class="flex flex-wrap items-center gap-3">
                <span :id="`${uid}-compare`" class="text-label text-foreground">{{ t.compareWith }}</span>
                <NqSelect v-model="baseline">
                  <NqSelectTrigger :aria-labelledby="`${uid}-compare`" class="w-56"><NqSelectValue>{{ baselineLabel }}</NqSelectValue></NqSelectTrigger>
                  <NqSelectContent>
                    <NqSelectItem v-for="o in baselineItems" :key="o.value" :value="o.value">{{ o.label }}</NqSelectItem>
                  </NqSelectContent>
                </NqSelect>
                <span v-if="base && stats.changed" class="flex gap-2 text-body-sm tabular-nums" aria-live="polite">
                  <span class="text-nq-success-text">+ {{ t.added(fmt(stats.added)) }}</span>
                  <span class="text-nq-danger-text">− {{ t.removed(fmt(stats.removed)) }}</span>
                </span>
              </div>
              <p v-if="!base" class="text-body-sm text-muted-foreground">{{ t.noPrevious }}</p>
              <slot v-else name="diff" :older="base" :newer="selected">
                <div v-if="stats.changed" dir="ltr" role="table" :aria-label="t.diffLabel" data-slot="version-diff" class="overflow-x-auto rounded-control border border-border font-mono text-code">
                  <template v-for="(it, i) in items" :key="i">
                    <div v-if="it.type === 'gap'" role="row" class="bg-nq-surface-soft px-3 py-1 text-center text-caption text-muted-foreground" dir="auto">{{ t.unchanged(fmt(it.count)) }}</div>
                    <div v-else role="row" :data-diff="it.type" :class="cn('flex min-w-max', it.type === 'add' && 'bg-nq-success-soft', it.type === 'del' && 'bg-nq-danger-soft')">
                      <span role="cell" aria-hidden="true" class="w-10 shrink-0 select-none px-2 text-end text-muted-foreground tabular-nums">{{ it.oldLine ?? "" }}</span>
                      <span role="cell" aria-hidden="true" class="w-10 shrink-0 select-none px-2 text-end text-muted-foreground tabular-nums">{{ it.newLine ?? "" }}</span>
                      <span role="cell" class="w-6 shrink-0 select-none text-center font-semibold" :aria-label="it.type === 'add' ? t.lineAdded : it.type === 'del' ? t.lineRemoved : undefined">{{ it.type === "add" ? "+" : it.type === "del" ? "−" : "" }}</span>
                      <span role="cell" class="whitespace-pre pe-3 text-foreground">{{ it.text || " " }}</span>
                    </div>
                  </template>
                </div>
                <p v-else class="text-body-sm text-muted-foreground">{{ t.identical }}</p>
              </slot>
            </div>
          </NqTabsPanel>
        </NqTabs>
      </div>
      <NqEmptyState v-else :icon="History" :title="t.pick" :description="t.pickBody" />
    </section>

    <NqAlertDialog :open="confirm !== null" @update:open="(o: boolean) => !o && !busy && (confirm = null)">
      <NqAlertDialogContent>
        <NqAlertDialogHeader>
          <NqAlertDialogTitle>{{ confirm ? t.restoreTitle(fmt(confirm.version)) : "" }}</NqAlertDialogTitle>
          <NqAlertDialogDescription>{{ t.restoreBody }}</NqAlertDialogDescription>
        </NqAlertDialogHeader>
        <NqAlertDialogFooter>
          <NqAlertDialogCancel :disabled="busy">{{ t.cancel }}</NqAlertDialogCancel>
          <NqButton variant="primary" :loading="busy" data-slot="version-restore-confirm" @click="confirm && restore(confirm)">{{ busy ? t.restoring : t.restoreConfirm }}</NqButton>
        </NqAlertDialogFooter>
      </NqAlertDialogContent>
    </NqAlertDialog>
  </div>
</template>
