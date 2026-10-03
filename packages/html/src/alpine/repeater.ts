// nqRepeater: a list of repeatable form rows (add, remove, duplicate, reorder by pointer drag or keyboard, collapse).
// The markup is the React Repeater's (see the Blade component); the state lives here. Reordering uses native pointer events.
//
//   <div data-slot="repeater" x-data="nqRepeater([{ name: 'Sara' }], { createItem: () => ({ name: '' }), min: 1, max: 5 })" x-modelable="items">
//     <ol> <template x-for="(item, index) in items" :key="keyOf(index)"> <li data-slot="repeater-row" :data-row-key="keyOf(index)" :style="rowStyle(index)">…</li> </template> </ol>
//   </div>
//
// `items` is x-modelable (x-model="$wire.phones"). Inside the row template use `item` and `index` (x-model="item.name").
// Options: createItem () => row, cloneItem (item) => copy, rowTitle / rowLabel / rowSummary (item, index) => string,
// min, max, reorderable, duplicable, collapsible, defaultCollapsed, disabled.
// Events (bubbling): "change" { items } after every add, remove, duplicate and move.

import type { Magics, Register } from "./types";

type Row = unknown;

export interface RepeaterOptions {
  createItem?: () => Row;
  cloneItem?: (item: Row) => Row;
  rowTitle?: (item: Row, index: number) => string;
  rowLabel?: (item: Row, index: number) => string;
  rowSummary?: (item: Row, index: number) => string;
  min?: number;
  max?: number;
  reorderable?: boolean;
  duplicable?: boolean;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  disabled?: boolean;
}

interface Drag {
  from: number;
  over: number;
  dy: number;
  size: number;
}

interface RepeaterState extends Magics {
  $nq: { t(en: string, ar: string): string; locale: string };
  items: Row[];
  collapsed: Record<string, boolean>;
  announcement: string;
  drag: Drag | null;
  min: number;
  max: number | undefined;
  reorderable: boolean;
  duplicable: boolean;
  collapsible: boolean;
  disabled: boolean;
  keyOf(index: number): string;
  n(value: number): string;
  count(): number;
  atMax(): boolean;
  atMin(): boolean;
  title(index: number): string;
  name(index: number): string;
  summary(index: number): string;
  limitText(): string;
  countText(): string;
  hintId(): string;
  limitId(): string;
  add(): void;
  duplicate(index: number): void;
  remove(index: number): void;
  move(from: number, to: number, announce: boolean): void;
  toggle(index: number): void;
  isCollapsed(index: number): boolean;
  allCollapsed(): boolean;
  toggleAll(): void;
  rowStyle(index: number): string;
  isDragging(index: number): boolean;
  onHandleKey(event: KeyboardEvent, index: number): void;
  startDrag(event: PointerEvent, index: number): void;
  commit(items: Row[], keys: string[]): void;
  focus(target: { kind: "row"; key: string } | { kind: "handle"; index: number } | { kind: "add" }): void;
}

/* ------------------------------------------------------------------ pure helpers (same maths as the React repeater-math) */

const clamp = (value: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, value));
export const canAdd = (count: number, max?: number) => max === undefined || count < max;
export const canRemove = (count: number, min = 0) => count > min;

export function insertAt<T>(list: readonly T[], index: number, item: T): T[] {
  const at = clamp(index, 0, list.length);
  return [...list.slice(0, at), item, ...list.slice(at)];
}

export function removeAt<T>(list: readonly T[], index: number): T[] {
  if (index < 0 || index >= list.length) return [...list];
  return [...list.slice(0, index), ...list.slice(index + 1)];
}

export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (from < 0 || from >= list.length) return [...list];
  const target = clamp(to, 0, list.length - 1);
  if (target === from) return [...list];
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(target, 0, item as T);
  return next;
}

export function keyTarget(key: string, index: number, count: number): number | null {
  if (key === "ArrowUp") return Math.max(0, index - 1);
  if (key === "ArrowDown") return Math.min(count - 1, index + 1);
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return null;
}

/** The row index a dragged row would land on: the closest centre (dnd-kit's closestCenter). */
export function dropIndex(centers: readonly number[], from: number, dy: number): number {
  const at = (centers[from] ?? 0) + dy;
  let best = from;
  let bestDistance = Infinity;
  centers.forEach((c, i) => {
    const d = Math.abs(c - at);
    if (d < bestDistance) {
      bestDistance = d;
      best = i;
    }
  });
  return best;
}

export function shiftFor(index: number, from: number, over: number, size: number): number {
  if (index === from) return 0;
  if (from < over && index > from && index <= over) return -size;
  if (from > over && index >= over && index < from) return size;
  return 0;
}

const DRAG_DISTANCE = 3;
let instances = 0;

