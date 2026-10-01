// nqResizable: panels split by draggable, keyboard-operable handles. The markup is the React ResizablePanelGroup's.
//
//   <div data-slot="resizable-group" x-data="nqResizable({ orientation: 'horizontal' })" style="display:flex;overflow:hidden" class="size-full">
//     <div data-slot="resizable-panel" data-default-size="30%" data-min-size="15%" style="flex:30 1 0px;overflow:hidden">Nav</div>
//     <div data-slot="resizable-handle" role="separator" tabindex="0" aria-label="Resize panels" class="…"></div>
//     <div data-slot="resizable-panel" data-default-size="70%" style="flex:70 1 0px;overflow:hidden">Content</div>
//   </div>
//
// Sizes are percentages that add up to 100. Panel attributes: data-default-size, data-min-size, data-max-size,
// data-collapsed-size (each "30%", "240px", "20rem" or a bare number of pixels) and data-collapsible. A handle takes arrow keys
// (10% steps, flipped in RTL for a horizontal group), Home / End (the previous panel to its limits), Enter (collapse or
// restore a collapsible neighbour) and the pointer. Handles carry data-separator = inactive | hover | active | disabled for the React classes.
// The layout is saved under `nq-resizable:<id>` in localStorage when the group has an id; it fires `nq-layout` with the sizes.

import type { Magics, Register } from "./types";

export interface ResizableOptions {
  orientation?: "horizontal" | "vertical";
  /** Persist the layout under this key. */
  id?: string | null;
  /** Arrow-key step in percent. Default 10. */
  keyboardResizeBy?: number;
}

interface Constraints {
  min: number;
  max: number;
  collapsible: boolean;
  collapsed: number;
}

const EPS = 0.01;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** "30%" -> 30, "240px" or 240 -> px / total, "20rem" -> 16 * 20px / total. */
function toPercent(raw: string | null | undefined, total: number): number | undefined {
  if (raw == null || raw === "") return undefined;
  const m = /^\s*(-?\d*\.?\d+)\s*(%|px|rem|em)?\s*$/.exec(raw);
  if (!m) return undefined;
  const n = Number(m[1]);
  const unit = m[2] ?? "px";
  if (unit === "%") return n;
  return total > 0 ? ((unit === "px" ? n : n * 16) / total) * 100 : undefined;
}

