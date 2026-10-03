<script setup lang="ts">
import { ChevronDown, ChevronRight, ChevronUp, ChevronsDownUp, ChevronsUpDown, GripVertical, Plus, Trash2 } from "lucide-vue-next";
import { computed, nextTick, onBeforeUnmount, ref, useId, watch, type CSSProperties } from "vue";
import { cn } from "../../lib/cn";
import { NqAlertDialog, NqAlertDialogAction, NqAlertDialogCancel, NqAlertDialogContent, NqAlertDialogDescription, NqAlertDialogFooter, NqAlertDialogHeader, NqAlertDialogTitle } from "../alert-dialog";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCheckbox } from "../checkbox";
import { NqField, NqFieldDescription, NqFieldError, NqFieldLabel } from "../field";
import { NqIcon } from "../icon";
import { formatNumber } from "../numeric";
import { canAdd, canRemove, dropIndex, fitKeys, insertAt, moveItem, removeAt, shiftFor } from "../repeater/repeater-math";
import { NqTagInput } from "../tag-input";
import { NqTooltip } from "../tooltip";
import { useSchemaForm } from "./context";
import NqSchemaLeafInput from "./NqSchemaLeafInput.vue";
import NqSchemaNodes from "./NqSchemaNodes.vue";
import { schemaFormItemSummary, schemaFormItemTitle, schemaFormTreeDefaults, schemaFormTreeHasData, type SchemaTreeLeaf, type SchemaTreeList, type SchemaTreeObject } from "./schema-tree";
import { validateField } from "../schema-repeater/schema";

// A list: tags (strings), a checkbox group, repeated inputs, or collapsible groups of fields. Groups add, remove
// (asking first when they hold data), move up and down, and drag with native pointer events.
interface Props {
  node: SchemaTreeList;
  value: unknown[];
  path: string;
}
const props = defineProps<Props>();
const ctx = useSchemaForm();
const uid = useId();
const root = ref<HTMLElement | null>(null);
const n = (v: number) => formatNumber(v, ctx.locale);

const message = computed(() => ctx.messageFor(props.path));
const required = computed(() => ctx.states[props.path]?.required ?? props.node.required);
const min = computed(() => Math.max(props.node.min ?? 0, required.value ? 1 : 0));
const leaf = computed(() => props.node.item as SchemaTreeLeaf);
const item = computed(() => props.node.item as SchemaTreeObject);
const count = computed(() => props.value.length);
const span = computed(() => (props.node.width === "half" ? "" : "sm:col-span-2"));
const atMax = computed(() => !canAdd(count.value, props.node.max));
const limit = computed(() =>
  atMax.value && props.node.max !== undefined ? ctx.t.maxReached(n(props.node.max)) : min.value > 0 && count.value <= min.value ? ctx.t.minReached(n(min.value)) : null,
);

/* ------------------------------------------------------- stable item keys */
let serial = 0;
const makeKey = () => `${uid}-${serial++}`;
let keys: string[] = fitKeys([], count.value, makeKey);
const keyList = computed(() => {
  if (keys.length !== count.value) keys = fitKeys(keys, count.value, makeKey);
  return keys;
});

const collapsed = ref<ReadonlySet<string>>(new Set());
const pending = ref<number | null>(null);
let focusAfter: { kind: "item"; key: string } | { kind: "add" } | null = null;

function applyFocus() {
  const target = focusAfter;
  focusAfter = null;
  const scope = root.value;
  if (!target || !scope) return;
  const focusable = ":is(input, textarea, button, [role=combobox]):not([disabled])";
  if (target.kind === "add") scope.querySelector<HTMLElement>("[data-slot=schema-form-add]")?.focus();
  else if (props.node.mode === "groups") scope.querySelector<HTMLElement>(`[data-item-key="${target.key}"] [data-slot=schema-form-group-body] ${focusable}`)?.focus();
  else scope.querySelector<HTMLElement>(`[data-item-key="${target.key}"] ${focusable}`)?.focus();
}

