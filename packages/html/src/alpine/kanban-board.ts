// nqKanbanBoard: columns of draggable cards. The markup is the React KanbanBoard's (see the Blade component); the state lives here.
// Pointer drag, press-and-hold on touch, and keyboard (Space lifts, arrows move, Space drops, Escape cancels), with localised announcements.
// Native pointer events, no dnd-kit. There is no backend: a drop dispatches a bubbling "move" event and, unless `optimistic: false`, reorders `cards`.
//
//   <div data-slot="kanban-board" x-data="nqKanbanBoard([{ id: 'todo', title: 'To do' }], [{ id: 'a', columnId: 'todo', title: 'Write' }])" x-modelable="cards">…</div>
//
// `cards` is x-modelable. Events: "move" { cardId, toColumn, toIndex }. Options: optimistic, label, emptyLabel, instructions.

import { findContainer, groupCards, keyMove, placeCard, dropTarget, type ColumnGeometry, type Items } from "./kanban-board-logic";
import type { Magics, Register } from "./types";

export interface KanbanCard {
  id: string;
  columnId: string;
  title: string;
  labels?: { label: string; hue?: string }[];
  assignee?: { name: string; src?: string };
}
export interface KanbanColumn {
  id: string;
  title: string;
}
export interface KanbanOptions {
  optimistic?: boolean;
}

interface Session {
  id: string;
  pointerId: number;
  startX: number;
  startY: number;
  offX: number;
  offY: number;
  width: number;
  active: boolean;
  touch: boolean;
  timer: ReturnType<typeof setTimeout> | undefined;
}

interface KanbanState extends Magics {
  $nq: { t(en: string, ar: string): string; locale: string };
  columns: KanbanColumn[];
  cards: KanbanCard[];
  drag: Items | null;
  activeId: string | null;
  announcement: string;
  overlay: { left: number; top: number; width: number } | null;
  root: HTMLElement;
  optimistic: boolean;
  session: Session | null;
  origin: { column: string; index: number } | null;
  handlers: { move: (e: PointerEvent) => void; up: (e: PointerEvent) => void; cancel: () => void; block: (e: Event) => void };
  items(): Items;
  num(n: number): string;
  count(columnId: string): number;
  lift(id: string): boolean;
  reset(): void;
  drop(): void;
  cancel(): void;
  say(kind: "pickedUp" | "movedOver" | "dropped", id: string): void;
  follow(x: number, y: number): void;
  activate(x: number, y: number): void;
  measure(skip: string): ColumnGeometry[];
}

