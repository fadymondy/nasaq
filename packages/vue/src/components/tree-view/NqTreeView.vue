<script setup lang="ts">
import { ChevronDown, ChevronRight } from "lucide-vue-next";
import { computed, onBeforeUnmount, ref, useAttrs, type HTMLAttributes, type VNodeChild } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq, useT } from "../../provider";
import { NqIcon } from "../icon";
import { NqSpinner } from "../spinner";
import { findTypeahead, flattenTree, getKeyAction, nextSelection, type SelectionMode } from "./tree-helpers";
import type { TreeNode } from "./types";

// A tree of nested items with expand and collapse, single or multiple selection, keyboard navigation and lazy children.
defineOptions({ inheritAttrs: false });
interface Props {
  /** The tree. Give every node a unique `id`. */
  items: TreeNode[];
  /** Expanded node ids (v-model:expanded). */
  expanded?: string[];
  defaultExpanded?: string[];
  /** Selected node ids (v-model:selected). */
  selected?: string[];
  defaultSelected?: string[];
  /** `single` replaces, `multiple` toggles (sets aria-multiselectable), `none` makes rows non-selectable. */
  selectionMode?: SelectionMode;
  /** Called when a node with no loaded children is expanded. Return a promise to show a spinner until it settles. */
  onExpand?: (node: TreeNode) => void | Promise<unknown>;
  /** Text direction for the arrow keys. Defaults to the Nasaq direction. */
  dir?: "ltr" | "rtl";
  /** Indent per level in rem. */
  indent?: number;
  /** Default "Loading" / "جارٍ التحميل" by the Nasaq locale. */
  loadingLabel?: string;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  expanded: undefined,
  defaultExpanded: () => [],
  selected: undefined,
  defaultSelected: () => [],
  selectionMode: "single",
  onExpand: undefined,
  dir: undefined,
  indent: 1.25,
  loadingLabel: undefined,
});
const emits = defineEmits<{ "update:expanded": [value: string[]]; "update:selected": [value: string[]] }>();

const attrs = useAttrs();
const nq = useNasaq();
const t = useT();
const dir = computed(() => props.dir ?? (nq.isRtl.value ? "rtl" : "ltr"));

const innerExpanded = ref<string[]>([...props.defaultExpanded]);
const innerSelected = ref<string[]>([...props.defaultSelected]);
const expanded = computed(() => props.expanded ?? innerExpanded.value);
const selected = computed(() => props.selected ?? innerSelected.value);
function setExpanded(next: string[]) {
  innerExpanded.value = next;
  emits("update:expanded", next);
}
function setSelected(next: string[]) {
  innerSelected.value = next;
  emits("update:selected", next);
}

const focusedId = ref<string | null>(null);
const loading = ref<ReadonlySet<string>>(new Set());
const root = ref<HTMLElement | null>(null);
const typeahead = { text: "", timer: 0 as number | undefined };
onBeforeUnmount(() => window.clearTimeout(typeahead.timer));

const flat = computed(() => flattenTree(props.items, new Set(expanded.value)));
const selectedSet = computed(() => new Set(selected.value));
const tabId = computed(() => {
  if (focusedId.value && flat.value.some((row) => row.id === focusedId.value && !row.node.disabled)) return focusedId.value;
  return (flat.value.find((row) => selectedSet.value.has(row.id) && !row.node.disabled) ?? flat.value.find((row) => !row.node.disabled))?.id ?? null;
});
const ariaLabel = computed(() => (attrs["aria-label"] as string | undefined) ?? (attrs["aria-labelledby"] ? undefined : t("Tree", "شجرة")));

function focusRow(id: string) {
  focusedId.value = id;
  root.value?.querySelector<HTMLElement>(`[data-node-id="${CSS.escape(id)}"]`)?.focus();
}

function expand(id: string) {
  const row = flat.value.find((r) => r.id === id);
  if (!row?.expandable || expanded.value.includes(id)) return;
  setExpanded([...expanded.value, id]);
  if (!row.node.children && props.onExpand) {
    const result = props.onExpand(row.node);
    if (result && typeof (result as Promise<unknown>).then === "function") {
      loading.value = new Set(loading.value).add(id);
      const done = () => {
        const next = new Set(loading.value);
        next.delete(id);
        loading.value = next;
      };
      (result as Promise<unknown>).then(done, done);
    }
  }
}
function collapse(id: string) {
  if (expanded.value.includes(id)) setExpanded(expanded.value.filter((e) => e !== id));
}
function activate(id: string) {
  if (props.selectionMode === "none") return;
  setSelected(nextSelection(selected.value, id, props.selectionMode));
}

