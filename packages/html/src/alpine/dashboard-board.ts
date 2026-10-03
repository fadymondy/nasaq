// nqDashboardBoard: a customisable grid of widget cards. The markup is the React DashboardBoard's (see the Blade component); the state lives here.
// Customise turns on editing: drag a card by its handle (native pointer events, or Space and the arrow keys), resize it from the corner grip or the
// actions menu, pin, add, remove and open per-widget settings. There is no backend: Save fires a bubbling "save" event and adopts the draft.
//
//   <section data-slot="dashboard-board" x-data="nqDashboardBoard(widgets, layout, { defaultLayout, rowHeight, locale })" x-modelable="layout">…</section>
//
// `widgets`: [{ type, title, description?, defaultCols?, defaultRows?, minCols?, maxCols?, minRows?, maxRows?, unique?, fields?, defaultSettings? }].
// `layout`: [{ id, type, cols, rows, pinned?, settings? }] (x-modelable). Events: "save" { layout, until(promise) } (call until() to keep the editor open and
// show the error when the promise rejects), "editing-change" { editing }. Options: defaultLayout, rowHeight, editing, loading, error, locale, labels.

import {
  BOARD_MAX_COLS,
  BOARD_MAX_ROWS,
  boardColumns,
  moveItem,
  nextItemId,
  normalizeLayout,
  reorderItems,
  resizeFromDelta,
  resizeItem,
  sameLayout,
  togglePin,
  type BoardItem,
  type BoardSettingValue,
} from "./dashboard-board-logic";
import type { Magics, Register } from "./types";

export interface BoardSettingField {
  key: string;
  label: string;
  type: "select" | "number" | "toggle" | "text";
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}
export interface BoardWidget {
  type: string;
  title: string;
  description?: string;
  defaultCols?: number;
  defaultRows?: number;
  minCols?: number;
  maxCols?: number;
  minRows?: number;
  maxRows?: number;
  unique?: boolean;
  fields?: BoardSettingField[];
  defaultSettings?: Record<string, BoardSettingValue>;
}
export interface BoardOptions {
  defaultLayout?: BoardItem[];
  rowHeight?: number;
  editing?: boolean;
  loading?: boolean;
  error?: boolean | string;
  locale?: string;
  labels?: Partial<Strings>;
}

const GAP = 16;

const STRINGS = {
  en: {
    editing: "Editing the dashboard",
    dragHandle: (t: string) => `Drag ${t} to reorder`,
    more: (t: string) => `Actions for ${t}`,
    pin: "Pin to the front",
    unpin: "Unpin",
    settings: "Settings",
    size: (c: number, r: number) => `${c} by ${r}`,
    sizeLabel: "Size in columns by rows",
    settingsTitle: (t: string) => `${t} settings`,
    pickedUp: (t: string, n: number, total: number) => `Picked up ${t}. Position ${n} of ${total}. Use the arrow keys to move, Space to drop, Escape to cancel.`,
    over: (t: string, n: number, total: number) => `${t} is now at position ${n} of ${total}.`,
    dropped: (t: string, n: number, total: number) => `Dropped ${t} at position ${n} of ${total}.`,
    cancelled: (t: string) => `Cancelled. ${t} went back.`,
    resized: (t: string, c: number, r: number) => `${t} is now ${c} by ${r}.`,
    pinned: (t: string) => `${t} pinned.`,
    unpinned: (t: string) => `${t} unpinned.`,
    removed: (t: string) => `${t} removed.`,
    added: (t: string) => `${t} added.`,
  },
  ar: {
    editing: "تعديل لوحة المعلومات",
    dragHandle: (t: string) => `اسحب ${t} لإعادة الترتيب`,
    more: (t: string) => `إجراءات ${t}`,
    pin: "تثبيت في المقدمة",
    unpin: "إلغاء التثبيت",
    settings: "الإعدادات",
    size: (c: number, r: number) => `${c} في ${r}`,
    sizeLabel: "الحجم بالأعمدة في الصفوف",
    settingsTitle: (t: string) => `إعدادات ${t}`,
    pickedUp: (t: string, n: number, total: number) => `تم التقاط ${t}. الموضع ${n} من ${total}. استخدم الأسهم للنقل، ومفتاح المسافة للإفلات، وEscape للإلغاء.`,
    over: (t: string, n: number, total: number) => `${t} الآن في الموضع ${n} من ${total}.`,
    dropped: (t: string, n: number, total: number) => `تم إفلات ${t} في الموضع ${n} من ${total}.`,
    cancelled: (t: string) => `أُلغي. عاد ${t} إلى مكانه.`,
    resized: (t: string, c: number, r: number) => `أصبح حجم ${t} ${c} في ${r}.`,
    pinned: (t: string) => `تم تثبيت ${t}.`,
    unpinned: (t: string) => `أُلغي تثبيت ${t}.`,
    removed: (t: string) => `أُزيل ${t}.`,
    added: (t: string) => `أُضيف ${t}.`,
  },
};
type Strings = typeof STRINGS.en;

