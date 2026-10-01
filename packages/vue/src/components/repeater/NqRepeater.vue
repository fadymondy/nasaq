<script setup lang="ts" generic="T">
import { ChevronsDownUp, ChevronsUpDown, Plus } from "lucide-vue-next";
import { computed, nextTick, onBeforeUnmount, ref, toRaw, useId, type CSSProperties } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { NqIcon } from "../icon";
import { formatNumber } from "../numeric";
import NqRepeaterRow from "./NqRepeaterRow.vue";
import { canAdd, canRemove, dropIndex, fitKeys, insertAt, keyTarget, moveItem, removeAt, shiftFor } from "./repeater-math";
import { repeaterStrings, type RepeaterProps, type RepeaterRowContext } from "./repeater-strings";

/**
 * A list of repeatable form rows: add, remove, duplicate, drag to reorder (native pointer events, or focus the
 * handle and use the arrow keys), collapse, with `min` and `max` limits. It owns the list mechanics and stable
 * row keys; you own what a row looks like (default scoped slot) and where the value lives (v-model).
 */
const props = withDefaults(defineProps<RepeaterProps<T>>(), { min: 0, reorderable: true, duplicable: true, collapsible: true, defaultCollapsed: false, disabled: false });
const value = defineModel<T[]>({ default: () => [] });
defineSlots<{
  default(ctx: { item: T } & RepeaterRowContext<T>): unknown;
  meta?(ctx: { item: T; index: number; id: string }): unknown;
  empty?(): unknown;
}>();

const { locale } = useNasaq();
const t = computed(() => ({ ...repeaterStrings(locale.value), ...props.labels }));
const n = (v: number) => formatNumber(v, locale.value);
const uid = useId();

const count = computed(() => value.value.length);

// Row keys run parallel to the values so rows of any shape keep their identity.
let serial = 0;
const makeKey = () => `${uid}-${serial++}`;
let keys: string[] = fitKeys([], count.value, makeKey);
const keyList = computed(() => {
  if (keys.length !== count.value) keys = fitKeys(keys, count.value, makeKey);
  return keys;
});

const collapsed = ref<ReadonlySet<string>>(props.defaultCollapsed ? new Set(keyList.value) : new Set());
const announcement = ref("");
const root = ref<HTMLElement | null>(null);
const addButton = ref<InstanceType<typeof NqButton> | null>(null);

const commit = (nextValue: T[], nextKeys: string[]) => {
  keys = nextKeys;
  value.value = nextValue;
};

const titleOf = (item: T, index: number) => props.rowTitle?.(item, index) || t.value.row(n(index + 1));
const nameOf = (item: T, index: number) => (props.rowLabel ? props.rowLabel(item, index) : titleOf(item, index));

type Focus = { kind: "row"; key: string } | { kind: "handle"; index: number } | { kind: "add" };
async function focusAfter(target: Focus) {
  await nextTick();
  const scope = root.value;
  if (!scope) return;
  if (target.kind === "add") (addButton.value?.$el as HTMLElement | undefined)?.focus();
  else if (target.kind === "handle") scope.querySelectorAll<HTMLElement>("[data-repeater-focus]")[target.index]?.focus();
  else {
    const row = scope.querySelector<HTMLElement>(`[data-row-key="${target.key}"]`);
    const field = row?.querySelector<HTMLElement>("[data-slot=repeater-body] :is(input, textarea, button, [tabindex]):not([disabled]):not([tabindex='-1'])");
    (field ?? row?.querySelector<HTMLElement>("[data-repeater-focus]"))?.focus();
  }
}

function add() {
  if (props.disabled || !canAdd(count.value, props.max)) return;
  const item = props.createItem();
  const key = makeKey();
  const at = count.value;
  commit(insertAt(value.value, at, item), insertAt(keyList.value, at, key));
  announcement.value = t.value.added(nameOf(item, at));
  void focusAfter({ kind: "row", key });
}

// Reactive proxies cannot go through structuredClone: fall back to a JSON copy.
function defaultClone(item: T): T {
  try {
    return structuredClone(toRaw(item));
  } catch {
    return JSON.parse(JSON.stringify(item)) as T;
  }
}