function onKeydown(event: KeyboardEvent) {
  if (event.defaultPrevented) return;
  const target = (event.target as HTMLElement).closest<HTMLElement>("[data-node-id]");
  const id = target?.dataset.nodeId ?? null;
  if (!id || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    activate(id);
    return;
  }
  if (event.key.length === 1 && event.key !== " ") {
    window.clearTimeout(typeahead.timer);
    typeahead.text += event.key;
    typeahead.timer = window.setTimeout(() => {
      typeahead.text = "";
    }, 600);
    const match = findTypeahead(flat.value, id, typeahead.text);
    if (match) {
      event.preventDefault();
      focusRow(match);
    }
    return;
  }
  const action = getKeyAction(flat.value, id, event.key, dir.value);
  if (!action) return;
  event.preventDefault();
  if (action.type === "focus") focusRow(action.id);
  else if (action.type === "expand") expand(action.id);
  else collapse(action.id);
}

const Render = (p: { fn: () => VNodeChild }) => p.fn();
</script>

<template>
  <div
    ref="root"
    data-slot="tree-view"
    role="tree"
    v-bind="attrs"
    :aria-multiselectable="props.selectionMode === 'multiple' ? true : undefined"
    :aria-label="ariaLabel"
    :class="cn('flex flex-col gap-0.5 text-body text-foreground', props.class)"
    @keydown="onKeydown"
  >
    <div
      v-for="row in flat"
      :key="row.id"
      data-slot="tree-view-item"
      :data-node-id="row.id"
      :data-selected="selectedSet.has(row.id) ? '' : undefined"
      :data-expanded="row.expanded ? '' : undefined"
      :data-disabled="row.node.disabled ? '' : undefined"
      role="treeitem"
      :tabindex="row.id === tabId ? 0 : -1"
      :aria-level="row.level"
      :aria-setsize="row.setSize"
      :aria-posinset="row.posInSet"
      :aria-expanded="row.expandable ? row.expanded : undefined"
      :aria-selected="props.selectionMode === 'none' ? undefined : selectedSet.has(row.id)"
      :aria-disabled="row.node.disabled || undefined"
      :aria-busy="loading.has(row.id) || undefined"
      :style="{ paddingInlineStart: `${(row.level - 1) * props.indent + 0.375}rem` }"
      :class="
        cn(
          'flex min-h-8 cursor-default items-center gap-1.5 rounded-control pe-2 outline-none hover:bg-nq-hover',
          'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus',
          'data-[selected]:bg-nq-selected',
          'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        )
      "
      @focus="(e: FocusEvent) => e.target === e.currentTarget && (focusedId = row.id)"
      @click="
        () => {
          if (row.node.disabled) return;
          focusedId = row.id;
          activate(row.id);
        }
      "
    >
      <span
        data-slot="tree-view-toggle"
        class="flex size-5 shrink-0 items-center justify-center text-muted-foreground"
        @click="
          (e: MouseEvent) => {
            if (!row.expandable || row.node.disabled) return;
            e.stopPropagation();
            focusedId = row.id;
            row.expanded ? collapse(row.id) : expand(row.id);
          }
        "
      >
        <NqSpinner v-if="loading.has(row.id)" :label="props.loadingLabel ?? t('Loading', 'جارٍ التحميل')" class="size-3.5" />
        <template v-else-if="row.expandable">
          <ChevronDown v-if="row.expanded" aria-hidden="true" class="size-4" />
          <NqIcon v-else :icon="ChevronRight" directional aria-hidden="true" class="size-4" />
        </template>
      </span>
      <span v-if="row.node.icon" data-slot="tree-view-icon" aria-hidden="true" class="flex shrink-0 items-center text-muted-foreground [&_svg]:size-4">
        <component :is="row.node.icon" />
      </span>
      <span class="min-w-0 flex-1 truncate"><Render v-if="typeof row.node.label === 'function'" :fn="row.node.label" /><template v-else>{{ row.node.label }}</template></span>
    </div>
  </div>
</template>
