// Mobile nav kit: nqBottomTabBar, nqFilterStrip and nqSwipeRow. The markup is in the Blade parts mobile-nav-kit.bottom-tab-bar,
// mobile-nav-kit.filter-strip and mobile-nav-kit.swipe-action-row; the state lives here.
//
//   <nav x-data="nqBottomTabBar('home', ['home', 'inbox'])" x-modelable="value">
//     <button data-tab-item x-on:click="pick('home')" x-on:keydown="onKey($event, 0)" x-bind:aria-current="value === 'home' ? 'page' : null">…</button>
//   </nav>
//
// value is x-modelable on the tab bar and the filter strip (x-model="$wire.tab"). They fire "nq-change" { value } from the root.
// nqSwipeRow(startActions, endActions) slides a row sideways to reveal actions (pointer events, touch only, direction follows RTL);
// it fires "nq-swipe-change" { state } and "nq-swipe-action" { id }. The per-row context menu of the React row is not ported.

import { centerScroll, clampSwipe, isHorizontalIntent, nextTabIndex, restOffset, settleSwipe, toInlineOffset, type SwipeState } from "./mobile-nav-kit-logic";
import type { Magics, Register } from "./types";

interface Nq {
  dir: string;
}
interface TabBarState extends Magics {
  $nq: Nq;
  value: string | null;
  values: string[];
  root: HTMLElement;
}
interface StripState extends Magics {
  $nq: Nq;
  value: string | string[];
  multiple: boolean;
  root: HTMLElement;
  pressed(v: string): boolean;
  reveal(): void;
}
interface SwipeState_ extends Magics {
  disabled: boolean;
  $nq: Nq;
  state: SwipeState;
  drag: number | null;
  startWidth: number;
  endWidth: number;
  root: HTMLElement;
  gesture: Gesture | null;
  moved: boolean;
  setOpen(next: SwipeState): void;
}
interface Gesture {
  x: number;
  y: number;
  base: number;
  t: number;
  horizontal: boolean;
  last: number;
  velocity: number;
}

const ACTION_WIDTH = 76;