function duplicate(index: number) {
  const source = value.value[index];
  if (props.disabled || source === undefined || !canAdd(count.value, props.max)) return;
  const copy = props.cloneItem ? props.cloneItem(source) : defaultClone(source);
  const key = makeKey();
  commit(insertAt(value.value, index + 1, copy), insertAt(keyList.value, index + 1, key));
  announcement.value = t.value.duplicated(nameOf(source, index));
  void focusAfter({ kind: "row", key });
}

function remove(index: number) {
  const source = value.value[index];
  if (props.disabled || source === undefined || !canRemove(count.value, props.min)) return;
  const name = nameOf(source, index);
  const total = count.value;
  commit(removeAt(value.value, index), removeAt(keyList.value, index));
  announcement.value = t.value.removed(name);
  void focusAfter(total > 1 ? { kind: "handle", index: Math.min(index, total - 2) } : { kind: "add" });
}

function move(from: number, to: number, announce: boolean) {
  const total = count.value;
  const target = Math.max(0, Math.min(total - 1, to));
  const item = value.value[from];
  if (props.disabled || target === from || item === undefined) return;
  commit(moveItem(value.value, from, target), moveItem(keyList.value, from, target));
  if (announce) announcement.value = t.value.moved(nameOf(item, from), n(target + 1), n(total));
}

function update(index: number, next: T | ((current: T) => T)) {
  const current = value.value[index];
  if (current === undefined) return;
  const resolved = typeof next === "function" ? (next as (c: T) => T)(current) : next;
  commit(value.value.map((item, i) => (i === index ? resolved : item)), keyList.value);
}

function toggle(key: string) {
  const next = new Set(collapsed.value);
  if (!next.delete(key)) next.add(key);
  collapsed.value = next;
}

function onMoveKey(index: number, key: string, handle: HTMLElement) {
  const target = keyTarget(key, index, count.value);
  if (target === null) return;
  move(index, target, true);
  // The row re-renders in a new place: bring focus back to its handle.
  void nextTick(() => handle.isConnected && handle.focus());
}

/* ----------------------------------------------------------- pointer drag */

const DRAG_DISTANCE = 3;
const drag = ref<{ from: number; over: number; dy: number; size: number } | null>(null);
let session: { from: number; startY: number; centers: number[]; size: number; id: number; active: boolean } | null = null;

function onDragStart(index: number, event: PointerEvent) {
  if (props.disabled || (event.pointerType === "mouse" && event.button !== 0)) return;
  const rows = [...(root.value?.querySelectorAll<HTMLElement>('[data-slot="repeater-row"]') ?? [])];
  if (rows.length < 2) return;
  const rects = rows.map((r) => r.getBoundingClientRect());
  const gap = rects.length > 1 ? Math.max(0, rects[1]!.top - rects[0]!.bottom) : 0;
  session = {
    from: index,
    startY: event.clientY,
    centers: rects.map((r) => r.top + r.height / 2),
    size: (rects[index]?.height ?? 0) + gap,
    id: event.pointerId,
    active: false,
  };
  window.addEventListener("pointermove", onDragMove);
  window.addEventListener("pointerup", onDragEnd);
  window.addEventListener("pointercancel", onDragCancel);
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
  window.removeEventListener("pointercancel", onDragCancel);
  session = null;
  drag.value = null;
}

function onDragEnd(event: PointerEvent) {
  if (!session || event.pointerId !== session.id) return;
  const result = drag.value;
  stopDrag();
  if (result && result.over !== result.from) move(result.from, result.over, true);
}
function onDragCancel() {
  stopDrag();
}
onBeforeUnmount(stopDrag);

function rowStyle(index: number): CSSProperties | undefined {
  const d = drag.value;
  if (!d) return undefined;
  if (index === d.from) return { transform: `translateY(${d.dy}px)`, transition: "none" };
  const shift = shiftFor(index, d.from, d.over, d.size);
  return { transform: shift ? `translateY(${shift}px)` : undefined, transition: "transform 200ms var(--ease-nq, ease)" };
}

