// nqServerCard: one server's card. The markup is the React ServerCard's, rendered by the server; the state lives here:
// the power state and which controls it allows, the snapshot list, the confirm dialog, the snapshot dialog and the limits editor.
//
//   <div data-slot="server-card" x-data="nqServerCard({ status, limits, snapshots, live, strings })"
//        @nq-power="$event.detail.wait(api.power($event.detail.action))"> … </div>
//
// It is presentational: the host does the work. Each action fires a bubbling event on the root with detail `{ …, wait(promise) }`:
//   nq-power            { action, wait }      start | stop | restart | force-stop, after the confirm for stop and force stop
//   nq-take-snapshot    { name, wait }        the name is empty when the user left it blank
//   nq-rollback         { snapshotId, wait }  after the confirm
//   nq-delete-snapshot  { snapshotId, wait }  after the confirm
//   nq-save-limits      { limits, wait }      { cpuCores, memoryMb, diskGb }, already validated
// Pass a promise to wait() to show the pending state; resolve `{ error }` (or reject) to show a message. Otherwise the card moves on:
// a power action sets the matching status (resolve `{ status }` to set another), a snapshot is added (resolve `{ snapshot: { id, name,
// sizeLabel } }` to name it) or removed, and new limits replace the old ones. Nobody calling wait() means nobody is handling it, and
// nothing changes.

import { LIMIT_RANGES, formatDisk, formatMemory, isTransitional, powerActionsFor, validateLimits, type PowerAction, type ServerLimitField, type ServerLimits, type ServerStatus } from "./server-card-logic";
import type { Magics, Register } from "./types";

interface SnapshotRow {
  id: string;
  name: string;
  sizeLabel: string;
  creating: boolean;
  when: string;
  iso: string;
}

interface Strings {
  status: Record<ServerStatus, string>;
  powerActions: Record<PowerAction, string>;
  powerConfirmTitle: string;
  powerConfirmBody: Record<PowerAction, string>;
  rollback: string;
  rollbackTitle: string;
  rollbackBody: string;
  remove: string;
  removeTitle: string;
  removeBody: string;
  coresOne: string;
  coresMany: string;
  limitIntegerError: string;
  limitRangeError: string;
  actionsFor: string;
  justNow: string;
  genericError: string;
}

interface Init {
  status: ServerStatus;
  limits: ServerLimits;
  snapshots?: SnapshotRow[];
  /** True when the server reports live metrics; they show while it runs. */
  metrics?: boolean;
  strings: Strings;
}

type Result = { error?: string; status?: ServerStatus; snapshot?: { id?: string; name?: string; sizeLabel?: string } } | void | undefined;
type Pending = { kind: "power"; action: PowerAction } | { kind: "rollback"; snap: SnapshotRow } | { kind: "delete"; snap: SnapshotRow };

const statusTone: Record<ServerStatus, string> = { running: "success", stopped: "neutral", starting: "info", stopping: "info", restarting: "info", provisioning: "info", suspended: "warning", error: "danger" };

interface ServerCardState extends Magics {
  status: ServerStatus;
  limits: ServerLimits;
  snapshots: SnapshotRow[];
  hasMetrics: boolean;
  strings: Strings;
  root: HTMLElement;
  busy: boolean;
  error: string | null;
  hasError: boolean;
  pending: Pending | null;
  confirmOpen: boolean;
  snapOpen: boolean;
  snapName: string;
  snapSaving: boolean;
  limitsOpen: boolean;
  limitsRaw: Record<ServerLimitField, string>;
  limitsTried: boolean;
  limitsSaving: boolean;
  ask(event: string, detail: Record<string, unknown>): Promise<Result> | null;
  run(event: string, detail: Record<string, unknown>, done: (result: Result) => void): Promise<boolean>;
  serverName(): string;
  actionsLabel(snap: SnapshotRow): string;
  powerNow(action: PowerAction): Promise<boolean>;
  setError(message: string | null): void;
}

