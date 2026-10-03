// nqSidebarLayout: order and visibility of the sidebar's items, drag-to-reorder and the customize dialog. The markup is
// the React SidebarSortable / SidebarCustomize's, the state lives here. One root holds one or more lists ("sections").
//
//   <div x-data="nqSidebarLayout({ sections: [{ id: 'main', storageKey: 'my-app-nav', ids: ['home', 'inbox'] }] })" x-modelable="open" x-id="['nq-dialog']">
//     <div data-slot="sidebar-sortable-item" data-sortable-id="inbox" x-show="isVisible('main', 'inbox')"
//          :style="{ order: position('main', 'inbox') }" x-on:pointerdown="press($event, 'main', 'inbox')" x-on:click.capture="swallowClick($event)">…</div>
//     <button x-on:click="show()">Customize sidebar</button>
//     <template x-teleport="body"> … rows: handle x-on:keydown="keyMove($event, 'main', 'inbox')" x-on:pointerdown="press($event, 'main', 'inbox', true)",
//       switch x-on:click="toggleVisible('main', 'inbox')" … </template>
//   </div>
//
// Items stay in their server-rendered DOM order; the saved order is applied with the CSS `order` property, so nothing
// re-renders and focus stays put. Mouse drags start after 4px (2px in the dialog), touch after a 250ms (150ms) press.
// Drag is native pointer events (the React version uses dnd-kit). Each section saves to localStorage under its storageKey.
// The nqDialog state (open, show, close, popup) is included, so the dialog.* parts work inside the root.
// open is x-modelable: <div x-data="nqSidebarLayout({...})" x-model="$wire.customizing">.

import type { Magics, Register } from "./types";

/* ---------------------------------------------------------------- pointer drag */

// Vertical drag-to-reorder. Mouse activates after `distance` px, touch and pen after a `delay` ms press that moves less
// than `tolerance` px (so a list still scrolls). While dragging, the active element follows the pointer and its siblings
// shift out of the way. Siblings are the parent's children that carry `data-sortable-id`.

interface DragOptions {
  distance: number;
  delay: number;
  tolerance: number;
  /** Called on release with the dragged id and the id whose slot it ended over. */
  onMove: (activeId: string, overId: string) => void;
  /** Called when a drag ends (before onMove). */
  onEnd?: () => void;
}

interface Slot {
  id: string;
  el: HTMLElement;
  top: number;
  height: number;
}