const clone = (item: Row): Row => {
  try {
    return structuredClone(JSON.parse(JSON.stringify(item)));
  } catch {
    return item;
  }
};

export const repeater: Register = (Alpine) => {
  Alpine.data("nqRepeater", (initial: Row[] = [], options: RepeaterOptions = {}) => {
    const uid = `nq-repeater-${++instances}`;
    let serial = 0;
    const makeKey = () => `${uid}-${serial++}`;
    // Keys run parallel to the items and live outside reactive state, so rendering never writes.
    let keys: string[] = [];
    let session: { from: number; startY: number; centers: number[]; size: number; id: number; active: boolean } | null = null;
    let cleanup: (() => void) | null = null;

    return {
      items: [...initial] as Row[],
      collapsed: {} as Record<string, boolean>,
      announcement: "",
      drag: null as Drag | null,
      min: options.min ?? 0,
      max: options.max,
      reorderable: options.reorderable ?? true,
      duplicable: options.duplicable ?? true,
      collapsible: options.collapsible ?? true,
      disabled: options.disabled ?? false,

      init(this: RepeaterState) {
        if (options.defaultCollapsed) {
          const seeded: Record<string, boolean> = {};
          this.items.forEach((_, i) => (seeded[this.keyOf(i)] = true));
          this.collapsed = seeded;
        }
      },

      destroy() {
        cleanup?.();
      },

      keyOf(this: RepeaterState, index: number) {
        const length = this.items.length;
        if (keys.length > length) keys = keys.slice(0, length);
        while (keys.length < length) keys.push(makeKey());
        return keys[index] as string;
      },

      n(this: RepeaterState, value: number) {
        return new Intl.NumberFormat(this.$nq.locale.startsWith("ar") ? "ar-u-nu-arab" : "en").format(value);
      },
      count(this: RepeaterState) {
        return this.items.length;
      },
      atMax(this: RepeaterState) {
        return !canAdd(this.items.length, this.max);
      },
      atMin(this: RepeaterState) {
        return !canRemove(this.items.length, this.min);
      },
      hintId: () => `${uid}-hint`,
      limitId: () => `${uid}-limit`,

      title(this: RepeaterState, index: number) {
        const item = this.items[index];
        return options.rowTitle?.(item, index) || this.$nq.t(`Item ${this.n(index + 1)}`, `العنصر ${this.n(index + 1)}`);
      },
      name(this: RepeaterState, index: number) {
        const item = this.items[index];
        return options.rowLabel ? options.rowLabel(item, index) : this.title(index);
      },
      summary(this: RepeaterState, index: number) {
        return options.rowSummary?.(this.items[index], index) ?? "";
      },
      limitText(this: RepeaterState) {
        if (this.atMax() && this.max !== undefined) return this.$nq.t(`Limit of ${this.n(this.max)} reached.`, `تم بلوغ الحد الأقصى ${this.n(this.max)}.`);
        if (this.min > 0 && this.items.length <= this.min) return this.$nq.t(`At least ${this.n(this.min)} required.`, `مطلوب ${this.n(this.min)} على الأقل.`);
        return "";
      },
      countText(this: RepeaterState) {
        const c = this.n(this.items.length);
        return this.max !== undefined
          ? this.$nq.t(`${c} of ${this.n(this.max)} items`, `${c} من ${this.n(this.max)} عناصر`)
          : this.$nq.t(`${c} items`, `${c} عناصر`);
      },

      commit(this: RepeaterState, items: Row[], next: string[]) {
        keys = next;
        this.items = items;
        this.$dispatch("change", { items });
      },

      focus(this: RepeaterState, target: Parameters<RepeaterState["focus"]>[0]) {
        void this.$nextTick(() => {
          const scope = this.$root;
          if (!scope) return;
          if (target.kind === "add") scope.querySelector<HTMLElement>("[data-repeater-add]")?.focus();
          else if (target.kind === "handle") scope.querySelectorAll<HTMLElement>("[data-repeater-focus]")[target.index]?.focus();
          else {
            const row = scope.querySelector<HTMLElement>(`[data-row-key="${target.key}"]`);
            const field = row?.querySelector<HTMLElement>("[data-slot=repeater-body] :is(input, textarea, button, [tabindex]):not([disabled]):not([tabindex='-1'])");
            (field ?? row?.querySelector<HTMLElement>("[data-repeater-focus]"))?.focus();
          }
        });
      },

      add(this: RepeaterState) {
        if (this.disabled || !canAdd(this.items.length, this.max)) return;
        const item = options.createItem ? options.createItem() : {};
        const at = this.items.length;
        const key = makeKey();
        this.keyOf(0);
        const nextKeys = insertAt(keys, at, key);
        this.commit(insertAt(this.items, at, item), nextKeys);
        this.announcement = this.$nq.t(`${this.name(at)} added`, `أُضيف ${this.name(at)}`);
        this.focus({ kind: "row", key });
      },

      duplicate(this: RepeaterState, index: number) {
        const source = this.items[index];
        if (this.disabled || source === undefined || !canAdd(this.items.length, this.max)) return;
        const copy = options.cloneItem ? options.cloneItem(source) : clone(source);
        const key = makeKey();
        const name = this.name(index);
        this.keyOf(0);
        this.commit(insertAt(this.items, index + 1, copy), insertAt(keys, index + 1, key));
        this.announcement = this.$nq.t(`${name} duplicated`, `تم تكرار ${name}`);
        this.focus({ kind: "row", key });
      },

      remove(this: RepeaterState, index: number) {
        if (this.disabled || this.items[index] === undefined || !canRemove(this.items.length, this.min)) return;
        const name = this.name(index);
        const total = this.items.length;
        this.keyOf(0);
        this.commit(removeAt(this.items, index), removeAt(keys, index));
        this.announcement = this.$nq.t(`${name} removed`, `حُذف ${name}`);
        this.focus(total > 1 ? { kind: "handle", index: Math.min(index, total - 2) } : { kind: "add" });
      },

      move(this: RepeaterState, from: number, to: number, announce: boolean) {
        const total = this.items.length;
        const target = clamp(to, 0, total - 1);
        if (this.disabled || target === from || this.items[from] === undefined) return;
        const name = this.name(from);
        this.keyOf(0);
        this.commit(moveItem(this.items, from, target), moveItem(keys, from, target));
        if (announce) this.announcement = this.$nq.t(`${name} moved to position ${this.n(target + 1)} of ${this.n(total)}`, `نُقل ${name} إلى الموضع ${this.n(target + 1)} من ${this.n(total)}`);
      },

      isCollapsed(this: RepeaterState, index: number) {
        return this.collapsible && !!this.collapsed[this.keyOf(index)];
      },
      toggle(this: RepeaterState, index: number) {
        const key = this.keyOf(index);
        this.collapsed = { ...this.collapsed, [key]: !this.collapsed[key] };
      },
      allCollapsed(this: RepeaterState) {
        return this.items.length > 0 && this.items.every((_, i) => this.collapsed[this.keyOf(i)]);
      },
      toggleAll(this: RepeaterState) {
        const all = this.allCollapsed();
        const next: Record<string, boolean> = {};
        if (!all) this.items.forEach((_, i) => (next[this.keyOf(i)] = true));
        this.collapsed = next;
      },

      onHandleKey(this: RepeaterState, event: KeyboardEvent, index: number) {
        const target = keyTarget(event.key, index, this.items.length);
        if (target === null) return;
        event.preventDefault();
        const handle = event.currentTarget as HTMLElement;
        this.move(index, target, true);
        void this.$nextTick(() => handle.isConnected && handle.focus());
      },

      startDrag(this: RepeaterState, event: PointerEvent, index: number) {
        if (this.disabled || (event.pointerType === "mouse" && event.button !== 0)) return;
        const rows = [...this.$root.querySelectorAll<HTMLElement>('[data-slot="repeater-row"]')];
        if (rows.length < 2) return;
        const rects = rows.map((r) => r.getBoundingClientRect());
        const gap = Math.max(0, (rects[1]?.top ?? 0) - (rects[0]?.bottom ?? 0));
        session = { from: index, startY: event.clientY, centers: rects.map((r) => r.top + r.height / 2), size: (rects[index]?.height ?? 0) + gap, id: event.pointerId, active: false };
        const state = this;
        const onMove = (e: PointerEvent) => {
          if (!session || e.pointerId !== session.id) return;
          const dy = e.clientY - session.startY;
          if (!session.active) {
            if (Math.abs(dy) < DRAG_DISTANCE) return;
            session.active = true;
          }
          e.preventDefault();
          state.drag = { from: session.from, over: dropIndex(session.centers, session.from, dy), dy, size: session.size };
        };
        const stop = () => {
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);
          window.removeEventListener("pointercancel", stop);
          session = null;
          cleanup = null;
          state.drag = null;
        };
        const onUp = (e: PointerEvent) => {
          if (!session || e.pointerId !== session.id) return;
          const result = state.drag;
          stop();
          if (result && result.over !== result.from) state.move(result.from, result.over, true);
        };
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", stop);
        cleanup = stop;
      },

      isDragging(this: RepeaterState, index: number) {
        return !!this.drag && this.drag.from === index;
      },

      rowStyle(this: RepeaterState, index: number) {
        const d = this.drag;
        if (!d) return "";
        if (index === d.from) return `transform:translateY(${d.dy}px);transition:none`;
        const shift = shiftFor(index, d.from, d.over, d.size);
        return `${shift ? `transform:translateY(${shift}px);` : ""}transition:transform 200ms var(--ease-nq, ease)`;
      },
    };
  });
};