// Open the groups that hold a path someone is going to (a failed submit, a link in the summary).
watch(
  () => ctx.reveal?.token,
  () => {
    const reveal = ctx.reveal;
    if (!reveal) return;
    const open: string[] = [];
    for (const p of reveal.paths) {
      if (!p.startsWith(`${props.path}[`)) continue;
      const match = /^\[(\d+)\]/.exec(p.slice(props.path.length));
      const key = match ? keyList.value[Number(match[1])] : undefined;
      if (key) open.push(key);
    }
    if (open.length && open.some((k) => collapsed.value.has(k))) collapsed.value = new Set([...collapsed.value].filter((k) => !open.includes(k)));
  },
);

const defaults = () => schemaFormTreeDefaults(props.node.mode === "groups" ? item.value : leaf.value);
function add() {
  if (ctx.disabled || !canAdd(count.value, props.node.max)) return;
  const key = makeKey();
  focusAfter = { kind: "item", key };
  keys = insertAt(keyList.value, count.value, key);
  ctx.onStructure(props.path, insertAt(props.value, count.value, defaults()));
  void nextTick(applyFocus);
}
function remove(index: number) {
  if (ctx.disabled || !canRemove(count.value, min.value)) return;
  focusAfter = { kind: "add" };
  keys = removeAt(keyList.value, index);
  ctx.onStructure(props.path, removeAt(props.value, index));
  void nextTick(applyFocus);
}
function move(from: number, to: number) {
  const target = Math.max(0, Math.min(count.value - 1, to));
  if (ctx.disabled || target === from) return;
  const key = keyList.value[from] as string;
  keys = moveItem(keyList.value, from, target);
  ctx.onStructure(props.path, moveItem(props.value, from, target));
  // A moved row can be re-inserted, which drops focus: put it back on the same kind of button.
  void nextTick(() => {
    const row = root.value?.querySelector<HTMLElement>(`[data-item-key="${key}"]`);
    const same = row?.querySelector<HTMLButtonElement>(`[data-action="${to < from ? "up" : "down"}"]`);
    const other = row?.querySelector<HTMLButtonElement>(`[data-action="${to < from ? "down" : "up"}"]`);
    if (same && !same.disabled) same.focus();
    else other?.focus();
  });
}
function ask(index: number) {
  if (schemaFormTreeHasData(item.value, props.value[index])) pending.value = index;
  else remove(index);
}
function confirmRemove() {
  if (pending.value !== null) remove(pending.value);
  pending.value = null;
}

/* ------------------------------------------------------------- checkboxes */
const options = computed(() => (leaf.value.field.type === "select" ? leaf.value.field.options : []));
const chosen = computed(() => new Set(props.value.map(String)));
function toggle(optionValue: string, next: boolean) {
  const set = new Set(chosen.value);
  if (next) set.add(optionValue);
  else set.delete(optionValue);
  ctx.onChange(props.path, options.value.filter((x) => set.has(x.value)).map((x) => x.value));
}
const optionDisabled = (v: string) => ctx.disabled || (!chosen.value.has(v) && props.node.max !== undefined && chosen.value.size >= props.node.max);

/* ------------------------------------------------------------------- tags */
const tagValidate = (tag: string) => validateField({ ...leaf.value.field, label: props.node.itemLabel, required: true }, tag, {}, ctx.messages) ?? true;
const tagField = computed(() => leaf.value.field);

/* ----------------------------------------------------------------- groups */
const titleOf = (index: number) => schemaFormItemTitle(props.node, props.value[index], index, n);
const allCollapsed = computed(() => count.value > 0 && keyList.value.every((k) => collapsed.value.has(k)));
const pendingName = computed(() => (pending.value === null ? "" : titleOf(pending.value).title));
const rows = computed(() =>
  props.value.map((entry, index) => {
    const { title, keys: used } = titleOf(index);
    return { entry, index, key: keyList.value[index] as string, path: `${props.path}[${index}]`, title, summary: schemaFormItemSummary(props.node, entry, used) };
  }),
);
function toggleRow(key: string) {
  const next = new Set(collapsed.value);
  if (!next.delete(key)) next.add(key);
  collapsed.value = next;
}