export const resizable: Register = (Alpine) => {
  Alpine.data("nqResizable", (options: ResizableOptions = {}) => {
    const cleanups: Array<() => void> = [];
    return {
      sizes: [] as number[],
      init(this: Magics & { sizes: number[] }) {
        const root = this.$el;
        const horizontal = (options.orientation ?? "horizontal") === "horizontal";
        const step = options.keyboardResizeBy ?? 10;
        const children = [...root.children] as HTMLElement[];
        const panels = children.filter((c) => c.dataset.slot === "resizable-panel");
        const handles = children.filter((c) => c.dataset.slot === "resizable-handle");
        if (panels.length < 2) return;

        const total = () => {
          const size = (el: HTMLElement) => (horizontal ? el.offsetWidth : el.offsetHeight);
          const sum = panels.reduce((acc, p) => acc + size(p), 0);
          return sum || size(root);
        };
        const isRtl = () => horizontal && getComputedStyle(root).direction === "rtl";

        const px = total();
        const constraints: Constraints[] = panels.map((p) => ({
          min: toPercent(p.dataset.minSize, px) ?? 0,
          max: toPercent(p.dataset.maxSize, px) ?? 100,
          collapsible: p.hasAttribute("data-collapsible"),
          collapsed: toPercent(p.dataset.collapsedSize, px) ?? 0,
        }));

        // Initial sizes: the saved layout, else the declared defaults, the rest shared out equally.
        let sizes: number[] | undefined;
        if (options.id) {
          try {
            const saved = JSON.parse(localStorage.getItem(`nq-resizable:${options.id}`) ?? "null");
            if (Array.isArray(saved) && saved.length === panels.length && saved.every((n) => typeof n === "number")) sizes = saved;
          } catch {
            sizes = undefined;
          }
        }
        if (!sizes) {
          const declared = panels.map((p) => toPercent(p.dataset.defaultSize, px));
          const taken = declared.reduce<number>((a, d) => a + (d ?? 0), 0);
          const free = declared.filter((d) => d === undefined).length;
          const share = free ? Math.max(0, 100 - taken) / free : 0;
          sizes = declared.map((d) => d ?? share);
          const sum = sizes.reduce((a, b) => a + b, 0);
          if (sum > 0 && Math.abs(sum - 100) > EPS) sizes = sizes.map((s) => (s / sum) * 100);
        }

        const stash = new Map<number, number>(); // size before collapse, per panel
        let hovering = -1;
        let dragging = -1;

        const paint = () => {
          panels.forEach((p, i) => {
            if (!p.id) p.id = `nq-resizable-panel-${Math.random().toString(36).slice(2, 8)}`;
            p.style.flex = `${sizes![i]} 1 0px`;
            p.style.overflow = "hidden";
          });
          handles.forEach((h, i) => {
            const prev = panels[i];
            const c = constraints[i];
            if (!prev || !c) return;
            h.setAttribute("aria-valuenow", String(Math.round(sizes![i] ?? 0)));
            h.setAttribute("aria-valuemin", String(Math.round(c.min)));
            h.setAttribute("aria-valuemax", String(Math.round(c.max)));
            h.setAttribute("aria-controls", prev.id);
            const disabled = h.hasAttribute("data-disabled");
            h.dataset.separator = disabled ? "disabled" : dragging === i ? "active" : hovering === i ? "hover" : "inactive";
          });
        };

        const commit = (next: number[], notify = true) => {
          sizes = next;
          this.sizes = next;
          paint();
          if (!notify) return;
          if (options.id) {
            try {
              localStorage.setItem(`nq-resizable:${options.id}`, JSON.stringify(next));
            } catch {
              // storage blocked: the layout still applies for this page
            }
          }
          root.dispatchEvent(new CustomEvent("nq-layout", { bubbles: true, detail: { sizes: next } }));
        };

        /** Moves the divider after panel `i` by `delta` percent from the layout `from`. */
        const resize = (i: number, delta: number, from: number[]) => {
          const a = constraints[i]!;
          const b = constraints[i + 1]!;
          const sa = from[i]!;
          const sb = from[i + 1]!;
          let nextA = sa + delta;
          let nextB = sb - delta;
          // A collapsible panel snaps shut once it is dragged past half way to its collapsed size.
          const snap = (size: number, c: Constraints) => (c.collapsible && size < c.min && size < (c.collapsed + c.min) / 2 ? c.collapsed : size);
          nextA = snap(nextA, a);
          nextB = snap(nextB, b);
          if (nextA === a.collapsed && a.collapsible && sa + delta < a.min) nextB = sa + sb - nextA;
          else if (nextB === b.collapsed && b.collapsible && sb - delta < b.min) nextA = sa + sb - nextB;
          const lo = Math.max(a.collapsible ? a.collapsed : a.min, sa + sb - b.max);
          const hi = Math.min(a.max, sa + sb - (b.collapsible ? b.collapsed : b.min));
          nextA = clamp(nextA, lo, Math.max(lo, hi));
          nextB = sa + sb - nextA;
          const out = [...from];
          out[i] = nextA;
          out[i + 1] = nextB;
          commit(out);
        };

        const toggleCollapse = (i: number) => {
          const target = [i, i + 1].find((k) => constraints[k]?.collapsible);
          if (target === undefined) return;
          const c = constraints[target]!;
          const size = sizes![target]!;
          const isCollapsed = size <= c.collapsed + EPS;
          const neighbour = target === i ? i + 1 : i;
          const out = [...sizes!];
          if (isCollapsed) {
            const back = stash.get(target) ?? Math.max(c.min, 25);
            out[target] = back;
            out[neighbour] = out[neighbour]! + size - back;
          } else {
            stash.set(target, size);
            out[target] = c.collapsed;
            out[neighbour] = out[neighbour]! + size - c.collapsed;
          }
          commit(out);
        };

        handles.forEach((h, i) => {
          let start: { pos: number; sizes: number[]; px: number } | null = null;
          const pos = (e: PointerEvent) => (horizontal ? e.clientX : e.clientY);
          const on = <K extends keyof HTMLElementEventMap>(type: K, fn: (e: HTMLElementEventMap[K]) => void) => {
            h.addEventListener(type, fn as EventListener);
            cleanups.push(() => h.removeEventListener(type, fn as EventListener));
          };
          on("pointerenter", () => {
            hovering = i;
            paint();
          });
          on("pointerleave", () => {
            if (hovering === i) hovering = -1;
            paint();
          });
          on("pointerdown", (e) => {
            if (h.hasAttribute("data-disabled") || (e.pointerType === "mouse" && e.button !== 0)) return;
            e.preventDefault();
            h.setPointerCapture?.(e.pointerId);
            start = { pos: pos(e), sizes: [...sizes!], px: total() };
            dragging = i;
            paint();
          });
          on("pointermove", (e) => {
            if (!start) return;
            const dx = pos(e) - start.pos;
            const delta = (start.px > 0 ? (dx / start.px) * 100 : 0) * (isRtl() ? -1 : 1);
            resize(i, delta, start.sizes);
          });
          const end = (e: PointerEvent) => {
            if (!start) return;
            start = null;
            if (h.hasPointerCapture?.(e.pointerId)) h.releasePointerCapture(e.pointerId);
            dragging = -1;
            paint();
          };
          on("pointerup", end);
          on("pointercancel", end);
          on("keydown", (e) => {
            if (h.hasAttribute("data-disabled")) return;
            const forward = horizontal ? (isRtl() ? "ArrowLeft" : "ArrowRight") : "ArrowDown";
            const back = horizontal ? (isRtl() ? "ArrowRight" : "ArrowLeft") : "ArrowUp";
            let delta: number | null = null;
            if (e.key === forward) delta = step;
            else if (e.key === back) delta = -step;
            else if (e.key === "Home") delta = -100;
            else if (e.key === "End") delta = 100;
            else if (e.key === "Enter") {
              e.preventDefault();
              toggleCollapse(i);
              return;
            }
            if (delta === null) return;
            e.preventDefault();
            resize(i, delta, sizes!);
          });
        });

        commit(sizes, false);
      },
      destroy() {
        for (const fn of cleanups.splice(0)) fn();
      },
    };
  });
};
