// nqDesktopIcons: icons on a desktop. The markup is in the Blade component desktop-icons; selection, opening and dragging live here.
//
//   <div x-data="nqDesktopIcons([{ id: 'files', title: 'Files', iconHtml: '…' }], { free: true })" x-modelable="selected">…</div>
//
// items: id, title, iconHtml (trusted HTML for the tile). options: free (drag icons to place them), snap (default true), openOn (auto | click | double-click),
// positions { id: { x, y } } (saved places), hidden [ids], selected (x-modelable: x-model="$wire.selected").
// Events (bubbling, from the root): "nq-desktop-icon-open" { id } (a double-click, Enter, Space, or a tap on touch screens; a desktop-os-shell around it opens the app),
// "nq-desktop-icon-select" { id }, "nq-desktop-icon-move" { id, x, y } (free mode, after a drop).
// Arrow keys move between icons (mirrored in RTL), Escape clears the selection. Not ported: the context menu (Open, your actions, Remove).

import { DESKTOP_ICON_CELL, desktopIconSlot, snapTo, type DesktopIconOpenOn, type DesktopIconPosition } from "./desktop-icons-logic";
import type { Magics, Register } from "./types";

export interface DesktopIconRow {
  id: string;
  title: string;
  iconHtml?: string;
}
export interface DesktopIconsOptions {
  free?: boolean;
  snap?: boolean;
  openOn?: DesktopIconOpenOn;
  positions?: Record<string, DesktopIconPosition>;
  hidden?: string[];
  selected?: string | null;
}

interface Nq {
  dir: string;
}
interface IconsState extends Magics {
  $nq: Nq;
  items: DesktopIconRow[];
  positions: Record<string, DesktopIconPosition>;
  hidden: string[];
  selected: string | null;
  free: boolean;
  snap: boolean;
  openOn: DesktopIconOpenOn;
  height: number;
  coarse: boolean;
  live: Record<string, DesktopIconPosition>;
  dragging: string | null;
  root: HTMLElement;
  visible(): DesktopIconRow[];
  select(id: string | null): void;
  pos(id: string, index: number): DesktopIconPosition;
}