/* ----------------------------------------------------------- pointer drag */
const DRAG_DISTANCE = 3;
const drag = ref<{ from: number; over: number; dy: number; size: number } | null>(null);
let session: { from: number; startY: number; centers: number[]; size: number; id: number; active: boolean } | null = null;

function onDragStart(index: number, event: PointerEvent) {
  if (ctx.disabled || (event.pointerType === "mouse" && event.button !== 0)) return;
  const els = [...(root.value?.querySelectorAll<HTMLElement>('[data-slot="schema-form-group"]') ?? [])];
  if (els.length < 2) return;
  const rects = els.map((r) => r.getBoundingClientRect());
  const gap = rects.length > 1 ? Math.max(0, rects[1]!.top - rects[0]!.bottom) : 0;
  session = { from: index, startY: event.clientY, centers: rects.map((r) => r.top + r.height / 2), size: (rects[index]?.height ?? 0) + gap, id: event.pointerId, active: false };
  window.addEventListener("pointermove", onDragMove);
  window.addEventListener("pointerup", onDragEnd);
  window.addEventListener("pointercancel", stopDrag);
}
function onDragMove(event: PointerEvent) {
  if (!session || event.pointerId !== session.id) return;
  const dy = event.clientY - session.startY;
  if (!session.active) {
    if (Math.abs(dy) < DRAG_DISTANCE) return;
    session.active = true;
  }
  event.preventDefault();
  drag.value = { from: session.from, over: dropIndex(session.centers, session.from, dy), dy, size: session.size };
}
function stopDrag() {
  window.removeEventListener("pointermove", onDragMove);
  window.removeEventListener("pointerup", onDragEnd);
  window.removeEventListener("pointercancel", stopDrag);
  session = null;
  drag.value = null;
}
function onDragEnd(event: PointerEvent) {
  if (!session || event.pointerId !== session.id) return;
  const result = drag.value;
  stopDrag();
  if (result && result.over !== result.from) move(result.from, result.over);
}
onBeforeUnmount(stopDrag);

function rowStyle(index: number): CSSProperties | undefined {
  const d = drag.value;
  if (!d) return undefined;
  if (index === d.from) return { transform: `translateY(${d.dy}px)`, transition: "none" };
  const shift = shiftFor(index, d.from, d.over, d.size);
  return { transform: shift ? `translateY(${shift}px)` : undefined, transition: "transform 200ms var(--ease-nq, ease)" };
}
</script>

