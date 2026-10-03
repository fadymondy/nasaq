// nqUptimeMonitors: the table rows, the period switch, the add / edit dialog and the delete confirm of the uptime monitors card.
// The markup is the React UptimeMonitors'; the monitors live here and feed <x-nq::data-table> through x-model.
//
//   <div x-data="nqUptimeMonitors({ monitors: [...], period, labels: {…} })"
//        @save="$event.detail.wait(…)" @delete="…" @pause="…" @resume="…" @check="…"> … </div>
//
// It is presentational: the host does the work. Each action fires an event on the root with detail `{ …, wait(promise) }`:
//   save    { input: { name, target, kind, intervalSec }, id?, wait }   resolve, or resolve { error } (shown in the dialog); may resolve a monitor patch / the new monitor
//   delete  { id, wait }   after the confirm;  pause { id, wait };  resume { id, wait };  check { id, wait }   resolve, or resolve { error } (shown above the table); resolve a monitor patch to update the row
// On success the card updates its own list. A rejected promise, or nobody listening, shows the generic error.

import { formatUptime, overallStatus, responseLabel, type CheckResult, type MonitorStatus, type OverallStatus, type UptimePeriod } from "./uptime-monitors-logic";
import type { Magics, Register } from "./types";

interface Monitor {
  id: string;
  name: string;
  target: string;
  kind: string;
  status: MonitorStatus;
  uptime: Partial<Record<UptimePeriod, number | null>>;
  checks?: CheckResult[];
  responseMs?: number;
  lastCheckAt?: string | null;
  intervalSec?: number;
}

interface Config {
  monitors: Monitor[];
  period: UptimePeriod;
  labels: {
    genericError: string;
    /** "Delete {name}?" */
    deleteTitle: string;
    /** "{up} of {total} checks up" */
    history: string;
    dialogNew: string;
    dialogEdit: string;
    overall: Record<OverallStatus, string>;
  };
}

type Outcome = (Partial<Monitor> & { error?: string }) | void | undefined;

interface Row {
  id: string;
  name: string;
  target: string;
  status: string;
  history: string;
  uptime: string;
  response: string;
  checked: string | null;
}

interface State extends Magics {
  config: Config;
  monitors: Monitor[];
  tableRows: Row[];
  period: UptimePeriod;
  periodSel: string[];
  notice: string | null;
  formOpen: boolean;
  editingId: string | null;
  name: string;
  target: string;
  kind: string;
  interval: string;
  nameInvalid: boolean;
  targetInvalid: boolean;
  formError: string | null;
  pending: boolean;
  deleteOpen: boolean;
  deleting: Monitor | null;
  alive: boolean;
  root: HTMLElement | null;
  overall: OverallStatus;
  buildRows(): Row[];
  sync(monitors: Monitor[]): void;
  ask(name: string, detail: Record<string, unknown>): Promise<Outcome>;
  run(name: string, detail: Record<string, unknown>, onOk: (result: Outcome) => void): Promise<void>;
  patch(id: string, status?: MonitorStatus): (result: Outcome) => void;
}

let seq = 0;