function beginPress(event: PointerEvent, el: HTMLElement, id: string, opts: DragOptions): void {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  const parent = el.parentElement;
  if (!parent) return;
  const touch = event.pointerType !== "mouse";
  const startY = event.clientY;
  const startX = event.clientX;
  let active = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let slots: Slot[] = [];
  let from = -1;
  let to = -1;

  const blockScroll = (e: TouchEvent) => e.preventDefault();

  function cleanup() {
    clearTimeout(timer);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    window.removeEventListener("touchmove", blockScroll);
    if (active) {
      active = false;
      el.removeAttribute("data-dragging");
      el.style.transform = "";
      for (const s of slots) {
        s.el.style.transform = "";
        s.el.style.transition = "";
      }
    }
  }

  const activate = () => {
    slots = [...parent.children]
      .filter((c): c is HTMLElement => c instanceof HTMLElement && c.hasAttribute("data-sortable-id") && c.getClientRects().length > 0)
      .map((c) => {
        const r = c.getBoundingClientRect();
        return { id: c.getAttribute("data-sortable-id") ?? "", el: c, top: r.top, height: r.height };
      })
      // CSS `order` decides what the user sees, not the DOM order.
      .sort((a, b) => a.top - b.top);
    from = slots.findIndex((s) => s.el === el);
    if (from < 0) return cleanup();
    to = from;
    active = true;
    el.setAttribute("data-dragging", "");
    for (const s of slots) if (s.el !== el) s.el.style.transition = "transform 200ms ease";
    window.addEventListener("touchmove", blockScroll, { passive: false });
  };

  const place = (dy: number) => {
    const me = slots[from];
    if (!me) return;
    el.style.transform = `translate3d(0, ${dy}px, 0)`;
    const center = me.top + me.height / 2 + dy;
    let best = from;
    let bestDist = Infinity;
    slots.forEach((s, i) => {
      const d = Math.abs(s.top + s.height / 2 - center);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    to = best;
    slots.forEach((s, i) => {
      if (i === from) return;
      let shift = 0;
      if (from < to && i > from && i <= to) shift = -me.height;
      else if (from > to && i < from && i >= to) shift = me.height;
      s.el.style.transform = shift ? `translate3d(0, ${shift}px, 0)` : "";
    });
  };

  function onMove(e: PointerEvent) {
    if (e.pointerId !== event.pointerId) return;
    if (!active) {
      const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
      if (touch) {
        if (dist > opts.tolerance) cleanup();
      } else if (dist >= opts.distance) {
        activate();
        if (active) place(e.clientY - startY);
      }
      return;
    }
    e.preventDefault();
    place(e.clientY - startY);
  }

  function onUp(e: PointerEvent) {
    if (e.pointerId !== event.pointerId) return;
    const wasActive = active;
    const overId = slots[to]?.id;
    const moved = wasActive && e.type === "pointerup" && to !== from && overId !== undefined;
    cleanup();
    if (wasActive) {
      opts.onEnd?.();
      if (moved) opts.onMove(id, overId as string);
    }
  }

  window.addEventListener("pointermove", onMove, { passive: false });
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
  if (touch) timer = setTimeout(activate, opts.delay);
}

/* ---------------------------------------------------------------- layout state */

interface SectionConfig {
  id: string;
  label?: string;
  storageKey: string;
  /** Every id, in the default order. */
  ids: string[];
  /** Ids that start switched off. */
  defaultHidden?: string[];
}

interface Config {
  sections: SectionConfig[];
  open?: boolean;
  /** Announcement template after a keyboard move; `:label`, `:position` and `:total` are replaced. */
  moved?: string;
}

interface Stored {
  order: string[];
  hidden: string[];
}

interface LayoutState extends Magics {
  sections: SectionConfig[];
  layouts: Record<string, Stored>;
  open: boolean;
  announcement: string;
  suppressUntil: number;
  moved: string;
  close(): void;
  save(section: string): void;
  move(section: string, activeId: string, overId: string): void;
  setVisible(section: string, id: string, visible: boolean): void;
  isVisible(section: string, id: string): boolean;
  isDefault(section: string): boolean;
}

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");

/** Keeps saved state valid when the product adds or removes items: unknown ids drop, new ones append (hidden if hidden by default). */
function normalise(saved: Stored, ids: readonly string[], defaultHidden: readonly string[]): Stored {
  const known = new Set(ids);
  const order = saved.order.filter((id) => known.has(id));
  const hidden = saved.hidden.filter((id) => known.has(id));
  for (const id of ids) {
    if (order.includes(id)) continue;
    order.push(id);
    if (defaultHidden.includes(id)) hidden.push(id);
  }
  return { order, hidden };
}

const defaultsOf = (s: SectionConfig): Stored => ({ order: [...s.ids], hidden: s.ids.filter((id) => (s.defaultHidden ?? []).includes(id)) });
const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x) => b.includes(x));