const allCollapsed = computed(() => count.value > 0 && keyList.value.every((k) => collapsed.value.has(k)));
const atMax = computed(() => !canAdd(count.value, props.max));
const atMin = computed(() => !canRemove(count.value, props.min));
const hintId = `${uid}-hint`;
const limitId = `${uid}-limit`;
const limitText = computed(() =>
  atMax.value && props.max !== undefined ? t.value.maxReached(n(props.max)) : props.min > 0 && count.value <= props.min ? t.value.minReached(n(props.min)) : null,
);
</script>

<template>
  <div ref="root" data-slot="repeater" :data-disabled="props.disabled || undefined" :class="cn('flex min-w-0 flex-col gap-3', props.class)">
    <div v-if="count > 1 && props.collapsible" class="flex items-center justify-between gap-2">
      <span data-slot="repeater-count" class="text-caption tabular-nums text-muted-foreground">
        {{ props.max !== undefined ? t.countMax(n(count), n(props.max)) : t.count(n(count)) }}
      </span>
      <NqButton type="button" variant="ghost" size="sm" @click="collapsed = allCollapsed ? new Set() : new Set(keyList)">
        <NqIcon :icon="allCollapsed ? ChevronsUpDown : ChevronsDownUp" />
        {{ allCollapsed ? t.expandAll : t.collapseAll }}
      </NqButton>
    </div>

    <p v-if="props.reorderable" :id="hintId" class="sr-only">{{ t.reorderHint }}</p>

    <div
      v-if="count === 0"
      data-slot="repeater-empty"
      class="rounded-card border border-dashed border-border px-4 py-6 text-center text-body-sm text-muted-foreground"
    >
      <slot name="empty">{{ props.empty ?? t.empty }}</slot>
    </div>
    <ol v-else :aria-label="props.label ?? t.list" class="flex flex-col gap-2">
      <NqRepeaterRow
        v-for="(item, index) in value"
        :key="keyList[index]"
        :row-key="keyList[index]!"
        :position="n(index + 1)"
        :collapsed="props.collapsible && collapsed.has(keyList[index]!)"
        :collapsible="props.collapsible"
        :reorderable="props.reorderable && count > 1"
        :duplicable="props.duplicable"
        :disabled="props.disabled"
        :can-duplicate="!atMax"
        :can-remove="!atMin"
        :dragging="drag?.from === index"
        :hint-id="hintId"
        :style="rowStyle(index)"
        :labels="{
          remove: t.remove(nameOf(item, index)),
          duplicate: t.duplicate(nameOf(item, index)),
          reorder: t.reorder(nameOf(item, index)),
          toggle: props.collapsible && collapsed.has(keyList[index]!) ? t.expand(nameOf(item, index)) : t.collapse(nameOf(item, index)),
        }"
        @toggle="toggle(keyList[index]!)"
        @duplicate="duplicate(index)"
        @remove="remove(index)"
        @move-key="(key, handle) => onMoveKey(index, key, handle)"
        @drag-start="(e) => onDragStart(index, e)"
      >
        <template #title>{{ titleOf(item, index) }}</template>
        <template v-if="props.rowSummary" #summary>{{ props.rowSummary(item, index) }}</template>
        <template v-if="$slots.meta" #meta><slot name="meta" :item="item" :index="index" :id="keyList[index]!" /></template>
        <slot
          :item="item"
          :index="index"
          :id="keyList[index]!"
          :count="count"
          :disabled="props.disabled"
          :update="(next: T | ((current: T) => T)) => update(index, next)"
        />
      </NqRepeaterRow>
    </ol>

    <div class="flex flex-wrap items-center gap-3">
      <NqButton ref="addButton" type="button" variant="secondary" :disabled="props.disabled || atMax" :aria-describedby="limitText ? limitId : undefined" @click="add">
        <NqIcon :icon="Plus" />
        {{ props.addLabel ?? t.add }}
      </NqButton>
      <span v-if="limitText" :id="limitId" class="text-caption text-muted-foreground">{{ limitText }}</span>
    </div>

    <div aria-live="polite" role="status" class="sr-only">{{ announcement }}</div>
  </div>
</template>
