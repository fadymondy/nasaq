// The behaviour of the Blade feedback-reporter parts. Three Alpine data objects:
//
//   nqFeedbackLauncher(config)      the drag, keyboard move and saved spot of a movable feedback-reporter launcher
//   nqFeedbackHub(config)           the status / Mine filter, "Load more" and the "Me too" vote of feedback-reporter.hub
//   nqFeedbackConfigurator(config)  the live launcher preview and install code of feedback-reporter.configurator
//   nqShakeReport(config)           the shake detector and the sheet of feedback-reporter.shake-sheet
//
// Events, all bubbling from the part's root (Alpine's $dispatch from teleported content would not reach it, so the root is stored in init):
//   nq-feedback-spot (detail { side, y }, from a movable launcher), nq-feedback-filter (detail.filter), nq-load-more (detail.waitUntil(promise)),
//   nq-report-new, nq-open-issue (detail.id), nq-feedback-vote (detail.id, detail.waitUntil(promise); resolve { error } to fail),
//   nq-feedback-config (detail { shape, position, label }), nq-report, nq-shake-enabled (detail.enabled).

import {
  feedbackInstallSnippet,
  isShake,
  moveLauncherSpot,
  motionDelta,
  normalizePosition,
  parseLauncherSpot,
  snapLauncherSpot,
  spotFromPosition,
  type FeedbackLauncherSpot,
  type FeedbackLauncherConfig,
  type FeedbackLauncherPosition,
  type FeedbackLauncherShape,
} from "./feedback-reporter-logic";
import type { Magics, Register } from "./types";


function emit(root: HTMLElement | undefined, el: HTMLElement, event: string, detail: Record<string, unknown> = {}): unknown[] {
  const waits: unknown[] = [];
  (root ?? el).dispatchEvent(new CustomEvent(event, { bubbles: true, detail: { ...detail, waitUntil: (p: unknown) => void waits.push(p) } }));
  return waits;
}

interface HubState extends Magics {
  root: HTMLElement | undefined;
  filter: string[];
  busy: number | null;
  counts: Record<string, number>;
  template: string;
  loadingMore: boolean;
  last: string;
}
interface LauncherConfig {
  storageKey?: string | null;
  spot?: FeedbackLauncherSpot | null;
  position?: FeedbackLauncherPosition;
  placement?: "fixed" | "absolute";
  shape?: FeedbackLauncherShape;
  /** The class of the fixed position (for example "bottom-4 end-4"), dropped once the launcher has a spot. */
  positionClass?: string;
}
interface LauncherState extends Magics {
  spot: FeedbackLauncherSpot | null;
  dragAt: { left: number; top: number } | null;
  drag: { id: number; startX: number; startY: number; offX: number; offY: number; moved: boolean } | null;
  swallow: boolean;
  where: FeedbackLauncherPosition;
  area(): { left: number; top: number; width: number; height: number };
  isRtl(): boolean;
  commit(next: FeedbackLauncherSpot): void;
}
const DRAG_THRESHOLD = 4;
interface ConfigState extends Magics {
  root: HTMLElement | undefined;
  shape: FeedbackLauncherShape;
  position: FeedbackLauncherPosition;
  label: string;
  fallback: string;
  shapeV: string[];
  posV: string[];
  copied: string;
  classes: { position: Record<string, string>; shape: Record<string, string>; tabEnd: string; tabStart: string; tabText: string };
  readonly effective: FeedbackLauncherPosition;
  notify(): void;
}
interface ShakeConfig {
  enabled?: boolean;
  threshold?: number;
  jolts?: number;
  cooldown?: number;
}
interface ShakeState extends Magics {
  root: HTMLElement | undefined;
  shown: boolean;
  enabled: boolean;
  supported: boolean;
  permission: "unknown" | "granted" | "denied";
  threshold: number;
  jolts: number;
  cooldown: number;
  stop: (() => void) | undefined;
  listen(): void;
}
interface MotionPermissionEvent {
  requestPermission?: () => Promise<"granted" | "denied">;
}