type Action = "wider" | "narrower" | "taller" | "shorter" | "earlier" | "later";

interface Session {
  id: string;
  pointerId: number;
  startX: number;
  startY: number;
  grabX: number;
  grabY: number;
  active: boolean;
}
interface Grip {
  id: string;
  pointerId: number;
  startX: number;
  startY: number;
  start: BoardItem;
}

interface BoardState extends Magics {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
  widgets: BoardWidget[];
  layout: BoardItem[];
  draft: BoardItem[] | null;
  order: BoardItem[] | null;
  editing: boolean;
  saving: boolean;
  saveError: boolean;
  adding: boolean;
  settingsOpen: boolean;
  settingsId: string | null;
  form: Record<string, BoardSettingValue>;
  settingsFailed: boolean;
  live: string;
  activeId: string | null;
  shift: { x: number; y: number };
  preview: { id: string; cols: number; rows: number } | null;
  width: number;
  rowHeight: number;
  defaultLayout: BoardItem[] | null;
  rtl: boolean;
  s: Strings;
  root: HTMLElement;
  session: Session | null;
  grip: Grip | null;
  origin: BoardItem[] | null;
  saved: BoardItem[];
  base: BoardItem[];
  list: BoardItem[];
  columns: number;
  dirty: boolean;
  def(type: string): BoardWidget | undefined;
  titleOf(id: string): string;
  limits(type: string): { minCols: number; maxCols: number; minRows: number; maxRows: number };
  change(next: BoardItem[]): void;
  setEditing(next: boolean): void;
  position(id: string): number;
  lift(id: string): void;
  endDrag(): void;
  drop(): void;
  cancel(): void;
  follow(x: number, y: number): void;
  endResize(): void;
  handlers: Record<string, (e: PointerEvent) => void>;
}