export const mobileNavKit: Register = (Alpine) => {
  Alpine.data("nqBottomTabBar", (initial: string | null = null, values: string[] = []) => ({
    value: initial,
    values,
    root: null as unknown as HTMLElement,
    init(this: TabBarState) {
      this.root = this.$el;
    },
    pick(this: TabBarState, value: string) {
      this.value = value;
      this.root.dispatchEvent(new CustomEvent("nq-change", { bubbles: true, detail: { value } }));
    },
    /** Roving tabindex: the active tab, else the first. */
    stop(this: TabBarState, value: string, index: number) {
      return value === this.value || (!this.values.includes(this.value ?? "") && index === 0) ? 0 : -1;
    },
    onKey(this: TabBarState, event: KeyboardEvent, index: number) {
      const items = [...this.root.querySelectorAll<HTMLElement>("[data-tab-item]")];
      const next = nextTabIndex(index, items.length, event.key, this.$nq.dir === "rtl");
      if (next === null) return;
      event.preventDefault();
      items[next]?.focus();
    },
  }));

  Alpine.data("nqFilterStrip", (initial: string | string[] = "", multiple = false) => ({
    value: initial,
    multiple,
    root: null as unknown as HTMLElement,
    init(this: StripState) {
      this.root = this.$el;
      this.$nextTick(() => this.reveal());
      this.$watch("value", () => requestAnimationFrame(() => this.reveal()));
    },
    pressed(this: StripState, v: string) {
      return Array.isArray(this.value) ? this.value.includes(v) : this.value === v;
    },
    toggle(this: StripState, v: string) {
      if (this.multiple) {
        const list = Array.isArray(this.value) ? this.value : [];
        this.value = list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
      } else this.value = v;
      this.root.dispatchEvent(new CustomEvent("nq-change", { bubbles: true, detail: { value: this.value } }));
    },
    /** Scroll the active chip to the middle of the strip. */
    reveal(this: StripState) {
      const box = this.root.querySelector<HTMLElement>("[data-filter-scroller]");
      const chip = box?.querySelector<HTMLElement>("[aria-pressed='true']");
      if (!box || !chip) return;
      const rtl = getComputedStyle(box).direction === "rtl";
      const boxRect = box.getBoundingClientRect();
      const chipRect = chip.getBoundingClientRect();
      const fromStart = rtl ? boxRect.right - chipRect.right - box.scrollLeft : chipRect.left - boxRect.left + box.scrollLeft;
      const target = centerScroll(fromStart, chipRect.width, box.clientWidth, box.scrollWidth);
      box.scrollTo?.({ left: rtl ? -target : target, behavior: "smooth" });
    },
  }));

  Alpine.data("nqSwipeRow", (startCount = 0, endCount = 0, disabled = false) => ({
    state: "closed" as SwipeState,
    drag: null as number | null,
    startWidth: startCount * ACTION_WIDTH,
    endWidth: endCount * ACTION_WIDTH,
    disabled,
    gesture: null as Gesture | null,
    moved: false,
    root: null as unknown as HTMLElement,
    init(this: SwipeState_) {
      this.root = this.$el;
    },
    setOpen(this: SwipeState_, next: SwipeState) {
      if (next === this.state) return;
      this.state = next;
      this.root.dispatchEvent(new CustomEvent("nq-swipe-change", { bubbles: true, detail: { state: next } }));
    },
    /** The row's translateX in physical pixels. */
    px(this: SwipeState_) {
      const offset = this.drag ?? restOffset(this.state, this.startWidth, this.endWidth);
      return this.$nq.dir === "rtl" ? -offset : offset;
    },
    away(this: SwipeState_, event: Event) {
      if (this.state !== "closed" && !this.root.contains(event.target as Node)) this.setOpen("closed");
    },
    down(this: SwipeState_, event: PointerEvent) {
      if (this.disabled || (!this.startWidth && !this.endWidth) || event.pointerType === "mouse") return;
      this.gesture = { x: event.clientX, y: event.clientY, base: restOffset(this.state, this.startWidth, this.endWidth), t: event.timeStamp, horizontal: false, last: 0, velocity: 0 };
      this.moved = false;
    },
    move(this: SwipeState_, event: PointerEvent) {
      const g = this.gesture;
      if (!g) return;
      const dx = event.clientX - g.x;
      const dy = event.clientY - g.y;
      if (!g.horizontal) {
        if (isHorizontalIntent(dx, dy)) {
          g.horizontal = true;
          (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
        } else {
          if (Math.abs(dy) > 8) this.gesture = null;
          return;
        }
      }
      this.moved = true;
      const inline = g.base + toInlineOffset(dx, this.$nq.dir === "rtl");
      const dt = Math.max(1, event.timeStamp - g.t);
      g.velocity = (inline - g.last) / dt;
      g.last = inline;
      g.t = event.timeStamp;
      this.drag = clampSwipe(inline, this.startWidth, this.endWidth);
    },
    up(this: SwipeState_) {
      const g = this.gesture;
      this.gesture = null;
      if (!g || this.drag === null) return;
      const next = settleSwipe(this.drag, this.startWidth, this.endWidth, { velocity: g.velocity });
      this.drag = null;
      this.setOpen(next);
    },
    run(this: SwipeState_, id: string) {
      this.setOpen("closed");
      this.root.dispatchEvent(new CustomEvent("nq-swipe-action", { bubbles: true, detail: { id } }));
    },
    /** A drag must not count as a tap on the row's own link or button, and a tap on an open row closes it. */
    clickCapture(this: SwipeState_, event: MouseEvent) {
      if (this.moved) {
        event.preventDefault();
        event.stopPropagation();
        this.moved = false;
      } else if (this.state !== "closed" && !(event.target as HTMLElement).closest("[data-slot=swipe-actions]")) {
        event.preventDefault();
        event.stopPropagation();
        this.setOpen("closed");
      }
    },
  }));
};