export const feedbackReporter: Register = (Alpine) => {
  Alpine.data("nqFeedbackLauncher", (config: LauncherConfig = {}) => ({
    spot: (config.spot ?? null) as FeedbackLauncherSpot | null,
    dragAt: null as { left: number; top: number } | null,
    drag: null as LauncherState["drag"],
    swallow: false,
    where: (config.position ?? "bottom-end") as FeedbackLauncherPosition,
    init(this: LauncherState) {
      // Read the saved spot after the first paint, so the server and client markup agree.
      if (config.spot || !config.storageKey || typeof localStorage === "undefined") return;
      const saved = parseLauncherSpot(localStorage.getItem(config.storageKey));
      if (saved) this.spot = saved;
    },
    /** The classes the spot decides: the fixed position, or the middle-anchored translate and the dragging cursor. */
    get classes(): Record<string, boolean> {
      const self = this as unknown as LauncherState;
      const out: Record<string, boolean> = {
        "cursor-grabbing select-none": !!self.dragAt,
        "-translate-y-1/2": !self.dragAt && !!self.spot,
      };
      if (config.positionClass) out[config.positionClass] = !self.dragAt && !self.spot;
      if (config.shape === "tab") {
        const end = self.spot ? self.spot.side === "end" : self.where.endsWith("end");
        out["rounded-s-card"] = end;
        out["rounded-e-card"] = !end;
      }
      return out;
    },
    get placed(): Record<string, string> {
      const self = this as unknown as LauncherState;
      if (self.dragAt) return { left: `${self.dragAt.left}px`, top: `${self.dragAt.top}px`, transition: "none" };
      if (!self.spot) return {};
      return { top: `${self.spot.y * 100}%`, [self.spot.side === "end" ? "inset-inline-end" : "inset-inline-start"]: config.shape === "tab" ? "0px" : "1rem" };
    },
    area(this: LauncherState) {
      const el = this.$el as HTMLElement;
      const parent = config.placement === "absolute" ? el.offsetParent : null;
      return parent ? parent.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    },
    isRtl(this: LauncherState) {
      const el = this.$el as HTMLElement;
      return getComputedStyle(el).direction === "rtl" || el.closest("[dir]")?.getAttribute("dir") === "rtl";
    },
    commit(this: LauncherState, next: FeedbackLauncherSpot) {
      this.spot = next;
      if (config.storageKey && typeof localStorage !== "undefined") localStorage.setItem(config.storageKey, JSON.stringify(next));
      emit(undefined, this.$el as HTMLElement, "nq-feedback-spot", { ...next });
    },
    down(this: LauncherState, e: PointerEvent) {
      if (e.defaultPrevented || e.button !== 0) return;
      const box = (this.$el as HTMLElement).getBoundingClientRect();
      this.drag = { id: e.pointerId, startX: e.clientX, startY: e.clientY, offX: e.clientX - box.left, offY: e.clientY - box.top, moved: false };
    },
    move(this: LauncherState, e: PointerEvent) {
      const d = this.drag;
      if (!d || d.id !== e.pointerId) return;
      const el = this.$el as HTMLElement;
      if (!d.moved) {
        if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < DRAG_THRESHOLD) return;
        d.moved = true;
        el.setPointerCapture?.(e.pointerId);
      }
      const box = this.area();
      this.dragAt = {
        left: Math.min(Math.max(e.clientX - d.offX - box.left, 0), box.width - el.offsetWidth),
        top: Math.min(Math.max(e.clientY - d.offY - box.top, 0), box.height - el.offsetHeight),
      };
    },
    up(this: LauncherState, e: PointerEvent) {
      const d = this.drag;
      this.drag = null;
      if (!d?.moved || d.id !== e.pointerId) return;
      this.swallow = true;
      const el = this.$el as HTMLElement;
      const box = this.area();
      const center = { x: e.clientX - d.offX - box.left + el.offsetWidth / 2, y: e.clientY - d.offY - box.top + el.offsetHeight / 2 };
      this.dragAt = null;
      this.commit(snapLauncherSpot(center, box, this.isRtl(), el.offsetHeight));
    },
    cancel(this: LauncherState) {
      this.drag = null;
      this.dragAt = null;
    },
    key(this: LauncherState, e: KeyboardEvent) {
      if (e.defaultPrevented || !e.altKey) return;
      const rtl = this.isRtl();
      const move = e.key === "ArrowUp" ? "up" : e.key === "ArrowDown" ? "down" : e.key === "ArrowLeft" ? (rtl ? "end" : "start") : e.key === "ArrowRight" ? (rtl ? "start" : "end") : null;
      if (!move) return;
      e.preventDefault();
      this.commit(moveLauncherSpot(this.spot ?? spotFromPosition(this.where), move));
    },
    /** Runs first on click (capture): a drag ends with a click that must not open the report. */
    click(this: LauncherState, e: MouseEvent) {
      if (!this.swallow) return;
      this.swallow = false;
      e.preventDefault();
      e.stopImmediatePropagation();
    },
  }));

  Alpine.data("nqFeedbackHub", (config: { counts?: Record<string, number>; showing?: string } = {}) => ({
    root: undefined as HTMLElement | undefined,
    filter: ["all"] as string[],
    busy: null as number | null,
    counts: config.counts ?? {},
    template: config.showing ?? "Showing {shown} of {total}",
    loadingMore: false,
    last: "all",
    init(this: HubState) {
      this.root = this.$el;
      this.$watch("filter", () => {
        const now = (this as unknown as { current(): string }).current();
        if (now === this.last) return;
        this.last = now;
        emit(this.root, this.$el, "nq-feedback-filter", { filter: now });
      });
    },
    /** The active status; deselecting everything means all. */
    current(): string {
      return (this as unknown as HubState).filter[0] ?? "all";
    },
    shows(status: string, mine = false): boolean {
      const now = (this as unknown as { current(): string }).current();
      return now === "all" || now === status || (now === "mine" && mine);
    },
    visible(): number {
      const self = this as unknown as HubState & { current(): string };
      const now = self.current();
      const rows = [...(self.root ?? self.$el).querySelectorAll<HTMLElement>("li[data-status]")];
      return rows.filter((li) => now === "all" || li.dataset.status === now || (now === "mine" && li.dataset.mine !== undefined)).length;
    },
    /** "Showing {shown} of {total}": the rows on this tab against its server count. */
    showingText(): string {
      const self = this as unknown as HubState & { current(): string; visible(): number };
      const shown = self.visible();
      return self.template.replace("{shown}", String(shown)).replace("{total}", String(self.counts[self.current()] ?? shown));
    },
    async loadMore(this: HubState) {
      this.loadingMore = true;
      try {
        await Promise.all(emit(this.root, this.$el, "nq-load-more"));
      } catch {
        // The host shows its own error; the button just becomes usable again.
      } finally {
        this.loadingMore = false;
      }
    },
    blocked(index: number, fixed: boolean): boolean {
      return fixed || (this as unknown as HubState).busy === index;
    },
    reportNew(this: HubState) {
      emit(this.root, this.$el, "nq-report-new");
    },
    /** The id of the report in row `index`; the server renders it as data-id. */
    idAt(index: number): string {
      const self = this as unknown as HubState;
      return (self.root ?? self.$el).querySelectorAll<HTMLElement>("li[data-id]")[index]?.dataset.id ?? "";
    },
    open(this: HubState, index: number) {
      emit(this.root, this.$el, "nq-open-issue", { id: (this as unknown as { idAt(i: number): string }).idAt(index) });
    },
    async vote(this: HubState, index: number) {
      const id = (this as unknown as { idAt(i: number): string }).idAt(index);
      this.busy = index;
      try {
        await Promise.all(emit(this.root, this.$el, "nq-feedback-vote", { id }));
      } catch {
        // The host shows its own error; the button just becomes usable again.
      } finally {
        this.busy = null;
      }
    },
  }));

  Alpine.data("nqFeedbackConfigurator", (config: Partial<FeedbackLauncherConfig> & { fallback?: string; classes?: ConfigState["classes"] } = {}) => {
    const shape = config.shape ?? "pill";
    const position = config.position ?? "bottom-end";
    return {
      root: undefined as HTMLElement | undefined,
      shape,
      position,
      label: config.label ?? "",
      fallback: config.fallback ?? "Feedback",
      shapeV: [shape] as string[],
      posV: [normalizePosition(shape, position)] as string[],
      copied: "",
      classes: config.classes ?? { position: {}, shape: {}, tabEnd: "", tabStart: "", tabText: "" },
      init(this: ConfigState) {
        this.root = this.$el;
        this.$watch("shapeV", (v: string[]) => {
          if (!v[0] || v[0] === this.shape) return;
          this.shape = v[0] as FeedbackLauncherShape;
          this.posV = [this.effective];
          this.notify();
        });
        this.$watch("posV", (v: string[]) => {
          if (!v[0] || v[0] === this.effective) return;
          this.position = v[0] as FeedbackLauncherPosition;
          this.notify();
        });
        this.$watch("label", () => this.notify());
      },
      get effective(): FeedbackLauncherPosition {
        const self = this as unknown as ConfigState;
        return normalizePosition(self.shape, self.position);
      },
      get text(): string {
        const self = this as unknown as ConfigState;
        return self.label || self.fallback;
      },
      /** The classes the preview launcher needs besides its fixed ones: where it sits and what shape it has. */
      get launcherClass(): string {
        const self = this as unknown as ConfigState;
        const side = self.shape === "tab" ? (self.effective === "edge-end" ? self.classes.tabEnd : self.classes.tabStart) : "";
        return [self.classes.position[self.effective], self.classes.shape[self.shape], side].filter(Boolean).join(" ");
      },
      snippet(this: ConfigState, kind: "react" | "json"): string {
        return feedbackInstallSnippet({ shape: this.shape, position: this.position, label: this.label }, kind);
      },
      async copy(this: ConfigState, kind: "react" | "json") {
        try {
          await navigator.clipboard.writeText((this as unknown as { snippet(k: string): string }).snippet(kind));
          this.copied = kind;
          setTimeout(() => {
            if (this.copied === kind) this.copied = "";
          }, 1500);
        } catch {
          this.copied = "";
        }
      },
      notify(this: ConfigState) {
        emit(this.root, this.$el, "nq-feedback-config", { shape: this.shape, position: this.position, label: this.label });
      },
    };
  });

  Alpine.data("nqShakeReport", (config: ShakeConfig = {}) => ({
    root: undefined as HTMLElement | undefined,
    shown: false,
    enabled: config.enabled ?? true,
    supported: false,
    permission: "unknown" as "unknown" | "granted" | "denied",
    threshold: config.threshold ?? 18,
    jolts: config.jolts ?? 3,
    cooldown: config.cooldown ?? 3000,
    stop: undefined as (() => void) | undefined,
    init(this: ShakeState) {
      this.root = this.$el;
      this.supported = typeof DeviceMotionEvent !== "undefined";
      const request = (globalThis.DeviceMotionEvent as unknown as MotionPermissionEvent | undefined)?.requestPermission;
      this.permission = request ? "unknown" : "granted";
      this.listen();
      this.$watch("enabled", (on: boolean) => {
        this.listen();
        emit(this.root, this.$el, "nq-shake-enabled", { enabled: on });
      });
    },
    destroy(this: ShakeState) {
      this.stop?.();
    },
    show(this: ShakeState) {
      this.shown = true;
    },
    /** (Re)starts the devicemotion listener when shaking is on, supported and allowed. */
    listen(this: ShakeState) {
      this.stop?.();
      this.stop = undefined;
      if (!this.enabled || !this.supported || this.permission !== "granted") return;
      let last: { x: number; y: number; z: number } | null = null;
      let spikes: number[] = [];
      let quietUntil = 0;
      const onMotion = (e: DeviceMotionEvent) => {
        const a = e.accelerationIncludingGravity;
        if (!a || a.x == null || a.y == null || a.z == null) return;
        const now = Date.now();
        const next = { x: a.x, y: a.y, z: a.z };
        if (last && now >= quietUntil && motionDelta(last, next) > this.threshold) {
          spikes = [...spikes.filter((t) => now - t <= 1500), now];
          if (isShake(spikes, now, this.jolts)) {
            spikes = [];
            quietUntil = now + this.cooldown;
            this.shown = true;
          }
        }
        last = next;
      };
      window.addEventListener("devicemotion", onMotion);
      this.stop = () => window.removeEventListener("devicemotion", onMotion);
    },
    /** iOS only: ask for motion access from a tap, then listen. */
    async requestPermission(this: ShakeState) {
      const request = (globalThis.DeviceMotionEvent as unknown as MotionPermissionEvent | undefined)?.requestPermission;
      this.permission = request ? await request() : "granted";
      this.listen();
    },
    async report(this: ShakeState) {
      this.shown = false;
      emit(this.root, this.$el, "nq-report");
    },
  }));
};