export const uptimeMonitors: Register = (Alpine) => {
  Alpine.data("nqUptimeMonitors", (config: Config) => ({
    config,
    monitors: config.monitors.map((m) => ({ ...m })),
    tableRows: [] as Row[],
    period: config.period,
    periodSel: [config.period] as string[],
    notice: null as string | null,
    formOpen: false,
    editingId: null as string | null,
    name: "",
    target: "",
    kind: "http",
    interval: "60",
    nameInvalid: false,
    targetInvalid: false,
    formError: null as string | null,
    pending: false,
    deleteOpen: false,
    deleting: null as Monitor | null,
    alive: true,
    root: null as HTMLElement | null,
    init(this: State) {
      this.root = this.$el;
      this.tableRows = this.buildRows();
      this.$watch("period", () => {
        this.tableRows = this.buildRows();
      });
      // The toggle group holds an array and lets the pressed item be cleared; one period is always chosen.
      this.$watch("periodSel", (sel: string[]) => {
        if (!sel.length) this.periodSel = [this.period];
        else if (sel[0] !== this.period) this.period = sel[0] as UptimePeriod;
      });
      this.$watch("deleteOpen", (open: boolean) => {
        if (!open) this.deleting = null;
      });
    },
    destroy(this: State) {
      this.alive = false;
    },
    buildRows(this: State): Row[] {
      const l = this.config.labels;
      return this.monitors.map((m) => {
        const measured = (m.checks ?? []).filter((c) => c !== "none");
        const up = measured.filter((c) => c !== "down").length;
        return {
          id: m.id,
          name: m.name,
          target: m.target,
          status: m.status,
          history: measured.length ? l.history.replace("{up}", String(up)).replace("{total}", String(measured.length)) : "–",
          uptime: formatUptime(m.uptime[this.period]),
          response: responseLabel(m.responseMs),
          checked: m.lastCheckAt ? m.lastCheckAt.slice(0, 10) : null,
        };
      });
    },
    sync(this: State, monitors: Monitor[]) {
      this.monitors = monitors;
      this.tableRows = this.buildRows();
    },
    get overall(): OverallStatus {
      const s = this as unknown as State;
      return overallStatus(s.monitors.map((m) => m.status), false);
    },
    get overallText(): string {
      const s = this as unknown as State;
      return s.config.labels.overall[s.overall];
    },
    get overallTone(): string {
      const o = (this as unknown as State).overall;
      return o === "operational" ? "success" : o === "degraded" || o === "partial-outage" ? "warning" : "danger";
    },
    get deleteTitle(): string {
      const s = this as unknown as State;
      return s.deleting ? s.config.labels.deleteTitle.replace("{name}", s.deleting.name) : "";
    },
    get dialogTitle(): string {
      const s = this as unknown as State;
      return s.editingId ? s.config.labels.dialogEdit : s.config.labels.dialogNew;
    },
    /** Fire an event on the root and wait for the promise the host hands to `wait`. */
    async ask(this: State, name: string, detail: Record<string, unknown>): Promise<Outcome> {
      let pending: Promise<Outcome> | undefined;
      const event = new CustomEvent(name, {
        bubbles: true,
        detail: { ...detail, wait: (p: Promise<Outcome>) => (pending = Promise.resolve(p)) },
      });
      (this.root ?? this.$el).dispatchEvent(event);
      if (!pending) throw new Error("no listener");
      return pending;
    },
    /** A row action: ask the host, show an error as the page notice, or apply the success. */
    async run(this: State, name: string, detail: Record<string, unknown>, onOk: (result: Outcome) => void) {
      this.notice = null;
      try {
        const result = await this.ask(name, detail);
        if (!this.alive) return;
        if (result && result.error !== undefined) this.notice = result.error;
        else onOk(result);
      } catch {
        if (this.alive) this.notice = this.config.labels.genericError;
      }
    },
    /** Apply a host's monitor patch (and optionally a new status) to one row. */
    patch(this: State, id: string, status?: MonitorStatus) {
      return (result: Outcome) => {
        const rest: Partial<Monitor> = {};
        if (result && typeof result === "object") Object.assign(rest, result);
        delete rest.id;
        this.sync(this.monitors.map((m) => (m.id === id ? { ...m, ...(status ? { status } : {}), ...rest } : m)));
      };
    },
    openAdd(this: State) {
      this.editingId = null;
      this.name = "";
      this.target = "";
      this.kind = "http";
      this.interval = "60";
      this.nameInvalid = false;
      this.targetInvalid = false;
      this.formError = null;
      this.formOpen = true;
    },
    /** Typing clears the errors. */
    onInput(this: State) {
      this.nameInvalid = false;
      this.targetInvalid = false;
      this.formError = null;
    },
    async submit(this: State) {
      if (this.pending) return;
      const name = this.name.trim();
      const target = this.target.trim();
      this.nameInvalid = !name;
      this.targetInvalid = !target;
      if (!name || !target) return;
      this.pending = true;
      this.formError = null;
      const input = { name, target, kind: this.kind, intervalSec: Number(this.interval) };
      const id = this.editingId;
      try {
        const result = await this.ask("save", id ? { input, id } : { input });
        if (!this.alive) return;
        if (result && result.error !== undefined) {
          this.formError = result.error;
        } else if (id) {
          this.patch(id)({ ...input, ...(result || {}) });
          this.formOpen = false;
        } else {
          this.sync([...this.monitors, { status: "unknown", uptime: {}, ...input, ...(result || {}), id: (result && result.id) || `new-${++seq}` }]);
          this.formOpen = false;
        }
      } catch {
        if (this.alive) this.formError = this.config.labels.genericError;
      } finally {
        if (this.alive) this.pending = false;
      }
    },
    /** Row actions from the table's menu. Pause, resume and check now are ignored when they do not apply to the row. */
    onAction(this: State, event: CustomEvent<{ action: string; row: { id: string } }>) {
      const { action, row } = event.detail;
      const m = this.monitors.find((x) => x.id === row.id);
      if (!m) return;
      const paused = m.status === "paused";
      if (action === "check") {
        if (!paused) void this.run("check", { id: m.id }, this.patch(m.id));
      } else if (action === "pause") {
        if (!paused) void this.run("pause", { id: m.id }, this.patch(m.id, "paused"));
      } else if (action === "resume") {
        if (paused) void this.run("resume", { id: m.id }, this.patch(m.id, "unknown"));
      } else if (action === "edit") {
        this.editingId = m.id;
        this.name = m.name;
        this.target = m.target;
        this.kind = m.kind;
        this.interval = String(m.intervalSec ?? 60);
        this.nameInvalid = false;
        this.targetInvalid = false;
        this.formError = null;
        this.formOpen = true;
      } else if (action === "delete") {
        this.deleting = m;
        this.deleteOpen = true;
      }
    },
    confirmDelete(this: State) {
      const m = this.deleting;
      if (!m) return;
      void this.run("delete", { id: m.id }, () => this.sync(this.monitors.filter((x) => x.id !== m.id)));
    },
  }));
};