export const serverCard: Register = (Alpine) => {
  Alpine.data("nqServerCard", (init: Init) => ({
    status: init.status,
    limits: { ...init.limits },
    snapshots: [...(init.snapshots ?? [])],
    hasMetrics: Boolean(init.metrics),
    strings: init.strings,
    root: null as unknown as HTMLElement,
    busy: false,
    error: null as string | null,
    hasError: false,
    pending: null as Pending | null,
    confirmOpen: false,
    snapOpen: false,
    snapName: "",
    snapSaving: false,
    limitsOpen: false,
    limitsRaw: { cpuCores: "", memoryMb: "", diskGb: "" } as Record<ServerLimitField, string>,
    limitsTried: false,
    limitsSaving: false,
    init(this: ServerCardState) {
      this.root = this.$el;
      // A dismissed error alert clears the message.
      this.$watch("hasError", (shown: boolean) => {
        if (!shown) this.error = null;
      });
    },

    // State the markup reads.
    get statusLabel(): string {
      const s = this as unknown as ServerCardState;
      return s.strings.status[s.status];
    },
    get tone(): string {
      return statusTone[(this as unknown as ServerCardState).status];
    },
    get transitional(): boolean {
      return isTransitional((this as unknown as ServerCardState).status);
    },
    get live(): boolean {
      const s = this as unknown as ServerCardState;
      return s.hasMetrics && (s.status === "running" || s.status === "error");
    },
    get coresLabel(): string {
      const s = this as unknown as ServerCardState;
      return s.limits.cpuCores === 1 ? s.strings.coresOne : s.strings.coresMany.replace("{n}", String(s.limits.cpuCores));
    },
    get memoryLabel(): string {
      return formatMemory((this as unknown as ServerCardState).limits.memoryMb);
    },
    get diskLabel(): string {
      return formatDisk((this as unknown as ServerCardState).limits.diskGb);
    },
    get confirmTitle(): string {
      const s = this as unknown as ServerCardState;
      const p = s.pending;
      if (!p) return "";
      if (p.kind === "power") return s.strings.powerConfirmTitle.replace("{action}", s.strings.powerActions[p.action]).replace("{name}", s.serverName());
      return (p.kind === "rollback" ? s.strings.rollbackTitle : s.strings.removeTitle).replace("{name}", p.snap.name);
    },
    get confirmBody(): string {
      const s = this as unknown as ServerCardState;
      const p = s.pending;
      if (!p) return "";
      return p.kind === "power" ? s.strings.powerConfirmBody[p.action] : p.kind === "rollback" ? s.strings.rollbackBody : s.strings.removeBody;
    },
    get confirmLabel(): string {
      const s = this as unknown as ServerCardState;
      const p = s.pending;
      if (!p) return "";
      return p.kind === "power" ? s.strings.powerActions[p.action] : p.kind === "rollback" ? s.strings.rollback : s.strings.remove;
    },
    serverName(this: ServerCardState): string {
      return this.root?.dataset.serverName ?? "";
    },
    actionsLabel(this: ServerCardState, snap: SnapshotRow): string {
      return this.strings.actionsFor.replace("{name}", snap.name);
    },
    allows(this: ServerCardState, action: PowerAction): boolean {
      return powerActionsFor(this.status).includes(action);
    },
    limitInvalid(this: ServerCardState, key: ServerLimitField): boolean {
      return this.limitsTried && Boolean(validateLimits(this.limitsRaw).errors[key]);
    },
    limitError(this: ServerCardState, key: ServerLimitField): string {
      const kind = this.limitsTried ? validateLimits(this.limitsRaw).errors[key] : undefined;
      if (!kind) return "";
      return kind === "integer" ? this.strings.limitIntegerError : this.strings.limitRangeError.replace("{min}", String(LIMIT_RANGES[key].min)).replace("{max}", String(LIMIT_RANGES[key].max));
    },

    // Talking to the host.
    ask(this: ServerCardState, event: string, detail: Record<string, unknown>) {
      let waiting: Promise<Result> | null = null;
      this.root.dispatchEvent(
        new CustomEvent(event, {
          bubbles: true,
          detail: {
            ...detail,
            wait: (promise: Promise<Result> | void) => {
              if (promise && typeof (promise as Promise<unknown>).then === "function") waiting = promise as Promise<Result>;
            },
          },
        }),
      );
      return waiting;
    },
    setError(this: ServerCardState, message: string | null) {
      this.error = message;
      this.hasError = message !== null;
    },
    /** Fire the event, show the busy state while the host works, then apply `done` unless the host reported an error. */
    async run(this: ServerCardState, event: string, detail: Record<string, unknown>, done: (result: Result) => void): Promise<boolean> {
      const waiting = this.ask(event, detail);
      if (!waiting) return false;
      this.busy = true;
      this.setError(null);
      try {
        const result = await waiting;
        if (result && result.error) this.setError(result.error);
        else done(result);
      } catch {
        this.setError(this.strings.genericError);
      } finally {
        this.busy = false;
      }
      return true;
    },

    // Power.
    requestPower(this: ServerCardState, action: PowerAction) {
      if (this.busy) return;
      if (action === "start" || action === "restart") void this.powerNow(action);
      else {
        this.pending = { kind: "power", action };
        this.confirmOpen = true;
      }
    },
    powerNow(this: ServerCardState, action: PowerAction) {
      return this.run("nq-power", { action }, (result) => {
        this.status = (result && result.status) || (action === "start" || action === "restart" ? "running" : "stopped");
      });
    },

    // Snapshots.
    askSnapshot(this: ServerCardState, kind: "rollback" | "delete", snap: SnapshotRow) {
      if (snap.creating || this.busy) return;
      this.pending = { kind, snap };
      this.confirmOpen = true;
    },
    /** The confirm dialog's action: its own click closes the dialog, this runs the work. */
    confirmPending(this: ServerCardState) {
      const p = this.pending;
      this.confirmOpen = false;
      if (!p) return;
      if (p.kind === "power") void this.powerNow(p.action);
      else if (p.kind === "rollback") void this.run("nq-rollback", { snapshotId: p.snap.id }, () => {});
      else void this.run("nq-delete-snapshot", { snapshotId: p.snap.id }, () => (this.snapshots = this.snapshots.filter((s) => s.id !== p.snap.id)));
    },
    openSnapshot(this: ServerCardState) {
      if (this.busy) return;
      this.snapName = "";
      this.snapOpen = true;
    },
    closeSnapshot(this: ServerCardState) {
      if (!this.snapSaving) this.snapOpen = false;
    },
    async submitSnapshot(this: ServerCardState) {
      if (this.snapSaving) return;
      const name = this.snapName.trim();
      this.snapSaving = true;
      try {
        await this.run("nq-take-snapshot", { name }, (result) => {
          const given = (result && result.snapshot) || {};
          this.snapshots = [
            ...this.snapshots,
            { id: given.id ?? `snapshot-${this.snapshots.length + 1}-${Date.now()}`, name: given.name ?? (name || new Date().toISOString().slice(0, 10)), sizeLabel: given.sizeLabel ?? "", creating: false, when: this.strings.justNow, iso: new Date().toISOString() },
          ];
        });
      } finally {
        this.snapSaving = false;
        this.snapOpen = false;
      }
    },

    // Limits.
    openLimits(this: ServerCardState) {
      this.limitsRaw = { cpuCores: String(this.limits.cpuCores), memoryMb: String(this.limits.memoryMb), diskGb: String(this.limits.diskGb) };
      this.limitsTried = false;
      this.limitsOpen = true;
    },
    closeLimits(this: ServerCardState) {
      if (!this.limitsSaving) this.limitsOpen = false;
    },
    async submitLimits(this: ServerCardState) {
      if (this.limitsSaving) return;
      this.limitsTried = true;
      const value = validateLimits(this.limitsRaw).value;
      if (!value) return;
      this.limitsSaving = true;
      try {
        await this.run("nq-save-limits", { limits: value }, () => (this.limits = value));
      } finally {
        this.limitsSaving = false;
        this.limitsOpen = false;
      }
    },
  }));
};
