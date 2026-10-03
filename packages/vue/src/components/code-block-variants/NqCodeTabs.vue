<script lang="ts">
import { reactive } from "vue";

// Blocks with the same `syncKey` switch together (choose pnpm once, every install block follows).
const synced = reactive<Record<string, string>>({});
</script>

<script setup lang="ts">
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqCodeBlock } from "../code-block";
import { NqTabs, NqTabsIndicator, NqTabsList, NqTabsPanel, NqTabsTab } from "../tabs";
import NqCodeCopyMenu from "./NqCodeCopyMenu.vue";
import NqCodeVariantCopy from "./NqCodeVariantCopy.vue";
import type { AiTarget } from "./format";
import { STRINGS, type CodeCopyKind, type CodeTab, type CodeVariantLabels } from "./strings";

// The same snippet in several languages or package managers, in tabs. Each panel is a code block, so it highlights lazily
// and stays left-to-right in Arabic pages. Copy always copies the visible tab.
const props = withDefaults(defineProps<{
  tabs: readonly CodeTab[];
  /** Controlled selected tab value (v-model). */
  modelValue?: string;
  /** Initial tab when uncontrolled. Default the first. */
  defaultValue?: string;
  syncKey?: string;
  /** Shown left of the tabs, e.g. a filename. Hidden on narrow screens. */
  title?: string;
  /** Use the AI copy menu instead of the plain copy button. Pass an object to configure it. */
  aiCopy?: boolean | { instruction?: string; targets?: readonly AiTarget[]; openLinks?: boolean };
  lineNumbers?: boolean;
  /** Classes for the scrolling `<pre>`. */
  preClassName?: string;
  /** Accessible name of the tab list. */
  label?: string;
  labels?: Partial<CodeVariantLabels>;
  class?: HTMLAttributes["class"];
}>(), { modelValue: undefined, defaultValue: undefined, syncKey: undefined, title: undefined, aiCopy: false, lineNumbers: false, preClassName: undefined, label: undefined, labels: undefined });
const emit = defineEmits<{ "update:modelValue": [value: string]; copy: [kind: CodeCopyKind, text: string, target?: AiTarget] }>();

const nq = useNasaq();
const t = computed(() => ({ ...STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
const id = (tab: CodeTab) => tab.value ?? tab.label;
const local = ref(props.defaultValue ?? (props.tabs[0] ? id(props.tabs[0]) : ""));
const wanted = computed(() => props.modelValue ?? (props.syncKey ? synced[props.syncKey] : undefined) ?? local.value);
const current = computed(() => props.tabs.find((x) => id(x) === wanted.value) ?? props.tabs[0]);
const active = computed(() => (current.value ? id(current.value) : ""));
const menu = computed(() => (typeof props.aiCopy === "object" ? props.aiCopy : {}));
const plain = computed(() => (current.value ? current.value.code.replace(/\n$/, "") : ""));

function change(v: string | number) {
  const next = String(v);
  local.value = next;
  if (props.syncKey) synced[props.syncKey] = next;
  emit("update:modelValue", next);
}
</script>

<template>
  <div data-slot="code-tabs" dir="ltr" :class="cn('overflow-hidden rounded-surface border border-border bg-nq-surface-soft text-start', props.class)">
    <NqTabs :model-value="active" class="gap-0" @update:model-value="change">
      <div class="flex h-row items-center justify-between gap-2 border-b border-border ps-3 pe-1.5">
        <div class="flex min-w-0 items-center gap-3">
          <span v-if="props.title" class="hidden truncate font-mono text-caption text-muted-foreground sm:block">{{ props.title }}</span>
          <NqTabsList variant="underline" :aria-label="props.label ?? t.tabsLabel" class="h-row gap-3 border-b-0">
            <NqTabsTab v-for="tab in props.tabs" :key="id(tab)" :value="id(tab)" class="h-row font-mono text-caption">{{ tab.label }}</NqTabsTab>
            <NqTabsIndicator />
          </NqTabsList>
        </div>
        <template v-if="current">
          <NqCodeCopyMenu v-if="props.aiCopy" :code="current.code" :language="current.language" :filename="current.filename" :labels="props.labels" v-bind="menu" @copy="(k, x, g) => emit('copy', k, x, g)" />
          <NqCodeVariantCopy v-else :text="plain" :label="t.copyCode" :done="t.copiedCode" @copy="emit('copy', 'code', $event)" />
        </template>
      </div>
      <NqTabsPanel v-for="tab in props.tabs" :key="id(tab)" :value="id(tab)" class="outline-none">
        <NqCodeBlock :code="tab.code" :language="tab.language ?? 'bash'" :label="tab.filename ?? tab.label" :line-numbers="props.lineNumbers" :copyable="false" :pre-class-name="props.preClassName" class="rounded-none border-0 bg-transparent" />
      </NqTabsPanel>
    </NqTabs>
  </div>
</template>
