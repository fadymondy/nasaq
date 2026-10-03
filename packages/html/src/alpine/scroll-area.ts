// nqScrollArea: a native scroller with a thin custom scrollbar. The viewport scrolls natively (keyboard, wheel, touch);
// this only sizes and moves the thumbs, and sets data-hovering / data-scrolling on the scrollbars for the fade.
//
//   <div x-data="nqScrollArea()" class="relative overflow-hidden h-64">
//     <div x-ref="viewport" role="region" tabindex="0" aria-label="Activity" class="size-full overflow-auto [scrollbar-width:none]">...</div>
//     <div x-ref="barY" data-orientation="vertical" x-bind="bar" class="absolute inset-y-0 end-0 ..."><div x-ref="thumbY" x-bind="thumb"></div></div>
//   </div>
//
// Refs: viewport, and per axis barY/thumbY and barX/thumbX. A bar with no overflow gets `hidden`.

import type { Magics, Register } from "./types";

export interface ScrollAreaState extends Magics {
  hovering: boolean;
  scrolling: boolean;
  update(): void;
  bar: Record<string, unknown>;
  thumb: Record<string, unknown>;
}

const MIN_THUMB = 18;

export const scrollArea: Register = (Alpine) => {
  Alpine.data("nqScrollArea", () => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    return {
      hovering: false,
      scrolling: false,
      init(this: ScrollAreaState) {
        const viewport = this.$refs.viewport;
        if (!viewport) return;
        const update = () => this.update();
        viewport.addEventListener("scroll", () => {
          this.scrolling = true;
          clearTimeout(timer);
          timer = setTimeout(() => (this.scrolling = false), 600);
          update();
        });
        if (typeof ResizeObserver !== "undefined") {
          const ro = new ResizeObserver(update);
          ro.observe(viewport);
          for (const child of Array.from(viewport.children)) ro.observe(child);
        }
        this.$nextTick(update);
      },
      /** Sizes and positions both thumbs from the viewport's scroll metrics. */
      update(this: ScrollAreaState) {
        const v = this.$refs.viewport as HTMLElement;
        if (!v) return;
        const axes = [
          { bar: this.$refs.barY, thumb: this.$refs.thumbY, client: v.clientHeight, scroll: v.scrollHeight, pos: v.scrollTop, prop: "height", y: true },
          { bar: this.$refs.barX, thumb: this.$refs.thumbX, client: v.clientWidth, scroll: v.scrollWidth, pos: Math.abs(v.scrollLeft), prop: "width", y: false },
        ];
        const rtl = getComputedStyle(v).direction === "rtl";
        for (const a of axes) {
          if (!a.bar || !a.thumb) continue;
          const overflow = a.scroll > a.client + 1;
          a.bar.hidden = !overflow;
          if (!overflow) continue;
          const track = a.y ? a.bar.clientHeight || a.client : a.bar.clientWidth || a.client;
          const size = Math.max(MIN_THUMB, (a.client / a.scroll) * track);
          const max = a.scroll - a.client;
          const offset = (a.pos / max) * (track - size);
          a.thumb.style.setProperty(a.prop, `${size}px`);
          a.thumb.style.transform = a.y ? `translateY(${offset}px)` : `translateX(${rtl ? -offset : offset}px)`;
        }
      },
      /** Bind on each scrollbar: hover and scrolling state, and click on the track to page. */
      bar: {
        ":data-hovering"(this: ScrollAreaState) {
          return this.hovering ? "" : undefined;
        },
        ":data-scrolling"(this: ScrollAreaState) {
          return this.scrolling ? "" : undefined;
        },
      },
      /** Bind on each thumb: drag to scroll. */
      thumb: {
        "x-on:pointerdown"(this: ScrollAreaState, event: PointerEvent) {
          const thumb = event.currentTarget as HTMLElement;
          const bar = thumb.parentElement as HTMLElement;
          const v = this.$refs.viewport as HTMLElement;
          const y = bar.dataset.orientation !== "horizontal";
          const rtl = getComputedStyle(v).direction === "rtl";
          const start = y ? event.clientY : event.clientX;
          const from = y ? v.scrollTop : v.scrollLeft;
          const track = (y ? bar.clientHeight : bar.clientWidth) - (y ? thumb.offsetHeight : thumb.offsetWidth);
          const max = y ? v.scrollHeight - v.clientHeight : v.scrollWidth - v.clientWidth;
          const move = (e: PointerEvent) => {
            if (track <= 0) return;
            const delta = ((y ? e.clientY : e.clientX) - start) * (max / track) * (!y && rtl ? -1 : 1);
            if (y) v.scrollTop = from + delta;
            else v.scrollLeft = from + delta;
          };
          const up = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
          };
          window.addEventListener("pointermove", move);
          window.addEventListener("pointerup", up);
          event.preventDefault();
        },
      },
    };
  });
};
