// nqServiceUnits, nqPackageUpdates, nqSshKeys, nqJobQueue: the four server-admin panels. The markup is the React ServiceUnitsList,
// PackageUpdatesPanel, SshKeyManager and JobQueueMonitor (see the Blade components); the list, dialogs and confirms live here and
// feed <x-nq::data-table> through x-model.
//
//   <div x-data="nqServiceUnits({ services: [...], labels: {…} })" x-on:action="$event.detail.wait(…)"> … </div>
//
// They are presentational: the host does the work. Each action fires an event on the root with detail `{ …, wait(promise) }`;
// resolve, or resolve { error } to show a message. After success the panel updates its own list. A rejection, or nobody
// listening, shows the generic error.
//   service-units    action { id, action }   view-logs { id }
//   package-updates  check {}   update { names }   reboot {}
//   ssh-keys         install-change { keyId, serverId, installed }   add { input: { name, publicKey, type, comment } }   remove { keyId }
//   job-queue        retry { ids }   forget { ids }

import {
  canForgetJob,
  canRetryJob,
  errorHeadline,
  formatBytes,
  isDisruptive,
  JOB_STATUSES,
  jobCounts,
  keyCoverage,
  parseSshPublicKey,
  serviceActionsFor,
  shortFingerprint,
  summarizeUpdates,
  type JobStatus,
  type PackageKind,
  type ServiceAction,
  type ServiceState,
  type SshKeyProblem,
} from "./server-admin-logic";
import type { Magics, Register } from "./types";

type Outcome = { error?: string } | void | undefined;
type Labels = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? `{${k}}`));

interface PanelState extends Magics {
  config: { labels: Labels };
  tableRows: Record<string, unknown>[];
  pageError: string | null;
  confirmOpen: boolean;
  confirmTitle: string;
  confirmBody: string;
  confirmLabel: string;
  confirmDanger: boolean;
  confirmRun: (() => unknown) | null;
  alive: boolean;
  root: HTMLElement | null;
  busy: boolean;
  ask(name: string, detail: Record<string, unknown>): Promise<Outcome>;
  run(name: string, detail: Record<string, unknown>): Promise<boolean>;
  askConfirm(c: { title: string; body: string; label: string; danger?: boolean; run: () => unknown }): void;
  confirmGo(): void;
  rebuild(): void;
}

/** The state and methods every panel shares: the event round trip, the page error and the confirm dialog. */
function base(labels: Labels) {
  return {
    tableRows: [] as Record<string, unknown>[],
    pageError: null as string | null,
    confirmOpen: false,
    confirmTitle: "",
    confirmBody: "",
    confirmLabel: "",
    confirmDanger: true,
    confirmRun: null as (() => unknown) | null,
    busy: false,
    alive: true,
    root: null as HTMLElement | null,
    destroy(this: PanelState) {
      this.alive = false;
    },
    /** Fire an event on the root and wait for the promise the host hands to `wait`. */
    async ask(this: PanelState, name: string, detail: Record<string, unknown>): Promise<Outcome> {
      let pending: Promise<Outcome> | undefined;
      const event = new CustomEvent(name, { bubbles: true, cancelable: true, detail: { ...detail, wait: (p: Promise<Outcome>) => (pending = Promise.resolve(p)) } });
      (this.root ?? this.$el).dispatchEvent(event);
      if (!pending) throw new Error("no listener");
      return pending;
    },
    /** Ask, and turn an { error } or a rejection into the page error. True when it worked. */
    async run(this: PanelState, name: string, detail: Record<string, unknown>): Promise<boolean> {
      this.pageError = null;
      this.busy = true;
      try {
        const result = await this.ask(name, detail);
        if (result && result.error !== undefined) {
          if (this.alive) this.pageError = result.error;
          return false;
        }
        return true;
      } catch {
        if (this.alive) this.pageError = labels.genericError;
        return false;
      } finally {
        if (this.alive) this.busy = false;
      }
    },
    askConfirm(this: PanelState, c: { title: string; body: string; label: string; danger?: boolean; run: () => unknown }) {
      this.confirmTitle = c.title;
      this.confirmBody = c.body;
      this.confirmLabel = c.label;
      this.confirmDanger = c.danger !== false;
      this.confirmRun = c.run;
      this.confirmOpen = true;
    },
    confirmGo(this: PanelState) {
      const run = this.confirmRun;
      this.confirmRun = null;
      if (run) void run();
    },
  };
}