export const dashboardBoard: Register = (Alpine) => {
  Alpine.data("nqDashboardBoard", (widgets: BoardWidget[] = [], layout: BoardItem[] = [], opts: BoardOptions = {}) => {
    const locale = opts.locale ?? "en";
    const strings: Strings = { ...(locale.startsWith("ar") ? STRINGS.ar : STRINGS.en), ...(opts.labels ?? {}) };
    return {
      widgets,
      layout,
      draft: null as BoardItem[] | null,
      order: null as BoardItem[] | null,
      editing: Boolean(opts.editing),
      saving: false,
      saveError: false,
      adding: false,
      settingsOpen: false,
      settingsId: null as string | null,
      form: {} as Record<string, BoardSettingValue>,
      settingsFailed: false,
      live: "",
      activeId: null as string | null,
      shift: { x: 0, y: 0 },
      preview: null as { id: string; cols: number; rows: number } | null,
      width: 1200,
      rowHeight: opts.rowHeight ?? 200,
      defaultLayout: (opts.defaultLayout ?? null) as BoardItem[] | null,
      loading: Boolean(opts.loading),
      error: opts.error ?? false,
      rtl: locale.startsWith("ar"),
      s: strings,
      root: null as unknown as HTMLElement,
      session: null as Session | null,
      grip: null as Grip | null,
      origin: null as BoardItem[] | null,
      handlers: null as unknown as Record<string, (e: PointerEvent) => void>,
      ro: null as ResizeObserver | null,

      init(this: BoardState & { ro: ResizeObserver | null }) {
        this.root = this.$el;
        if (!this.rtl) this.rtl = getComputedStyle(this.root).direction === "rtl";
        const self = this as unknown as { pointerMove(e: PointerEvent): void; pointerUp(e: PointerEvent): void; pointerCancel(): void; gripMove(e: PointerEvent): void; gripUp(e: PointerEvent): void };
        this.handlers = {
          move: (e) => self.pointerMove(e),
          up: (e) => self.pointerUp(e),
          cancel: () => self.pointerCancel(),
          gripMove: (e) => self.gripMove(e),
          gripUp: (e) => self.gripUp(e),
          gripCancel: () => this.endResize(),
        };
        this.$nextTick(() => {
          const grid = this.$refs.grid;
          if (!grid) return;
          this.width = grid.clientWidth || 1200;
          if (typeof ResizeObserver === "undefined") return;
          this.ro = new ResizeObserver(([entry]) => entry && (this.width = entry.contentRect.width));
          this.ro.observe(grid);
        });
      },
      destroy(this: BoardState & { ro: ResizeObserver | null }) {
        this.ro?.disconnect();
        this.endDrag();
        this.endResize();
      },

      /* data */
      def(this: BoardState, type: string) {
        return this.widgets.find((w) => w.type === type);
      },
      limits(this: BoardState, type: string) {
        const d = this.def(type);
        return { minCols: d?.minCols ?? 1, maxCols: d?.maxCols ?? BOARD_MAX_COLS, minRows: d?.minRows ?? 1, maxRows: d?.maxRows ?? BOARD_MAX_ROWS };
      },
      get saved() {
        const t = this as unknown as BoardState;
        return normalizeLayout(t.layout, t.widgets.map((w) => ({ type: w.type, ...t.limits(w.type) })));
      },
      get base() {
        const t = this as unknown as BoardState;
        return t.editing ? (t.draft ?? t.saved) : t.saved;
      },
      get list() {
        const t = this as unknown as BoardState;
        return t.order ?? t.base;
      },
      get columns() {
        const t = this as unknown as BoardState;
        return boardColumns(t.width);
      },
      get dirty() {
        const t = this as unknown as BoardState;
        return t.editing && t.draft !== null && !sameLayout(t.draft, t.saved);
      },
      has(this: BoardState) {
        return this.list.length > 0;
      },
      isEmpty(this: BoardState) {
        return this.list.length === 0 && !this.loading && !this.error;
      },
      showGrid(this: BoardState & { loading: boolean; error: unknown }) {
        return this.list.length > 0 && !this.loading && !this.error;
      },
      errorText(this: BoardState & { error: unknown }) {
        return typeof this.error === "string" ? this.error : "";
      },
      canSave(this: BoardState) {
        return this.dirty && !this.saving;
      },
      canEdit(this: BoardState & { loading: boolean; error: unknown }) {
        return !this.loading && !this.error;
      },
      hasDefault(this: BoardState) {
        return this.defaultLayout !== null;
      },
      titleOf(this: BoardState, id: string) {
        const item = this.list.find((i) => i.id === id);
        return (item && this.def(item.type)?.title) ?? id;
      },
      widgetTitle(this: BoardState, item: BoardItem) {
        return this.def(item.type)?.title ?? item.id;
      },
      known(this: BoardState, item: BoardItem) {
        return Boolean(this.def(item.type));
      },
      setting(this: BoardState, item: BoardItem, key: string) {
        return item.settings?.[key] ?? this.def(item.type)?.defaultSettings?.[key];
      },
      num(this: BoardState, n: number) {
        return new Intl.NumberFormat("en-u-nu-latn").format(n);
      },
      shown(this: BoardState, item: BoardItem) {
        const p = this.preview;
        return p && p.id === item.id ? { ...item, cols: p.cols, rows: p.rows } : item;
      },
      span(this: BoardState, item: BoardItem) {
        return Math.min(this.shown(item).cols, this.columns);
      },
      sizeText(this: BoardState, item: BoardItem) {
        const v = this.shown(item);
        return `${v.cols}×${v.rows}`;
      },
      sizeAria(this: BoardState, item: BoardItem) {
        const v = this.shown(item);
        return `${this.s.sizeLabel}: ${this.s.size(v.cols, v.rows)}`;
      },
      handleLabel(this: BoardState, item: BoardItem) {
        return this.s.dragHandle(this.widgetTitle(item));
      },
      moreLabel(this: BoardState, item: BoardItem) {
        return this.onlySettings(item) ? `${this.s.settings}: ${this.widgetTitle(item)}` : this.s.more(this.widgetTitle(item));
      },
      pinLabel(this: BoardState, item: BoardItem) {
        return item.pinned ? this.s.unpin : this.s.pin;
      },
      cardStyle(this: BoardState, item: BoardItem) {
        const v = this.shown(item);
        const parts = [`grid-column: span ${Math.min(v.cols, this.columns)}`, `grid-row: span ${v.rows}`];
        if (this.activeId === item.id) parts.push(`transform: translate(${this.shift.x}px, ${this.shift.y}px)`, "z-index: 20");
        else if (this.preview?.id === item.id) parts.push("z-index: 20");
        return parts.join("; ");
      },
      gridStyle(this: BoardState) {
        return `grid-template-columns: repeat(${this.columns}, minmax(0, 1fr)); grid-auto-rows: ${this.rowHeight}px; gap: ${GAP}px`;
      },
      cardClass(this: BoardState, item: BoardItem) {
        return this.activeId === item.id ? "opacity-80" : "";
      },
      surfaceClass(this: BoardState, item: BoardItem) {
        return [this.editing ? "border-dashed ring-1 ring-border" : "", this.preview?.id === item.id ? "ring-2 ring-ring" : ""].join(" ");
      },
      taken(this: BoardState, w: BoardWidget) {
        return Boolean(w.unique) && this.list.some((i) => i.type === w.type);
      },
      /** Puts the widget's <template data-board-widget="type"> into its card, once. */
      mountWidget(this: BoardState, el: HTMLElement, item: BoardItem) {
        if (el.dataset.mounted) return;
        const tpl = this.root.querySelector<HTMLTemplateElement>(`template[data-board-widget="${CSS.escape(item.type)}"]`);
        if (!tpl) return;
        el.dataset.mounted = "1";
        for (const node of [...(tpl.content.cloneNode(true) as DocumentFragment).childNodes]) {
          el.appendChild(node);
          if (node instanceof Element) (Alpine as unknown as { initTree(el: Element): void }).initTree(node);
        }
      },

      /* editing */
      setEditing(this: BoardState, next: boolean) {
        this.editing = next;
        if (!next) {
          this.draft = null;
          this.order = null;
          this.saveError = false;
        }
        this.root.dispatchEvent(new CustomEvent("editing-change", { bubbles: true, detail: { editing: next } }));
      },
      startEditing(this: BoardState) {
        this.draft = this.saved;
        this.setEditing(true);
      },
      stopEditing(this: BoardState) {
        this.setEditing(false);
      },
      change(this: BoardState, next: BoardItem[]) {
        this.draft = next;
        this.saveError = false;
      },
      async save(this: BoardState) {
        if (!this.draft || this.saving) return;
        this.saving = true;
        this.saveError = false;
        const next = this.draft;
        const pending: Promise<unknown>[] = [];
        this.root.dispatchEvent(new CustomEvent("save", { bubbles: true, detail: { layout: next, until: (p: Promise<unknown>) => pending.push(Promise.resolve(p)) } }));
        try {
          await Promise.all(pending);
          this.layout = next;
          this.setEditing(false);
        } catch {
          this.saveError = true;
        } finally {
          this.saving = false;
        }
      },
      resetToDefault(this: BoardState) {
        if (this.defaultLayout) this.change(normalizeLayout(this.defaultLayout, this.widgets.map((w) => ({ type: w.type, ...this.limits(w.type) }))));
      },
      position(this: BoardState, id: string) {
        return this.list.findIndex((i) => i.id === id) + 1;
      },

      /* actions and the context menu */
      resizeBy(this: BoardState, item: BoardItem, dc: number, dr: number) {
        const next = resizeItem(this.list, item.id, item.cols + dc, item.rows + dr, this.limits(item.type));
        this.change(next);
        const now = next.find((i) => i.id === item.id);
        if (now) this.live = this.s.resized(this.titleOf(item.id), now.cols, now.rows);
      },
      togglePinned(this: BoardState, item: BoardItem) {
        this.change(togglePin(this.list, item.id));
        this.live = item.pinned ? this.s.unpinned(this.titleOf(item.id)) : this.s.pinned(this.titleOf(item.id));
      },
      move(this: BoardState, item: BoardItem, step: -1 | 1) {
        this.change(moveItem(this.list, item.id, step));
      },
      removeItem(this: BoardState, item: BoardItem) {
        this.live = this.s.removed(this.titleOf(item.id));
        this.change(this.list.filter((i) => i.id !== item.id));
      },
      /** True when a menu action cannot run on this item (a disabled row). */
      off(this: BoardState, item: BoardItem, action: Action) {
        const lim = this.limits(item.type);
        if (action === "wider") return item.cols >= lim.maxCols;
        if (action === "narrower") return item.cols <= lim.minCols;
        if (action === "taller") return item.rows >= lim.maxRows;
        if (action === "shorter") return item.rows <= lim.minRows;
        const group = this.list.filter((i) => !!i.pinned === !!item.pinned);
        const at = group.findIndex((i) => i.id === item.id);
        return action === "earlier" ? at <= 0 : at < 0 || at >= group.length - 1;
      },
      hasFields(this: BoardState, item: BoardItem) {
        return (this.def(item.type)?.fields?.length ?? 0) > 0;
      },
      hasMenu(this: BoardState, item: BoardItem) {
        return this.editing || this.hasFields(item);
      },
      onlySettings(this: BoardState, item: BoardItem) {
        return !this.editing && this.hasFields(item);
      },
      /* add */
      showAdd(this: BoardState) {
        this.adding = true;
      },
      addWidget(this: BoardState, w: BoardWidget) {
        const lim = this.limits(w.type);
        const item: BoardItem = {
          id: nextItemId(this.list, w.type),
          type: w.type,
          cols: Math.min(Math.max(w.defaultCols ?? lim.minCols, lim.minCols), lim.maxCols),
          rows: Math.min(Math.max(w.defaultRows ?? lim.minRows, lim.minRows), lim.maxRows),
          ...(w.defaultSettings ? { settings: { ...w.defaultSettings } } : {}),
        };
        this.change([...this.list, item]);
        this.live = this.s.added(w.title);
        this.adding = false;
      },

      /* settings */
      openSettings(this: BoardState, item: BoardItem) {
        const def = this.def(item.type);
        this.form = { ...def?.defaultSettings, ...item.settings };
        this.settingsId = item.id;
        this.settingsFailed = false;
        this.settingsOpen = true;
      },
      get settingsFields() {
        const t = this as unknown as BoardState;
        const item = t.list.find((i) => i.id === t.settingsId);
        return (item && t.def(item.type)?.fields) || [];
      },
      get settingsHeading() {
        const t = this as unknown as BoardState;
        return t.s.settingsTitle(t.settingsId ? t.titleOf(t.settingsId) : "");
      },
      saveSettings(this: BoardState) {
        const id = this.settingsId;
        if (!id) return;
        const values = { ...this.form };
        const next = this.list.map((i) => (i.id === id ? { ...i, settings: values } : i));
        if (this.editing) this.change(next);
        else {
          const pending: Promise<unknown>[] = [];
          this.root.dispatchEvent(new CustomEvent("save", { bubbles: true, detail: { layout: next, until: (p: Promise<unknown>) => pending.push(Promise.resolve(p)) } }));
          this.layout = next;
        }
        this.settingsOpen = false;
      },

      /* drag to reorder */
      cardEl(this: BoardState, id: string) {
        return this.$refs.grid?.querySelector<HTMLElement>(`[data-board-id="${CSS.escape(id)}"]`) ?? null;
      },
      lift(this: BoardState, id: string) {
        this.origin = this.base;
        this.activeId = id;
        this.order = this.base;
        this.shift = { x: 0, y: 0 };
        this.live = this.s.pickedUp(this.titleOf(id), this.position(id), this.list.length);
      },
      endDrag(this: BoardState) {
        window.removeEventListener("pointermove", this.handlers?.move as never);
        window.removeEventListener("pointerup", this.handlers?.up as never);
        window.removeEventListener("pointercancel", this.handlers?.cancel as never);
        this.session = null;
        this.activeId = null;
        this.order = null;
        this.shift = { x: 0, y: 0 };
        this.origin = null;
      },
      drop(this: BoardState) {
        const id = this.activeId;
        const next = this.order;
        const from = this.origin;
        if (id) this.live = this.s.dropped(this.titleOf(id), this.position(id), this.list.length);
        this.endDrag();
        if (next && from && !sameLayout(next, from)) this.change(next);
      },
      cancel(this: BoardState) {
        const id = this.activeId;
        const title = id ? this.titleOf(id) : "";
        this.endDrag();
        if (id) this.live = this.s.cancelled(title);
      },
      handleDown(this: BoardState, event: PointerEvent, id: string) {
        if (!this.editing || this.session || (event.pointerType === "mouse" && event.button !== 0)) return;
        const rect = this.cardEl(id)?.getBoundingClientRect();
        this.session = { id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, grabX: event.clientX - (rect?.left ?? 0), grabY: event.clientY - (rect?.top ?? 0), active: false };
        window.addEventListener("pointermove", this.handlers.move!);
        window.addEventListener("pointerup", this.handlers.up!);
        window.addEventListener("pointercancel", this.handlers.cancel!);
      },
      follow(this: BoardState, x: number, y: number) {
        const s = this.session;
        if (!s) return;
        const el = this.cardEl(s.id);
        if (el) {
          const r = el.getBoundingClientRect();
          this.shift = { x: x - s.grabX - (r.left - this.shift.x), y: y - s.grabY - (r.top - this.shift.y) };
        }
        const over = [...(this.$refs.grid?.querySelectorAll<HTMLElement>("[data-board-id]") ?? [])].find((li) => {
          if (li.dataset.boardId === s.id) return false;
          const r = li.getBoundingClientRect();
          return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
        });
        const overId = over?.dataset.boardId;
        if (!overId) return;
        const next = reorderItems(this.list, s.id, overId);
        if (next.every((it, i) => it.id === this.list[i]?.id)) return;
        this.order = next;
        this.live = this.s.over(this.titleOf(s.id), this.position(s.id), next.length);
      },
      pointerMove(this: BoardState, event: PointerEvent) {
        const s = this.session;
        if (!s || event.pointerId !== s.pointerId) return;
        if (!s.active) {
          if (Math.hypot(event.clientX - s.startX, event.clientY - s.startY) < 4) return;
          s.active = true;
          this.lift(s.id);
        }
        event.preventDefault();
        this.follow(event.clientX, event.clientY);
      },
      pointerUp(this: BoardState, event: PointerEvent) {
        const s = this.session;
        if (!s || event.pointerId !== s.pointerId) return;
        if (s.active) this.drop();
        else this.endDrag();
      },
      pointerCancel(this: BoardState) {
        if (this.session?.active) this.cancel();
        else this.endDrag();
      },
      handleKey(this: BoardState, event: KeyboardEvent, id: string) {
        const lifted = this.activeId === id;
        if (event.key === " " || event.key === "Enter") {
          event.preventDefault();
          if (lifted) this.drop();
          else if (this.activeId === null) this.lift(id);
          return;
        }
        if (!lifted) return;
        if (event.key === "Escape") {
          event.preventDefault();
          this.cancel();
          return;
        }
        if (!event.key.startsWith("Arrow")) return;
        event.preventDefault();
        const step = event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : (event.key === "ArrowLeft") === this.rtl ? 1 : -1;
        const next = moveItem(this.list, id, step as -1 | 1);
        if (next.every((it, i) => it.id === this.list[i]?.id)) return;
        this.order = next;
        this.live = this.s.over(this.titleOf(id), this.position(id), next.length);
        this.$nextTick(() => this.$refs.grid?.querySelector<HTMLElement>(`[data-board-handle="${CSS.escape(id)}"]`)?.focus());
      },

      /* resize from the grip */
      gripDown(this: BoardState, event: PointerEvent, item: BoardItem) {
        if (!this.editing || this.grip || (event.pointerType === "mouse" && event.button !== 0)) return;
        event.preventDefault();
        this.grip = { id: item.id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, start: item };
        this.preview = null;
        window.addEventListener("pointermove", this.handlers.gripMove!);
        window.addEventListener("pointerup", this.handlers.gripUp!);
        window.addEventListener("pointercancel", this.handlers.gripCancel!);
      },
      gripMove(this: BoardState, event: PointerEvent) {
        const g = this.grip;
        if (!g || event.pointerId !== g.pointerId) return;
        const cell = { width: (this.width - GAP * (this.columns - 1)) / this.columns + GAP, height: this.rowHeight + GAP };
        const next = resizeFromDelta(g.start, { x: event.clientX - g.startX, y: event.clientY - g.startY }, cell, this.limits(g.start.type), this.rtl);
        // Width only changes on a four column board; narrower boards cap the span, so keep the saved one.
        const cols = this.columns === 4 ? next.cols : g.start.cols;
        const p = this.preview;
        if (!(p && p.id === g.id && p.cols === cols && p.rows === next.rows)) this.preview = { id: g.id, cols, rows: next.rows };
      },
      gripUp(this: BoardState, event: PointerEvent) {
        const g = this.grip;
        if (!g || event.pointerId !== g.pointerId) return;
        const p = this.preview;
        this.endResize();
        if (!p) return;
        const type = this.list.find((i) => i.id === p.id)?.type ?? "";
        this.change(resizeItem(this.list, p.id, p.cols, p.rows, this.limits(type)));
        this.live = this.s.resized(this.titleOf(p.id), p.cols, p.rows);
      },
      endResize(this: BoardState) {
        window.removeEventListener("pointermove", this.handlers?.gripMove as never);
        window.removeEventListener("pointerup", this.handlers?.gripUp as never);
        window.removeEventListener("pointercancel", this.handlers?.gripCancel as never);
        this.grip = null;
        this.preview = null;
      },
    };
  });
};