export const kanbanBoard: Register = (Alpine) => {
  Alpine.data("nqKanbanBoard", (columns: KanbanColumn[] = [], cards: KanbanCard[] = [], options: KanbanOptions = {}) => ({
    columns,
    cards,
    drag: null as Items | null,
    activeId: null as string | null,
    announcement: "",
    overlay: null as { left: number; top: number; width: number } | null,
    root: null as unknown as HTMLElement,
    optimistic: options.optimistic !== false,
    session: null as Session | null,
    origin: null as { column: string; index: number } | null,
    handlers: null as unknown as KanbanState["handlers"],

    init(this: KanbanState) {
      this.root = this.$el;
      this.handlers = {
        move: (e) => (this as unknown as { pointerMove(e: PointerEvent): void }).pointerMove(e),
        up: (e) => (this as unknown as { pointerUp(e: PointerEvent): void }).pointerUp(e),
        cancel: () => (this as unknown as { pointerCancel(): void }).pointerCancel(),
        block: (e) => {
          if (e.cancelable) e.preventDefault();
        },
      };
    },
    destroy(this: KanbanState) {
      this.reset();
    },

    items(this: KanbanState) {
      return this.drag ?? groupCards(this.columns, this.cards);
    },
    /** The card objects of one column, in display order. */
    list(this: KanbanState, columnId: string) {
      const byId = new Map(this.cards.map((c) => [c.id, c]));
      return (this.items()[columnId] ?? []).map((id) => byId.get(id)).filter(Boolean) as KanbanCard[];
    },
    count(this: KanbanState, columnId: string) {
      return (this.items()[columnId] ?? []).length;
    },
    num(this: KanbanState, n: number) {
      return new Intl.NumberFormat(`${this.$nq.locale}-u-nu-latn`).format(n);
    },
    countLabel(this: KanbanState, columnId: string) {
      const n = this.num(this.count(columnId));
      return this.$nq.t(`${n} cards`, `${n} بطاقات`);
    },
    overColumn(this: KanbanState) {
      return this.activeId ? findContainer(this.items(), this.activeId) : undefined;
    },
    activeCard(this: KanbanState) {
      return this.cards.find((c) => c.id === this.activeId);
    },
    initials(name: string) {
      return name.trim().split(/\s+/).slice(0, 2).map((p) => p.charAt(0)).join("").toUpperCase();
    },
    tagStyle(hue?: string) {
      const h = hue ?? "gray";
      return `--tag-solid: var(--nq-tag-${h}); --tag-soft: var(--nq-tag-${h}-soft)`;
    },

    say(this: KanbanState, kind: "pickedUp" | "movedOver" | "dropped", id: string) {
      const cur = this.items();
      const col = findContainer(cur, id);
      const list = col ? (cur[col] ?? []) : [];
      const card = this.cards.find((c) => c.id === id)?.title ?? id;
      const column = this.columns.find((c) => c.id === col)?.title ?? "";
      const pos = this.num(Math.max(list.indexOf(id) + 1, 1));
      const total = this.num(Math.max(list.length, 1));
      const t = this.$nq.t.bind(this.$nq);
      this.announcement =
        kind === "pickedUp"
          ? t(`Picked up ${card}. It is in ${column}, position ${pos} of ${total}.`, `تم التقاط ${card}. موجودة في ${column} بالموضع ${pos} من ${total}.`)
          : kind === "movedOver"
            ? t(`${card} is now in ${column}, position ${pos} of ${total}.`, `${card} الآن في ${column} بالموضع ${pos} من ${total}.`)
            : t(`Dropped ${card} in ${column}, position ${pos} of ${total}.`, `تم إفلات ${card} في ${column} بالموضع ${pos} من ${total}.`);
    },

    lift(this: KanbanState, id: string) {
      const base = groupCards(this.columns, this.cards);
      const column = findContainer(base, id);
      if (!column) return false;
      this.origin = { column, index: base[column]?.indexOf(id) ?? 0 };
      this.activeId = id;
      this.drag = base;
      return true;
    },

    reset(this: KanbanState) {
      if (this.session?.timer) clearTimeout(this.session.timer);
      window.removeEventListener("pointermove", this.handlers.move);
      window.removeEventListener("pointerup", this.handlers.up);
      window.removeEventListener("pointercancel", this.handlers.cancel);
      window.removeEventListener("touchmove", this.handlers.block);
      this.session = null;
      this.activeId = null;
      this.drag = null;
      this.overlay = null;
      this.origin = null;
    },

    drop(this: KanbanState) {
      const id = this.activeId;
      const cur = this.items();
      const column = id ? findContainer(cur, id) : undefined;
      const index = id && column ? (cur[column] ?? []).indexOf(id) : -1;
      const start = this.origin;
      if (id) this.say("dropped", id);
      this.reset();
      if (!(id && start && column && index >= 0 && (column !== start.column || index !== start.index))) return;
      if (this.optimistic) {
        const card = this.cards.find((c) => c.id === id)!;
        const rest = this.cards.filter((c) => c.id !== id);
        const inColumn = rest.filter((c) => c.columnId === column);
        inColumn.splice(index, 0, { ...card, columnId: column });
        this.cards = [...rest.filter((c) => c.columnId !== column), ...inColumn];
      }
      this.root.dispatchEvent(new CustomEvent("move", { bubbles: true, detail: { cardId: id, toColumn: column, toIndex: index } }));
    },

    cancel(this: KanbanState) {
      const id = this.activeId;
      const title = this.cards.find((c) => c.id === id)?.title ?? id ?? "";
      this.reset();
      if (id) this.announcement = this.$nq.t(`Move cancelled. ${title} returned to its place.`, `أُلغي النقل. عادت ${title} إلى مكانها.`);
    },

    /* keyboard */
    key(this: KanbanState, event: KeyboardEvent, id: string) {
      if (event.target !== event.currentTarget) return;
      const lifted = this.activeId === id;
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        if (lifted) this.drop();
        else if (this.activeId === null && this.lift(id)) this.say("pickedUp", id);
        return;
      }
      if (!lifted) return;
      if (event.key === "Escape") {
        event.preventDefault();
        this.cancel();
        return;
      }
      if (event.key.startsWith("Arrow")) event.preventDefault();
      const rtl = this.$nq.locale.startsWith("ar") || getComputedStyle(this.root).direction === "rtl";
      const to = keyMove(this.items(), this.columns, id, event.key, rtl);
      if (!to) return;
      this.drag = placeCard(this.items(), id, to.column, to.index);
      this.say("movedOver", id);
      this.$nextTick(() => this.root.querySelector<HTMLElement>(`[data-card-id="${CSS.escape(id)}"]`)?.focus());
    },

    /* pointer */
    measure(this: KanbanState, skip: string): ColumnGeometry[] {
      return [...this.root.querySelectorAll<HTMLElement>('[data-slot="kanban-column"]')].map((col) => {
        const r = col.getBoundingClientRect();
        const centers = [...col.querySelectorAll<HTMLElement>("[data-card-id]")]
          .filter((li) => li.dataset.cardId !== skip)
          .map((li) => {
            const b = li.getBoundingClientRect();
            return b.top + b.height / 2;
          });
        return { id: col.dataset.columnId ?? "", left: r.left, right: r.right, centers };
      });
    },
    down(this: KanbanState, event: PointerEvent, id: string) {
      if (this.session || (event.pointerType === "mouse" && event.button !== 0)) return;
      if ((event.target as HTMLElement).closest("button,a,input,textarea,select,[contenteditable]")) return;
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      const touch = event.pointerType === "touch";
      this.session = { id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, offX: event.clientX - rect.left, offY: event.clientY - rect.top, width: rect.width, active: false, touch, timer: undefined };
      if (touch) this.session.timer = setTimeout(() => this.activate(event.clientX, event.clientY), 200);
      window.addEventListener("pointermove", this.handlers.move);
      window.addEventListener("pointerup", this.handlers.up);
      window.addEventListener("pointercancel", this.handlers.cancel);
    },
    activate(this: KanbanState, x: number, y: number) {
      const s = this.session;
      if (!s || s.active) return;
      if (!this.lift(s.id)) return this.reset();
      s.active = true;
      this.say("pickedUp", s.id);
      if (s.touch) window.addEventListener("touchmove", this.handlers.block, { passive: false });
      this.follow(x, y);
    },
    follow(this: KanbanState, x: number, y: number) {
      const s = this.session;
      if (!s) return;
      this.overlay = { left: x - s.offX, top: y - s.offY, width: s.width };
      const target = dropTarget(this.measure(s.id), x, y);
      const cur = this.items();
      const column = findContainer(cur, s.id);
      if (!target || !column) return;
      const index = (cur[column] ?? []).indexOf(s.id);
      if (target.column === column && target.index === index) return;
      this.drag = placeCard(cur, s.id, target.column, target.index);
      this.say("movedOver", s.id);
    },
    pointerMove(this: KanbanState, event: PointerEvent) {
      const s = this.session;
      if (!s || event.pointerId !== s.pointerId) return;
      if (!s.active) {
        const dist = Math.hypot(event.clientX - s.startX, event.clientY - s.startY);
        if (s.touch) {
          // A touch that moves before the press-and-hold is a scroll, not a drag.
          if (dist > 6) this.reset();
          return;
        }
        if (dist < 4) return;
        this.activate(event.clientX, event.clientY);
        if (!this.session) return;
      }
      event.preventDefault();
      this.follow(event.clientX, event.clientY);
    },
    pointerUp(this: KanbanState, event: PointerEvent) {
      const s = this.session;
      if (!s || event.pointerId !== s.pointerId) return;
      if (s.active) this.drop();
      else this.reset();
    },
    pointerCancel(this: KanbanState) {
      if (this.session?.active) this.cancel();
      else this.reset();
    },
  }));
};