/* ------------------------------------------------------------------ services */

interface ServiceItem {
  id: string;
  name: string;
  description?: string;
  state: ServiceState;
  enabled: boolean;
  memoryBytes?: number;
  since?: string;
}
interface ServiceState_ extends PanelState {
  services: ServiceItem[];
  apply(id: string, action: ServiceAction): void;
  config: { labels: Labels; services: ServiceItem[] };
}

const AFTER: Partial<Record<ServiceAction, ServiceState>> = { start: "active", restart: "active", reload: "active", stop: "inactive" };

// ------------------------------------------------------------------ the register

export const serverAdmin: Register = (Alpine) => {
  Alpine.data("nqServiceUnits", (config: ServiceState_["config"]) => ({
    ...base(config.labels),
    config,
    services: config.services.map((s) => ({ ...s })),
    init(this: ServiceState_) {
      this.root = this.$el;
      this.rebuild();
    },
    rebuild(this: ServiceState_) {
      const t = this.config.labels;
      this.tableRows = this.services.map((s) => ({
        id: s.id,
        label: s.name,
        service: s.name,
        description: s.description ?? "",
        state: s.state,
        boot: s.enabled ? "enabled" : "disabled",
        memory: s.memoryBytes === undefined ? "—" : formatBytes(s.memoryBytes),
        since: s.since ?? "—",
        _t: t.states[s.state],
        actions: [...serviceActionsFor(s), "logs"],
      }));
    },
    /** A row action from the table's ⋯ menu. */
    onAction(this: ServiceState_, event: CustomEvent<{ action: string; row: { id: string } }>) {
      const { action, row } = event.detail;
      const unit = this.services.find((s) => s.id === row.id);
      if (!unit) return;
      const t = this.config.labels;
      if (action === "logs") {
        this.ask("view-logs", { id: unit.id }).catch(() => undefined);
        return;
      }
      const act = action as ServiceAction;
      if (!serviceActionsFor(unit).includes(act)) {
        this.pageError = fill(t.notAvailable, { action: t.actions[act], state: t.states[unit.state] });
        return;
      }
      const start = async () => {
        if (await this.run("action", { id: unit.id, action: act })) this.apply(unit.id, act);
      };
      if (!isDisruptive(act)) return void start();
      const label = t.actions[act];
      this.askConfirm({
        title: fill(t.confirmAction, { action: label, name: unit.name }),
        body: act === "stop" ? t.confirmStop : act === "restart" ? t.confirmRestart : t.confirmDisable,
        label,
        danger: act !== "restart",
        run: start,
      });
    },
    apply(this: ServiceState_ & { apply(id: string, action: ServiceAction): void }, id: string, action: ServiceAction) {
      const next = AFTER[action];
      this.services = this.services.map((s) => {
        if (s.id !== id) return s;
        if (action === "enable" || action === "disable") return { ...s, enabled: action === "enable" };
        return next ? { ...s, state: next, since: this.config.labels.justNow } : s;
      });
      this.rebuild();
    },
  }));

  /* ---------------------------------------------------------------- packages */

  interface PackageItem {
    name: string;
    currentVersion: string;
    newVersion: string;
    kind: PackageKind;
    sizeBytes?: number;
  }
  interface PackageState extends PanelState {
    config: { labels: Labels; packages: PackageItem[]; rebootRequired: boolean };
    packages: PackageItem[];
    rebootRequired: boolean;
    checking: boolean;
    install(names: string[]): Promise<void>;
  }

  Alpine.data("nqPackageUpdates", (config: PackageState["config"]) => ({
    ...base(config.labels),
    config,
    packages: config.packages.map((p) => ({ ...p })),
    rebootRequired: config.rebootRequired,
    checking: false,
    init(this: PackageState) {
      this.root = this.$el;
      this.rebuild();
    },
    rebuild(this: PackageState) {
      this.tableRows = this.packages.map((p) => ({
        id: p.name,
        label: p.name,
        package: p.name,
        version: `${p.currentVersion} → ${p.newVersion}`,
        kind: p.kind,
        size: p.sizeBytes === undefined ? "—" : formatBytes(p.sizeBytes),
      }));
    },
    get summary() {
      return summarizeUpdates((this as unknown as PackageState).packages);
    },
    totalText(this: PackageState) {
      const n = summarizeUpdates(this.packages).total;
      const t = this.config.labels;
      const ar = t.ar === true;
      if (n === 1) return t.totalOne;
      if (ar && n === 2) return t.totalTwo;
      if (ar && n <= 10) return fill(t.totalFew, { n });
      return fill(ar ? t.totalMany : t.totalMany, { n });
    },
    securityText(this: PackageState) {
      return fill(this.config.labels.securityCount, { n: summarizeUpdates(this.packages).security });
    },
    downloadText(this: PackageState) {
      return fill(this.config.labels.download, { size: formatBytes(summarizeUpdates(this.packages).downloadBytes) });
    },
    async check(this: PackageState) {
      if (this.checking) return;
      this.checking = true;
      await this.run("check", {});
      if (this.alive) this.checking = false;
    },
    async install(this: PackageState, names: string[]) {
      if (names.length === 0) return;
      if (await this.run("update", { names })) {
        this.packages = this.packages.filter((p) => !names.includes(p.name));
        this.rebuild();
      }
    },
    updateSelected(this: PackageState, ids: string[]) {
      return this.install(ids);
    },
    askUpdateAll(this: PackageState) {
      const t = this.config.labels;
      const names = this.packages.map((p) => p.name);
      this.askConfirm({ title: fill(t.updateAllTitle, { n: names.length }), body: t.updateAllBody, label: t.updateAll, danger: false, run: () => this.install(names) });
    },
    askReboot(this: PackageState) {
      const t = this.config.labels;
      this.askConfirm({
        title: t.rebootConfirmTitle,
        body: t.rebootConfirmBody,
        label: t.reboot,
        run: async () => {
          if (await this.run("reboot", {})) this.rebootRequired = false;
        },
      });
    },
    onAction(this: PackageState, event: CustomEvent<{ action: string; row: { id: string } }>) {
      if (event.detail.action === "update") void this.install([event.detail.row.id]);
    },
  }));

  /* ---------------------------------------------------------------- ssh keys */

  interface KeyItem {
    id: string;
    name: string;
    type: string;
    fingerprint: string;
    comment?: string;
    addedAt: string;
    lastUsedAt?: string;
    installedOn: string[];
  }
  interface ServerItem {
    id: string;
    name: string;
  }
  interface SshState extends PanelState {
    config: { labels: Labels; servers: ServerItem[]; keys: KeyItem[] };
    keys: KeyItem[];
    addOpen: boolean;
    keyName: string;
    keyText: string;
    nameInvalid: boolean;
    keyInvalid: boolean;
    nameError: string;
    keyError: string;
    formError: string | null;
    pending: boolean;
    serverIds(): string[];
    setInstalled(keyId: string, serverId: string, installed: boolean): void;
  }

  Alpine.data("nqSshKeys", (config: SshState["config"]) => ({
    ...base(config.labels),
    config,
    keys: config.keys.map((k) => ({ ...k, installedOn: [...k.installedOn] })),
    addOpen: false,
    keyName: "",
    keyText: "",
    nameInvalid: false,
    keyInvalid: false,
    nameError: "",
    keyError: "",
    formError: null as string | null,
    pending: false,
    init(this: SshState) {
      this.root = this.$el;
      this.rebuild();
      // A private key is flagged as soon as it is pasted, before the form is sent.
      this.$watch("keyText", (text: string) => {
        const p = parseSshPublicKey(text);
        if (!p.ok && p.problem === "private") {
          this.keyInvalid = true;
          this.keyError = this.config.labels.keyProblems.private;
        } else if (this.keyInvalid) {
          this.keyInvalid = false;
          this.keyError = "";
        }
      });
    },
    serverIds(this: SshState) {
      return this.config.servers.map((s) => s.id);
    },
    rebuild(this: SshState) {
      const ids = this.serverIds();
      const t = this.config.labels;
      this.tableRows = this.keys.map((k) => {
        const c = keyCoverage(k.installedOn, ids);
        const row: Record<string, unknown> = {
          id: k.id,
          label: k.name,
          key: k.name,
          type: k.type,
          fingerprint: shortFingerprint(k.fingerprint),
          coverage: fill(t.sshCoverage, { n: c.installed, total: c.total }),
          added: k.addedAt,
          used: k.lastUsedAt ?? t.never,
        };
        for (const id of ids) row[`s_${id}`] = k.installedOn.includes(id);
        return row;
      });
    },
    /** A key's checkbox for one server (the switch in the table). */
    onEdit(this: SshState, event: CustomEvent<{ row: { id: string }; column: string; value: unknown; promise?: Promise<unknown> }>) {
      const d = event.detail;
      if (!d.column.startsWith("s_")) return;
      const serverId = d.column.slice(2);
      const key = this.keys.find((k) => k.id === d.row.id);
      if (!key) return;
      const installed = d.value === true;
      d.promise = this.ask("install-change", { keyId: key.id, serverId, installed }).then(
        (result) => {
          if (result && result.error !== undefined) return result;
          if (this.alive) this.setInstalled(key.id, serverId, installed);
          return undefined;
        },
        () => ({ error: this.config.labels.genericError }),
      );
    },
    setInstalled(this: SshState & { setInstalled(k: string, s: string, i: boolean): void }, keyId: string, serverId: string, installed: boolean) {
      this.keys = this.keys.map((k) => (k.id === keyId ? { ...k, installedOn: installed ? [...new Set([...k.installedOn, serverId])] : k.installedOn.filter((x) => x !== serverId) } : k));
      this.rebuild();
    },
    async everywhere(this: SshState & { setInstalled(k: string, s: string, i: boolean): void }, key: KeyItem, installed: boolean) {
      for (const id of this.serverIds().filter((s) => key.installedOn.includes(s) !== installed)) {
        if (!(await this.run("install-change", { keyId: key.id, serverId: id, installed }))) return;
        this.setInstalled(key.id, id, installed);
      }
    },
    onAction(this: SshState & { everywhere(k: KeyItem, i: boolean): Promise<void> }, event: CustomEvent<{ action: string; row: { id: string } }>) {
      const key = this.keys.find((k) => k.id === event.detail.row.id);
      if (!key) return;
      const t = this.config.labels;
      if (event.detail.action === "all") void this.everywhere(key, true);
      else if (event.detail.action === "none") void this.everywhere(key, false);
      else if (event.detail.action === "delete") {
        this.askConfirm({
          title: fill(t.deleteKeyTitle, { name: key.name }),
          body: t.deleteKeyBody,
          label: t.deleteKey,
          run: async () => {
            if (await this.run("remove", { keyId: key.id })) {
              this.keys = this.keys.filter((k) => k.id !== key.id);
              this.rebuild();
            }
          },
        });
      }
    },
    /** What was recognised in the pasted text, or nothing. */
    get detected(): string {
      const s = this as unknown as SshState;
      const p = parseSshPublicKey(s.keyText);
      if (!p.ok) return "";
      return fill(p.comment ? s.config.labels.keyDetected : s.config.labels.keyNoComment, { type: p.type, comment: p.comment });
    },
    openAdd(this: SshState) {
      this.keyName = "";
      this.keyText = "";
      this.nameInvalid = this.keyInvalid = false;
      this.nameError = this.keyError = "";
      this.formError = null;
      this.addOpen = true;
    },
    async submit(this: SshState) {
      if (this.pending) return;
      const t = this.config.labels;
      const name = this.keyName.trim();
      const parsed = parseSshPublicKey(this.keyText);
      this.nameInvalid = name === "";
      this.nameError = name === "" ? t.keyNameRequired : "";
      this.keyInvalid = !parsed.ok;
      this.keyError = parsed.ok ? "" : t.keyProblems[parsed.problem as SshKeyProblem];
      if (this.nameInvalid || !parsed.ok) return;
      this.pending = true;
      this.formError = null;
      try {
        const result = (await this.ask("add", { input: { name, publicKey: this.keyText.trim(), type: parsed.type, comment: parsed.comment || undefined } })) as
          | { error?: string; key?: KeyItem }
          | void;
        if (!this.alive) return;
        if (result && result.error !== undefined) this.formError = result.error;
        else {
          if (result && result.key) this.keys = [...this.keys, { ...result.key, installedOn: result.key.installedOn ?? [] }];
          this.rebuild();
          this.addOpen = false;
        }
      } catch {
        if (this.alive) this.formError = t.genericError;
      } finally {
        if (this.alive) this.pending = false;
      }
    },
  }));

  /* ---------------------------------------------------------------- jobs */

  interface JobItem {
    id: string;
    name: string;
    queue: string;
    status: JobStatus;
    attempts: number;
    maxAttempts?: number;
    at: string;
    error?: string;
    payload?: string;
  }
  interface JobState extends PanelState {
    config: { labels: Labels; jobs: JobItem[]; canForget: boolean };
    jobs: JobItem[];
    status: JobStatus | null;
    detailOpen: boolean;
    detail: JobItem | null;
    open(id: string): void;
    retry(ids: string[]): Promise<void>;
    forget(ids: string[]): Promise<void>;
    askRetry(ids: string[]): void;
    askForget(ids: string[]): void;
  }

  Alpine.data("nqJobQueue", (config: JobState["config"]) => ({
    ...base(config.labels),
    config,
    jobs: config.jobs.map((j) => ({ ...j })),
    status: null as JobStatus | null,
    detailOpen: false,
    detail: null as JobItem | null,
    statuses: JOB_STATUSES,
    init(this: JobState) {
      this.root = this.$el;
      this.rebuild();
      this.$watch("status", () => this.rebuild());
    },
    rebuild(this: JobState) {
      const shown = this.status ? this.jobs.filter((j) => j.status === this.status) : this.jobs;
      this.tableRows = shown.map((j) => ({
        id: j.id,
        label: j.name,
        job: j.name,
        queue: j.queue,
        status: j.status,
        attempts: j.attempts,
        when: j.at,
        headline: errorHeadline(j.error),
      }));
    },
    counts(this: JobState) {
      return jobCounts(this.jobs);
    },
    count(this: JobState, s: JobStatus) {
      return jobCounts(this.jobs)[s];
    },
    failedIds(this: JobState) {
      return this.jobs.filter((j) => j.status === "failed").map((j) => j.id);
    },
    toggle(this: JobState, s: JobStatus) {
      this.status = this.status === s ? null : s;
    },
    retryable(this: JobState, ids: string[]) {
      return this.jobs.filter((j) => ids.includes(j.id) && canRetryJob(j.status)).map((j) => j.id);
    },
    forgettable(this: JobState, ids: string[]) {
      return this.jobs.filter((j) => ids.includes(j.id) && canForgetJob(j.status)).map((j) => j.id);
    },
    async retry(this: JobState, ids: string[]) {
      if (ids.length === 0) return;
      if (await this.run("retry", { ids })) {
        this.jobs = this.jobs.map((j) => (ids.includes(j.id) ? { ...j, status: "waiting" as JobStatus, error: undefined } : j));
        this.rebuild();
      }
    },
    async forget(this: JobState, ids: string[]) {
      if (ids.length === 0) return;
      if (await this.run("forget", { ids })) {
        this.jobs = this.jobs.filter((j) => !ids.includes(j.id));
        this.rebuild();
      }
    },
    askRetry(this: JobState & { retry(ids: string[]): Promise<void> }, ids: string[]) {
      if (ids.length === 0) return;
      const t = this.config.labels;
      this.askConfirm({ title: ids.length === 1 ? t.retryOne : fill(t.retryTitle, { n: ids.length }), body: t.retryBody, label: t.retry, danger: false, run: () => this.retry(ids) });
    },
    askForget(this: JobState & { forget(ids: string[]): Promise<void> }, ids: string[]) {
      if (ids.length === 0) return;
      const t = this.config.labels;
      this.askConfirm({ title: ids.length === 1 ? t.forgetOne : fill(t.forgetTitle, { n: ids.length }), body: t.forgetBody, label: t.forget, run: () => this.forget(ids) });
    },
    open(this: JobState, id: string) {
      const job = this.jobs.find((j) => j.id === id);
      if (!job) return;
      this.detail = job;
      this.detailOpen = true;
    },
    attemptsText(this: JobState) {
      const j = this.detail;
      return j ? (j.maxAttempts ? `${j.attempts}/${j.maxAttempts}` : String(j.attempts)) : "";
    },
    onAction(this: JobState & { askRetry(i: string[]): void; askForget(i: string[]): void }, event: CustomEvent<{ action: string; row: { id: string } }>) {
      const { action, row } = event.detail;
      const job = this.jobs.find((j) => j.id === row.id);
      if (!job) return;
      const t = this.config.labels;
      if (action === "details") this.open(job.id);
      else if (action === "retry") {
        if (canRetryJob(job.status)) void this.retry([job.id]);
        else this.pageError = fill(t.notAvailable, { action: t.retry, state: t.jobStatuses[job.status] });
      } else if (action === "forget") {
        if (canForgetJob(job.status)) this.askForget([job.id]);
        else this.pageError = fill(t.notAvailable, { action: t.forget, state: t.jobStatuses[job.status] });
      }
    },
    onRowClick(this: JobState, event: CustomEvent<{ row: { id: string } }>) {
      this.open(event.detail.row.id);
    },
  }));
};