<template>
  <!-- Tags: strings in a single control. -->
  <NqField v-if="node.mode === 'tags'" :data-schema-path="props.path" :invalid="!!message" :disabled="ctx.disabled" :class="span">
    <NqFieldLabel>{{ node.label }}<span v-if="required" aria-hidden="true" class="ms-0.5 text-nq-danger-text">*</span></NqFieldLabel>
    <NqTagInput
      :model-value="props.value.map(String)"
      :max-tags="node.max"
      :disabled="ctx.disabled"
      :invalid="!!message"
      :placeholder="tagField.type === 'text' ? tagField.placeholder : undefined"
      :input-props="{ dir: tagField.type === 'text' && tagField.ltr ? 'ltr' : undefined }"
      :validate="tagValidate"
      @update:model-value="(next: string[]) => ctx.onChange(props.path, next)"
    />
    <NqFieldDescription v-if="node.description">{{ node.description }}</NqFieldDescription>
    <NqFieldError v-if="message" match>{{ message }}</NqFieldError>
  </NqField>

  <fieldset v-else ref="root" data-slot="schema-form-list" :data-schema-path="props.path" :disabled="ctx.disabled" :class="cn('flex min-w-0 flex-col gap-2 border-0 p-0', node.width !== 'half' && 'sm:col-span-2')">
    <legend class="mb-1 text-label text-foreground">{{ node.label }}<span v-if="required" aria-hidden="true" class="ms-0.5 text-nq-danger-text">*</span></legend>
    <p v-if="node.description" class="-mt-1 text-caption text-muted-foreground">{{ node.description }}</p>

    <!-- Checkboxes: an enum with uniqueItems. -->
    <div v-if="node.mode === 'checkboxes'" class="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
      <label v-for="o in options" :key="o.value" :for="`${uid}-${props.path}-${o.value}`" class="flex min-h-control items-center gap-2 text-body-sm text-foreground">
        <NqCheckbox :id="`${uid}-${props.path}-${o.value}`" :model-value="chosen.has(o.value)" :disabled="optionDisabled(o.value)" @update:model-value="(next: boolean | 'indeterminate') => toggle(o.value, next === true)" />
        <span class="min-w-0">{{ o.label }}</span>
      </label>
    </div>

    <!-- Items: one input per value. -->
    <div v-else-if="node.mode === 'items'" class="flex flex-col gap-2">
      <NqField v-for="(entry, index) in props.value" :key="keyList[index]" :data-item-key="keyList[index]" :data-schema-path="`${props.path}[${index}]`" :invalid="!!ctx.messageFor(`${props.path}[${index}]`)" :disabled="ctx.disabled">
        <div class="flex items-start gap-2">
          <div class="min-w-0 flex-1">
            <NqSchemaLeafInput :field="leaf.field" :model-value="entry" required :invalid="!!ctx.messageFor(`${props.path}[${index}]`)" :aria-label="`${node.itemLabel} ${n(index + 1)}`" @update:model-value="(v) => ctx.onChange(`${props.path}[${index}]`, v)" />
          </div>
          <NqButton type="button" variant="ghost" size="icon" :aria-label="ctx.t.remove(`${node.itemLabel} ${n(index + 1)}`)" :disabled="ctx.disabled || !canRemove(count, min)" class="text-muted-foreground hover:text-nq-danger-text" @click="remove(index)">
            <Trash2 aria-hidden="true" />
          </NqButton>
        </div>
        <NqFieldError v-if="ctx.messageFor(`${props.path}[${index}]`)" match>{{ ctx.messageFor(`${props.path}[${index}]`) }}</NqFieldError>
      </NqField>
    </div>

    <!-- Groups: objects, each collapsible, with up, down, remove and a drag handle. -->
    <div v-else class="flex min-w-0 flex-col gap-3">
      <div v-if="count > 1" class="flex items-center justify-between gap-2">
        <span class="text-caption tabular-nums text-muted-foreground">{{ node.max !== undefined ? ctx.t.countMax(n(count), n(node.max)) : ctx.t.count(n(count)) }}</span>
        <NqButton type="button" variant="ghost" size="sm" @click="collapsed = allCollapsed ? new Set() : new Set(keyList)">
          <NqIcon :icon="allCollapsed ? ChevronsUpDown : ChevronsDownUp" />
          {{ allCollapsed ? ctx.t.expandAll : ctx.t.collapseAll }}
        </NqButton>
      </div>

      <div v-if="count === 0" class="rounded-card border border-dashed border-border px-4 py-6 text-center text-body-sm text-muted-foreground">{{ ctx.t.empty(node.label) }}</div>
      <ol v-else :aria-label="node.label" class="flex flex-col gap-2">
        <template v-for="row in rows" :key="row.key">
          <li
            v-if="ctx.states[row.path]?.visible !== false"
            data-slot="schema-form-group"
            :data-item-key="row.key"
            :data-schema-path="row.path"
            :data-collapsed="collapsed.has(row.key) || undefined"
            :data-dragging="drag?.from === row.index || undefined"
            :style="rowStyle(row.index)"
            class="relative rounded-card border border-border bg-card data-dragging:z-10 data-dragging:border-nq-focus data-dragging:shadow-floating"
          >
            <div data-slot="schema-form-group-header" class="flex min-h-control items-center gap-1 p-1.5">
              <NqTooltip v-if="count > 1" :content="ctx.t.drag(row.title)">
                <span
                  aria-hidden="true"
                  class="inline-flex size-control-sm shrink-0 cursor-grab touch-none items-center justify-center rounded-control text-muted-foreground hover:bg-nq-hover hover:text-foreground active:cursor-grabbing [&_svg]:size-4"
                  @pointerdown="onDragStart(row.index, $event)"
                >
                  <GripVertical aria-hidden="true" />
                </span>
              </NqTooltip>
              <button
                type="button"
                :aria-expanded="!collapsed.has(row.key)"
                :aria-controls="`${uid}-body-${row.key}`"
                :aria-label="collapsed.has(row.key) ? ctx.t.expand(row.title) : ctx.t.collapse(row.title)"
                class="flex min-h-control-sm min-w-0 flex-1 items-center gap-2 rounded-control px-1.5 text-start outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus"
                @click="toggleRow(row.key)"
              >
                <NqIcon :icon="ChevronRight" directional :class="cn('size-4 shrink-0 text-muted-foreground transition-[rotate] duration-200 ease-nq', !collapsed.has(row.key) && 'rotate-90 rtl:-rotate-90')" />
                <span class="min-w-0 truncate text-label text-foreground">{{ row.title }}</span>
                <span v-if="collapsed.has(row.key) && row.summary" class="min-w-0 flex-1 truncate text-body-sm text-muted-foreground">{{ row.summary }}</span>
              </button>
              <span class="sr-only">{{ n(row.index + 1) }}</span>
              <NqBadge v-if="ctx.issueCount(row.path) > 0" variant="danger" data-slot="schema-form-group-issues">{{ ctx.t.issues(n(ctx.issueCount(row.path))) }}</NqBadge>
              <NqButton type="button" variant="ghost" size="icon-sm" data-action="up" :aria-label="ctx.t.moveUp(row.title)" :disabled="ctx.disabled || row.index === 0" @click="move(row.index, row.index - 1)">
                <ChevronUp aria-hidden="true" />
              </NqButton>
              <NqButton type="button" variant="ghost" size="icon-sm" data-action="down" :aria-label="ctx.t.moveDown(row.title)" :disabled="ctx.disabled || row.index === count - 1" @click="move(row.index, row.index + 1)">
                <ChevronDown aria-hidden="true" />
              </NqButton>
              <NqButton type="button" variant="ghost" size="icon-sm" data-action="remove" :aria-label="ctx.t.remove(row.title)" :disabled="ctx.disabled || !canRemove(count, min)" class="text-muted-foreground hover:text-nq-danger-text" @click="ask(row.index)">
                <Trash2 aria-hidden="true" />
              </NqButton>
            </div>
            <div :id="`${uid}-body-${row.key}`" data-slot="schema-form-group-body" :hidden="collapsed.has(row.key)" class="border-t border-border p-3 sm:p-4">
              <div class="flex min-w-0 flex-col gap-4">
                <NqSchemaNodes :node="item" :value="row.entry" :path="row.path" :depth="1" />
              </div>
            </div>
          </li>
        </template>
      </ol>
    </div>

    <div v-if="node.mode === 'items' || node.mode === 'groups'" class="flex flex-wrap items-center gap-3">
      <NqButton type="button" variant="secondary" :disabled="ctx.disabled || atMax" data-slot="schema-form-add" @click="add">
        <NqIcon :icon="Plus" />
        {{ ctx.t.add(node.itemLabel) }}
      </NqButton>
      <span v-if="limit" class="text-caption text-muted-foreground">{{ limit }}</span>
    </div>

    <p v-if="message" role="alert" data-slot="schema-form-list-error" class="text-caption text-nq-danger-text">{{ message }}</p>

    <NqAlertDialog v-if="node.mode === 'groups'" :open="pending !== null" @update:open="(open: boolean) => !open && (pending = null)">
      <NqAlertDialogContent>
        <NqAlertDialogHeader>
          <NqAlertDialogTitle>{{ ctx.t.removeTitle(pendingName) }}</NqAlertDialogTitle>
          <NqAlertDialogDescription>{{ ctx.t.removeBody }}</NqAlertDialogDescription>
        </NqAlertDialogHeader>
        <NqAlertDialogFooter>
          <NqAlertDialogCancel>{{ ctx.t.cancel }}</NqAlertDialogCancel>
          <NqAlertDialogAction @click="confirmRemove">{{ ctx.t.removeConfirm }}</NqAlertDialogAction>
        </NqAlertDialogFooter>
      </NqAlertDialogContent>
    </NqAlertDialog>
  </fieldset>
</template>
