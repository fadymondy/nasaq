// nqArtifactActions and nqArtifactPicker: the two interactive parts of the artifact renderer. The artifact is validated and rendered on the
// server (Blade); these only hold the state of a button row (busy, confirm dialog, error) and of a picker (choice, busy, sent, error).
//
//   <div x-data="nqArtifactActions({ artifactId: 'order-42', failed: '…', actions: [{ id: 'refund', label: 'Refund', confirm: 'Refund?', danger: true }] })"
//        x-on:nq-artifact-action="$event.detail.waitUntil(run($event.detail.id))"> … </div>
//
// Pressing a button (after its confirmation) dispatches from the element, bubbling:
//   nq-artifact-action  detail: { id, artifactId, waitUntil(promise) }
//   nq-artifact-pick    detail: { values, artifactId, waitUntil(promise) }
// Hand the work to waitUntil. A promise that resolves { error: "…" }, or rejects, shows the message and lets the user try again;
// anything else counts as done (a picker then shows "Sent"). Without a listener the press just completes.

import type { Magics, Register } from "./types";

interface ChartTip {
  heading: string;
  rows: { color: string; label: string; text: string }[];
}

interface ChartState {
  tips: ChartTip[];
  hover: number | null;
  px: number;
  py: number;
}

interface ActionConfig {
  id: string;
  label: string;
  confirm: string | null;
  danger: boolean;
}

interface ActionsConfig {
  artifactId?: string | null;
  failed?: string;
  actions: ActionConfig[];
}

interface PickerConfig {
  artifactId?: string | null;
  multiple: boolean;
  /** Every option value, in order. */
  options: string[];
  /** The values chosen at first. */
  value: string[];
  failed?: string;
}

/** Dispatches `event` from `root` and waits for whatever the listeners hand to waitUntil. Resolves "" on success, or the message. */
async function dispatchAndWait(root: HTMLElement | undefined, event: string, detail: Record<string, unknown>, failed: string): Promise<string> {
  const pending: unknown[] = [];
  root?.dispatchEvent(new CustomEvent(event, { bubbles: true, detail: { ...detail, waitUntil: (p: unknown) => void pending.push(p) } }));
  try {
    const results = await Promise.all(pending);
    const bad = results.find((r) => r && typeof r === "object" && (r as { error?: string }).error) as { error: string } | undefined;
    return bad ? bad.error : "";
  } catch (e) {
    return e instanceof Error && e.message ? e.message : failed;
  }
}

interface ActionsState extends Magics {
  busy: number | null;
  error: string;
  confirmOpen: boolean;
  asking: number | null;
  run(index: number): Promise<void>;
}

interface PickerState extends Magics {
  one: string | null;
  sel: boolean[];
  busy: boolean;
  sent: boolean;
  error: string;
  values: string[];
  cannotSend: boolean;
}

export const artifactRenderer: Register = (Alpine) => {
  // nqArtifactChart: the hover tooltip of a chart (the same look as <x-nq::chart.tooltip>). It follows the pointer inside the plot.
  //   <div class="relative" x-data="nqArtifactChart([{ heading, rows: [{ color, label, text }] }])" x-on:pointermove="move($event)" x-on:pointerleave="leave()">
  //     a shape with x-on:pointerenter="show(i)" per point or slice, and the tooltip with x-show="hover !== null"
  Alpine.data("nqArtifactChart", (tips: ChartTip[] = []) => ({
    tips,
    hover: null as number | null,
    px: 0,
    py: 0,
    get tip(): ChartTip {
      const s = this as unknown as ChartState;
      return s.tips[s.hover ?? 0] ?? { heading: "", rows: [] };
    },
    /** Beside the pointer; flipped to its other side near the end of the plot so it stays inside. */
    get tipStyle() {
      const s = this as unknown as ChartState & Magics;
      const w = s.$el.getBoundingClientRect().width;
      const flip = w > 0 && s.px > w - 180;
      return { left: `${s.px + (flip ? -12 : 12)}px`, top: `${Math.max(0, s.py - 8)}px`, transform: flip ? "translateX(-100%)" : "none" };
    },
    show(this: ChartState, i: number) {
      this.hover = i;
    },
    move(this: ChartState & Magics, event: PointerEvent) {
      const box = this.$el.getBoundingClientRect();
      this.px = event.clientX - box.left;
      this.py = event.clientY - box.top;
    },
    leave(this: ChartState) {
      this.hover = null;
    },
  }));

  Alpine.data("nqArtifactActions", (config: ActionsConfig) => {
    let root: HTMLElement | undefined;
    const none = { label: "", confirm: "", danger: false };
    return {
      /** Index of the action running, or null. */
      busy: null as number | null,
      error: "",
      confirmOpen: false,
      /** Index of the action waiting for confirmation. Kept while the dialog closes so its text does not blank out. */
      asking: null as number | null,
      init(this: ActionsState) {
        root = this.$el;
      },
      /** The text of the confirmation dialog. */
      get ask() {
        const a = (this as unknown as ActionsState).asking;
        const found = a === null ? undefined : config.actions[a];
        return found ? { label: found.label, confirm: found.confirm ?? "", danger: found.danger } : none;
      },
      /** Another action is running, so this one waits. */
      blocked(this: ActionsState, index: number) {
        return this.busy !== null && this.busy !== index;
      },
      press(this: ActionsState, index: number) {
        if (this.busy !== null) return;
        if (config.actions[index]?.confirm) {
          this.asking = index;
          this.confirmOpen = true;
        } else void this.run(index);
      },
      cancel(this: ActionsState) {
        this.confirmOpen = false;
      },
      confirmed(this: ActionsState) {
        const index = this.asking;
        this.confirmOpen = false;
        if (index !== null) void this.run(index);
      },
      async run(this: ActionsState, index: number) {
        const action = config.actions[index];
        if (!action || this.busy !== null) return;
        this.busy = index;
        this.error = "";
        this.error = await dispatchAndWait(root, "nq-artifact-action", { id: action.id, artifactId: config.artifactId ?? null }, config.failed ?? "That did not work. Try again.");
        this.busy = null;
      },
    };
  });

  Alpine.data("nqArtifactPicker", (config: PickerConfig) => {
    let root: HTMLElement | undefined;
    return {
      /** The chosen value in single mode. */
      one: (config.value[0] ?? null) as string | null,
      /** One boolean per option in multiple mode. */
      sel: config.options.map((v) => config.value.includes(v)),
      busy: false,
      sent: false,
      error: "",
      init(this: PickerState) {
        root = this.$el;
      },
      get values(): string[] {
        const s = this as unknown as PickerState;
        return config.multiple ? config.options.filter((_, i) => s.sel[i]) : s.one === null || s.one === undefined || s.one === "" ? [] : [String(s.one)];
      },
      /** Locked while sending and once sent. */
      get locked(): boolean {
        const s = this as unknown as PickerState;
        return s.busy || s.sent;
      },
      get cannotSend(): boolean {
        const s = this as unknown as PickerState;
        return s.busy || s.sent || s.values.length === 0;
      },
      async submit(this: PickerState) {
        if (this.cannotSend) return;
        this.busy = true;
        this.error = "";
        const message = await dispatchAndWait(root, "nq-artifact-pick", { values: this.values, artifactId: config.artifactId ?? null }, config.failed ?? "That did not work. Try again.");
        this.error = message;
        if (!message) this.sent = true;
        this.busy = false;
      },
    };
  });
};