export const sidebarLayout: Register = (Alpine) => {
  Alpine.data("nqSidebarLayout", (config: Config) => ({
    sections: config.sections,
    layouts: Object.fromEntries(config.sections.map((s) => [s.id, defaultsOf(s)])) as Record<string, Stored>,
    open: Boolean(config.open),
    announcement: "",
    suppressUntil: 0,
    moved: config.moved ?? ":label, position :position of :total",

    init(this: LayoutState) {
      // Read when Alpine starts, after the server-rendered default order has painted.
      for (const s of this.sections) {
        let saved = defaultsOf(s);
        try {
          const raw = localStorage.getItem(s.storageKey);
          if (raw) {
            const shape = JSON.parse(raw) as Partial<Stored> | null;
            // Wrong shape (older version, hand-edited): keep the defaults.
            if (shape && typeof shape === "object" && isStringArray(shape.order) && isStringArray(shape.hidden)) saved = { order: shape.order, hidden: shape.hidden };
          }
        } catch {
          /* corrupt or blocked storage: fall back to the defaults */
        }
        this.layouts[s.id] = normalise(saved, s.ids, s.defaultHidden ?? []);
      }
    },

    /* dialog state (the same as nqDialog) */
    show() {
      this.open = true;
    },
    close() {
      this.open = false;
    },
    toggle() {
      this.open = !this.open;
    },
    /** Bind on the dialog popup: dialog role, labelled by the title and described by the description. */
    popup: {
      role: "dialog",
      "aria-modal": "true",
      tabindex: "-1",
      ":aria-labelledby"(this: Magics) {
        return this.$id("nq-dialog", "title");
      },
      ":aria-describedby"(this: Magics) {
        return this.$id("nq-dialog", "description");
      },
      "x-on:keydown.escape.prevent.stop"(this: LayoutState) {
        this.close();
      },
    },

    /* layout */
    /** The CSS `order` of an item: its place in the saved order. */
    position(this: LayoutState, section: string, id: string): number {
      return (this.layouts[section]?.order ?? []).indexOf(id);
    },
    isVisible(this: LayoutState, section: string, id: string): boolean {
      return !(this.layouts[section]?.hidden ?? []).includes(id);
    },
    /** True when nothing is hidden and the order matches the defaults. */
    isDefault(this: LayoutState, section: string): boolean {
      const s = this.sections.find((x) => x.id === section);
      const l = this.layouts[section];
      if (!s || !l) return true;
      const d = defaultsOf(s);
      return sameSet(l.hidden, d.hidden) && l.order.join("\u0000") === d.order.join("\u0000");
    },
    /** "Reset to default" is disabled while every section is at its default. */
    allDefault(this: LayoutState): boolean {
      return this.sections.every((s) => this.isDefault(s.id));
    },
    save(this: LayoutState, section: string) {
      const s = this.sections.find((x) => x.id === section);
      if (!s) return;
      try {
        localStorage.setItem(s.storageKey, JSON.stringify(this.layouts[section]));
      } catch {
        /* storage full or blocked: keep the in-memory layout */
      }
    },
    /** Moves `activeId` to the position of `overId`. */
    move(this: LayoutState, section: string, activeId: string, overId: string) {
      const l = this.layouts[section];
      if (!l) return;
      const from = l.order.indexOf(activeId);
      const to = l.order.indexOf(overId);
      if (from < 0 || to < 0 || from === to) return;
      const order = [...l.order];
      order.splice(to, 0, ...order.splice(from, 1));
      this.layouts[section] = { ...l, order };
      this.save(section);
    },
    setVisible(this: LayoutState, section: string, id: string, visible: boolean) {
      const l = this.layouts[section];
      if (!l) return;
      this.layouts[section] = { ...l, hidden: visible ? l.hidden.filter((h) => h !== id) : [...new Set([...l.hidden, id])] };
      this.save(section);
    },
    /** The row's switch. */
    toggleVisible(this: LayoutState, section: string, id: string) {
      this.setVisible(section, id, !this.isVisible(section, id));
    },
    /** Clears storage and restores the default order and visibility, for every section. */
    reset(this: LayoutState) {
      for (const s of this.sections) {
        try {
          localStorage.removeItem(s.storageKey);
        } catch {
          /* ignore */
        }
        this.layouts[s.id] = defaultsOf(s);
      }
    },

    /* drag and keyboard */
    /** pointerdown on a sortable item, or (handle = true) on a dialog row's drag handle. Starts a pointer drag that reorders on release. */
    press(this: LayoutState, event: PointerEvent, section: string, id: string, handle = false) {
      const target = event.currentTarget as HTMLElement;
      const el = handle ? target.closest<HTMLElement>("[data-sortable-id]") : target;
      if (!el || (!handle && event.defaultPrevented)) return;
      beginPress(event, el, id, {
        distance: handle ? 2 : 4,
        delay: handle ? 150 : 250,
        tolerance: 6,
        onMove: (a, o) => this.move(section, a, o),
        // The mouseup that ends a drag would otherwise click the link under it.
        onEnd: () => (this.suppressUntil = performance.now() + 100),
      });
    },
    /** x-on:click.capture on a sortable item: swallows the click that ends a drag. */
    swallowClick(this: LayoutState, event: Event) {
      if (performance.now() < this.suppressUntil) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    /** keydown on a row's handle: Up/Down move one place, Home/End to either end; the move is announced and focus stays on the handle. */
    keyMove(this: LayoutState, event: KeyboardEvent, section: string, id: string, label = id) {
      const key = event.key;
      if (key !== "ArrowUp" && key !== "ArrowDown" && key !== "Home" && key !== "End") return;
      event.preventDefault();
      const handle = event.currentTarget as HTMLElement;
      const order = this.layouts[section]?.order ?? [];
      const index = order.indexOf(id);
      const raw = key === "ArrowUp" ? index - 1 : key === "ArrowDown" ? index + 1 : key === "Home" ? 0 : order.length - 1;
      const target = Math.max(0, Math.min(order.length - 1, raw));
      const overId = order[target];
      if (overId !== undefined && overId !== id) {
        this.move(section, id, overId);
        this.announcement = this.moved.replace(":label", label).replace(":position", String(target + 1)).replace(":total", String(order.length));
      }
      requestAnimationFrame(() => handle.focus());
    },
  }));
};
