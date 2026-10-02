// The behaviour of the Blade feedback-reporter parts. Three Alpine data objects:
//
//   nqFeedbackHub()                 the status filter and the "Me too" vote of feedback-reporter.hub
//   nqFeedbackConfigurator(config)  the live launcher preview and install code of feedback-reporter.configurator
//   nqShakeReport(config)           the shake detector and the sheet of feedback-reporter.shake-sheet
//
// Events, all bubbling from the part's root (Alpine's $dispatch from teleported content would not reach it, so the root is stored in init):
//   nq-report-new, nq-open-issue (detail.id), nq-feedback-vote (detail.id, detail.waitUntil(promise); resolve { error } to fail),
//   nq-feedback-config (detail { shape, position, label }), nq-report, nq-shake-enabled (detail.enabled).

import {
  feedbackInstallSnippet,
  isShake,
  motionDelta,
  normalizePosition,
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
}
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
  Alpine.data("nqFeedbackHub", () => ({
    root: undefined as HTMLElement | undefined,
    filter: ["all"] as string[],
    busy: null as number | null,
    init(this: HubState) {
      this.root = this.$el;
    },
    /** The active status; deselecting everything means all. */
    current(): string {
      return (this as unknown as HubState).filter[0] ?? "all";
    },
    shows(status: string): boolean {
      const now = (this as unknown as { current(): string }).current();
      return now === "all" || now === status;
    },
    visible(): number {
      const self = this as unknown as HubState & { current(): string };
      const now = self.current();
      const rows = [...(self.root ?? self.$el).querySelectorAll<HTMLElement>("li[data-status]")];
      return rows.filter((li) => now === "all" || li.dataset.status === now).length;
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