export const desktopIcons: Register = (Alpine) => {
  Alpine.data("nqDesktopIcons", (items: DesktopIconRow[] = [], options: DesktopIconsOptions = {}) => {
    // The drag in progress and the click to swallow after a drop live outside the reactive state.
    let drag: { id: string; x: number; y: number; base: DesktopIconPosition; moved: boolean; pointer: number } | null = null;
    let justDropped = false;
    let observer: ResizeObserver | undefined;
    let query: MediaQueryList | undefined;
    let onQuery: () => void = () => {};

    return {
      items,
      positions: options.positions ?? ({} as Record<string, DesktopIconPosition>),
      hidden: options.hidden ?? ([] as string[]),
      selected: options.selected ?? (null as string | null),
      free: Boolean(options.free),
      snap: options.snap !== false,
      openOn: options.openOn ?? ("auto" as DesktopIconOpenOn),
      height: 600,
      coarse: false,
      live: {} as Record<string, DesktopIconPosition>,
      dragging: null as string | null,
      root: null as unknown as HTMLElement,

      init(this: IconsState) {
        this.root = this.$el;
        if (this.free && typeof ResizeObserver !== "undefined") {
          const el = this.root;
          const measure = () => (this.height = el.clientHeight || 600);
          measure();
          observer = new ResizeObserver(measure);
          observer.observe(el);
        }
        query = window.matchMedia?.("(pointer: coarse)");
        if (query) {
          this.coarse = query.matches;
          onQuery = () => (this.coarse = Boolean(query?.matches));
          query.addEventListener?.("change", onQuery);
        }
      },
      destroy() {
        observer?.disconnect();
        query?.removeEventListener?.("change", onQuery);
      },

      visible(this: IconsState) {
        return this.items.filter((i) => !this.hidden.includes(i.id));
      },
      isSingle(this: IconsState) {
        return this.openOn === "click" || (this.openOn === "auto" && this.coarse);
      },
      select(this: IconsState, id: string | null) {
        if (this.selected === id) return;
        this.selected = id;
        if (id) this.root.dispatchEvent(new CustomEvent("nq-desktop-icon-select", { bubbles: true, detail: { id } }));
      },
      open(this: IconsState, id: string) {
        this.root.dispatchEvent(new CustomEvent("nq-desktop-icon-open", { bubbles: true, detail: { id } }));
      },
      click(this: IconsState & { isSingle(): boolean; open(id: string): void }, id: string) {
        this.select(id);
        if (this.isSingle()) this.open(id);
      },
      dblclick(this: IconsState & { isSingle(): boolean; open(id: string): void }, id: string) {
        if (!this.isSingle()) this.open(id);
      },
      keydown(this: IconsState & { open(id: string): void }, event: KeyboardEvent, id: string) {
        if (event.defaultPrevented) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          this.open(id);
        }
      },
      /** Roving between icons with the arrow keys; Escape clears the selection. */
      groupKey(this: IconsState, event: KeyboardEvent) {
        if (event.key === "Escape") return this.select(null);
        const rtl = this.$nq.dir === "rtl";
        const next = rtl ? "ArrowLeft" : "ArrowRight";
        const prev = rtl ? "ArrowRight" : "ArrowLeft";
        const step = event.key === next || event.key === "ArrowDown" ? 1 : event.key === prev || event.key === "ArrowUp" ? -1 : 0;
        if (!step) return;
        const buttons = [...this.root.querySelectorAll<HTMLButtonElement>('[data-slot="desktop-icon"]')];
        const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const to = buttons[Math.min(buttons.length - 1, Math.max(0, at + step))];
        if (!to) return;
        event.preventDefault();
        to.focus();
        if (to.dataset.id) this.select(to.dataset.id);
      },
      background(this: IconsState, event: PointerEvent) {
        if (event.target === event.currentTarget) this.select(null);
      },

      // Free placement.
      pos(this: IconsState, id: string, index: number) {
        return this.live[id] ?? this.positions[id] ?? desktopIconSlot(index, this.height);
      },
      style(this: IconsState & { pos(id: string, i: number): DesktopIconPosition }, id: string, index: number) {
        const p = this.pos(id, index);
        return { insetInlineStart: `${p.x}px`, top: `${p.y}px` };
      },
      clamp(this: IconsState, p: DesktopIconPosition): DesktopIconPosition {
        const maxX = Math.max(0, this.root.clientWidth - DESKTOP_ICON_CELL.w);
        const maxY = Math.max(0, this.root.clientHeight - DESKTOP_ICON_CELL.h);
        return { x: Math.min(Math.max(0, p.x), maxX), y: Math.min(Math.max(0, p.y), maxY) };
      },
      down(this: IconsState & { pos(id: string, i: number): DesktopIconPosition }, event: PointerEvent, id: string, index: number) {
        if (!this.free || (event.pointerType === "mouse" && event.button !== 0)) return;
        drag = { id, x: event.clientX, y: event.clientY, base: this.pos(id, index), moved: false, pointer: event.pointerId };
      },
      move(this: IconsState & { clamp(p: DesktopIconPosition): DesktopIconPosition }, event: PointerEvent) {
        const d = drag;
        if (!d) return;
        const dx = (event.clientX - d.x) * (this.$nq.dir === "rtl" ? -1 : 1);
        const dy = event.clientY - d.y;
        if (!d.moved) {
          if (Math.abs(dx) + Math.abs(dy) < 5) return;
          // Capture only once a real drag starts, so a plain click still fires click and dblclick.
          d.moved = true;
          (event.currentTarget as HTMLElement).setPointerCapture?.(d.pointer);
          this.dragging = d.id;
          this.select(d.id);
        }
        this.live = { ...this.live, [d.id]: this.clamp({ x: d.base.x + dx, y: d.base.y + dy }) };
      },
      up(this: IconsState & { clamp(p: DesktopIconPosition): DesktopIconPosition }, event: PointerEvent) {
        const d = drag;
        drag = null;
        if (!d?.moved) return;
        const el = event.currentTarget as HTMLElement;
        if (el.hasPointerCapture?.(d.pointer)) el.releasePointerCapture(d.pointer);
        this.dragging = null;
        justDropped = true;
        setTimeout(() => (justDropped = false), 0);
        const at = this.live[d.id] ?? d.base;
        const dropped = this.clamp(this.snap ? snapTo(at) : at);
        this.positions = { ...this.positions, [d.id]: dropped };
        const next = { ...this.live };
        delete next[d.id];
        this.live = next;
        this.root.dispatchEvent(new CustomEvent("nq-desktop-icon-move", { bubbles: true, detail: { id: d.id, x: dropped.x, y: dropped.y } }));
      },
      /** A drag ends with a click on the same button; swallow it so dropping does not open the app. */
      clickCapture(event: MouseEvent) {
        if (justDropped) event.stopPropagation();
      },
    };
  });
};
