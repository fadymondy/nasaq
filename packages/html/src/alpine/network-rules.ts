// nqNetworkRules: the two rule lists (firewall and HTTP), their staged edits, the rule dialogs and the apply bars of the network rules editor.
// The markup is the React NetworkRules'; each list feeds an <x-nq::data-table> through x-model.
//
//   <div x-data="nqNetworkRules({ firewall: [...], http: [...] | null, labels: {…} })"
//        @apply-firewall="$event.detail.wait(…)" @apply-http="…"> … </div>
//
// Every edit is staged here and only sent on Apply. It is presentational: the host does the work. Each apply fires an event on the root
// with detail `{ rules, wait(promise) }`; resolve, or resolve `{ error }` to show it above the table. A rejected promise, or nobody
// listening, shows the generic error. After success the applied list becomes the sent one (an HTTP password is dropped: it is write-only).

import { diffRules, formatProtocolPort, lockoutRisk, rulesToApply, validateFirewallRule, validateHttpRule, type FirewallRule, type HttpRule, type RuleState } from "./network-rules-logic";
import type { Magics, Register } from "./types";

interface Labels {
  genericError: string;
  applied: string;
  anySource: string;
  upToDate: string;
  stagedHint: string;
  lockout: string;
  ruleTitleNew: string;
  ruleTitleEdit: string;
  /** one / two / few / many forms, each with {n} */
  staged: { one: string; two: string; few: string; many: string };
}

interface Config {
  firewall: FirewallRule[];
  http: HttpRule[] | null;
  labels: Labels;
}

interface Panel<R extends { id: string }> {
  applied: R[];
  staged: R[];
  removed: string[];
  rows: Record<string, string>[];
  open: boolean;
  editingId: string | null;
  tried: boolean;
  applying: boolean;
  ok: string | null;
  err: string | null;
}

interface FirewallForm {
  action: string;
  protocol: string;
  port: string;
  source: string;
  note: string;
  portInvalid: boolean;
  sourceInvalid: boolean;
}

interface HttpForm {
  type: string;
  path: string;
  target: string;
  status: string;
  name: string;
  value: string;
  username: string;
  password: string;
  cidr: string;
  invalid: Record<string, boolean>;
}

type Outcome = { error?: string } | void | undefined;

interface State extends Magics {
  config: Config;
  fw: Panel<FirewallRule>;
  ht: Panel<HttpRule>;
  ff: FirewallForm;
  hf: HttpForm;
  alive: boolean;
  root: HTMLElement | null;
  fwRows(): Record<string, string>[];
  htRows(): Record<string, string>[];
  refresh(kind: "fw" | "ht"): void;
  readonly fwCount: number;
  readonly htCount: number;
  openFirewall(id: string | null): void;
  openHttp(id: string | null): void;
  move(id: string, by: -1 | 1): void;
  remove(kind: "fw" | "ht", id: string): void;
  restore(kind: "fw" | "ht", id: string): void;
}

const blankPanel = <R extends { id: string }>(applied: R[]): Panel<R> => ({
  applied: applied.map((r) => ({ ...r })),
  staged: applied.map((r) => ({ ...r })),
  removed: [],
  rows: [],
  open: false,
  editingId: null,
  tried: false,
  applying: false,
  ok: null,
  err: null,
});

const states = <R extends { id: string }>(p: Panel<R>) => diffRules(p.applied, p.staged, new Set(p.removed));
let seq = 0;
const newId = () => `new-${Date.now().toString(36)}${++seq}`;

function httpDetail(r: HttpRule, anySource: string): string {
  switch (r.type) {
    case "redirect":
      return `${r.status ?? 301} → ${r.target ?? ""}`;
    case "header":
      return `${r.name ?? ""}: ${r.value ?? ""}`;
    case "basic-auth":
      return r.username ?? "";
    default:
      return r.cidr ?? anySource;
  }
}

export const networkRules: Register = (Alpine) => {
  Alpine.data("nqNetworkRules", (config: Config) => ({
    config,
    fw: blankPanel(config.firewall),
    ht: blankPanel(config.http ?? []),
    ff: { action: "allow", protocol: "tcp", port: "", source: "any", note: "", portInvalid: false, sourceInvalid: false } as FirewallForm,
    hf: { type: "redirect", path: "/", target: "", status: "301", name: "", value: "", username: "", password: "", cidr: "", invalid: {} } as HttpForm,
    alive: true,
    root: null as HTMLElement | null,
    init(this: State) {
      this.root = this.$el;
      this.refresh("fw");
      this.refresh("ht");
      // A protocol without a port clears the port (the input is disabled for it).
      this.$watch("ff.protocol", (p: string) => {
        if (p !== "tcp" && p !== "udp") this.ff.port = "";
      });
    },
    destroy(this: State) {
      this.alive = false;
    },
    fwRows(this: State) {
      const d = states(this.fw);
      const any = this.config.labels.anySource;
      return this.fw.staged.map((r, i) => ({
        id: r.id,
        order: String(i + 1),
        action: r.action,
        protocol: formatProtocolPort(r),
        source: r.source === "any" ? any : r.source,
        note: r.note ?? "",
        state: d.states.get(r.id) ?? "added",
        pos: this.fw.staged.length === 1 ? "only" : i === 0 ? "first" : i === this.fw.staged.length - 1 ? "last" : "mid",
      }));
    },
    htRows(this: State) {
      const d = states(this.ht);
      return this.ht.staged.map((r) => ({
        id: r.id,
        type: r.type,
        path: r.path,
        detail: httpDetail(r, this.config.labels.anySource),
        state: d.states.get(r.id) ?? "added",
      }));
    },
    refresh(this: State, kind: "fw" | "ht") {
      if (kind === "fw") this.fw.rows = this.fwRows();
      else this.ht.rows = this.htRows();
    },

    // Summaries and warnings.
    count(this: State, kind: "fw" | "ht"): number {
      return kind === "fw" ? states(this.fw).count : states(this.ht).count;
    },
    get fwCount(): number {
      return (this as unknown as State & { count(k: string): number }).count("fw");
    },
    get htCount(): number {
      return (this as unknown as State & { count(k: string): number }).count("ht");
    },
    summary(this: State, n: number): string {
      const l = this.config.labels;
      if (n === 0) return l.upToDate;
      const f = n === 1 ? l.staged.one : n === 2 ? l.staged.two : n <= 10 ? l.staged.few : l.staged.many;
      return f.replace("{n}", String(n));
    },
    get fwSummary(): string {
      const s = this as unknown as State & { summary(n: number): string };
      return s.summary(s.fwCount);
    },
    get htSummary(): string {
      const s = this as unknown as State & { summary(n: number): string };
      return s.summary(s.htCount);
    },
    get fwRisk(): boolean {
      const s = this as unknown as State;
      return lockoutRisk(rulesToApply(s.fw.staged, new Set(s.fw.removed))) !== null;
    },
    get fwHint(): string {
      const s = this as unknown as State & { fwRisk: boolean };
      return s.fwRisk ? s.config.labels.lockout : s.config.labels.stagedHint;
    },
    get fwTitle(): string {
      const s = this as unknown as State;
      return s.fw.editingId ? s.config.labels.ruleTitleEdit : s.config.labels.ruleTitleNew;
    },
    get htTitle(): string {
      const s = this as unknown as State;
      return s.ht.editingId ? s.config.labels.ruleTitleEdit : s.config.labels.ruleTitleNew;
    },
    get ffHasPort(): boolean {
      const p = (this as unknown as State).ff.protocol;
      return p === "tcp" || p === "udp";
    },
    get hfIsRedirect(): boolean {
      return (this as unknown as State).hf.type === "redirect";
    },
    get hfIsHeader(): boolean {
      return (this as unknown as State).hf.type === "header";
    },
    get hfIsAuth(): boolean {
      return (this as unknown as State).hf.type === "basic-auth";
    },
    get hfIsIp(): boolean {
      const t = (this as unknown as State).hf.type;
      return t === "ip-allow" || t === "ip-deny";
    },

    // Firewall.
    openFirewall(this: State, id: string | null) {
      const r = id ? this.fw.staged.find((x) => x.id === id) : null;
      this.ff = { action: r?.action ?? "allow", protocol: r?.protocol ?? "tcp", port: r?.port ?? "", source: r?.source ?? "any", note: r?.note ?? "", portInvalid: false, sourceInvalid: false };
      this.fw.editingId = r ? r.id : null;
      this.fw.tried = false;
      this.fw.open = true;
    },
    onFirewallInput(this: State) {
      this.ff.portInvalid = false;
      this.ff.sourceInvalid = false;
    },
    saveFirewall(this: State) {
      const f = this.ff;
      const errors = validateFirewallRule({ protocol: f.protocol as FirewallRule["protocol"], port: f.port, source: f.source });
      this.fw.tried = true;
      f.portInvalid = errors.includes("port") || errors.includes("portForProtocol");
      f.sourceInvalid = errors.includes("source");
      if (errors.length) return;
      const hasPort = f.protocol === "tcp" || f.protocol === "udp";
      const rule: FirewallRule = {
        id: this.fw.editingId ?? newId(),
        action: f.action as FirewallRule["action"],
        protocol: f.protocol as FirewallRule["protocol"],
        port: hasPort ? f.port.trim() : "",
        source: f.source.trim().toLowerCase() === "any" ? "any" : f.source.trim(),
        ...(f.note.trim() ? { note: f.note } : {}),
      };
      this.fw.staged = this.fw.staged.some((r) => r.id === rule.id) ? this.fw.staged.map((r) => (r.id === rule.id ? rule : r)) : [...this.fw.staged, rule];
      this.refresh("fw");
      this.fw.open = false;
    },

    // HTTP.
    openHttp(this: State, id: string | null) {
      const r = id ? this.ht.staged.find((x) => x.id === id) : null;
      this.hf = {
        type: r?.type ?? "redirect",
        path: r?.path ?? "/",
        target: r?.target ?? "",
        status: String(r?.status ?? 301),
        name: r?.name ?? "",
        value: r?.value ?? "",
        username: r?.username ?? "",
        password: r?.password ?? "",
        cidr: r?.cidr ?? "",
        invalid: {},
      };
      this.ht.editingId = r ? r.id : null;
      this.ht.tried = false;
      this.ht.open = true;
    },
    onHttpInput(this: State) {
      this.hf.invalid = {};
    },
    /** The rule the form describes: only the fields of its type, like the React dialog. */
    httpDraft(this: State): HttpRule {
      const f = this.hf;
      const base = { id: this.ht.editingId ?? newId(), type: f.type as HttpRule["type"], path: f.path };
      switch (f.type) {
        case "redirect":
          return { ...base, target: f.target, status: Number(f.status) as 301 };
        case "header":
          return { ...base, name: f.name, value: f.value };
        case "basic-auth":
          return { ...base, username: f.username, ...(f.password ? { password: f.password } : {}) };
        default:
          return { ...base, cidr: f.cidr };
      }
    },
    saveHttp(this: State) {
      const rule = (this as unknown as State & { httpDraft(): HttpRule }).httpDraft();
      const errors = validateHttpRule(rule, { requirePassword: rule.type === "basic-auth" && !this.ht.editingId });
      this.ht.tried = true;
      this.hf.invalid = Object.fromEntries(errors.map((e) => [e, true]));
      if (errors.length) return;
      this.ht.staged = this.ht.staged.some((r) => r.id === rule.id) ? this.ht.staged.map((r) => (r.id === rule.id ? rule : r)) : [...this.ht.staged, rule];
      this.refresh("ht");
      this.ht.open = false;
    },

    // Staging.
    move(this: State, id: string, by: -1 | 1) {
      const s = this.fw.staged;
      const i = s.findIndex((r) => r.id === id);
      const j = i + by;
      if (i < 0 || j < 0 || j >= s.length) return;
      const n = [...s];
      [n[i], n[j]] = [n[j] as FirewallRule, n[i] as FirewallRule];
      this.fw.staged = n;
      this.refresh("fw");
    },
    remove(this: State, kind: "fw" | "ht", id: string) {
      const p = (kind === "fw" ? this.fw : this.ht) as Panel<{ id: string }>;
      if (p.applied.some((r) => r.id === id)) p.removed = [...p.removed, id];
      else p.staged = p.staged.filter((r) => r.id !== id);
      this.refresh(kind);
    },
    restore(this: State, kind: "fw" | "ht", id: string) {
      const p = kind === "fw" ? this.fw : this.ht;
      p.removed = p.removed.filter((x) => x !== id);
      this.refresh(kind);
    },
    discard(this: State, kind: "fw" | "ht") {
      const p = (kind === "fw" ? this.fw : this.ht) as Panel<{ id: string }>;
      p.staged = p.applied.map((r) => ({ ...r }));
      p.removed = [];
      p.ok = null;
      p.err = null;
      this.refresh(kind);
    },

    /** Row actions from the tables' menus. Ids are prefixed fw- / ht-. Inapplicable ones (first row up, last row down, anything on a removed row but undo) are ignored. */
    onAction(this: State, event: CustomEvent<{ action: string; row: { id: string } }>) {
      const { action, row } = event.detail;
      const kind = action.startsWith("fw-") ? "fw" : action.startsWith("ht-") ? "ht" : null;
      if (!kind) return;
      const verb = action.slice(3);
      const p = (kind === "fw" ? this.fw : this.ht) as Panel<{ id: string }>;
      if (!p.staged.some((r) => r.id === row.id)) return;
      const removed = p.removed.includes(row.id);
      if (verb === "restore") {
        if (removed) this.restore(kind, row.id);
        return;
      }
      if (removed) return;
      if (verb === "edit") {
        if (kind === "fw") this.openFirewall(row.id);
        else this.openHttp(row.id);
      } else if (verb === "up") this.move(row.id, -1);
      else if (verb === "down") this.move(row.id, 1);
      else if (verb === "remove") this.remove(kind, row.id);
    },

    async apply(this: State, kind: "fw" | "ht") {
      const p = (kind === "fw" ? this.fw : this.ht) as Panel<{ id: string }>;
      if (p.applying || states(p).count === 0) return;
      p.applying = true;
      p.ok = null;
      p.err = null;
      const rules = rulesToApply(p.staged, new Set(p.removed));
      try {
        let pending: Promise<Outcome> | undefined;
        const event = new CustomEvent(kind === "fw" ? "apply-firewall" : "apply-http", {
          bubbles: true,
          detail: { rules: rules.map((r) => ({ ...r })), wait: (x: Promise<Outcome>) => (pending = Promise.resolve(x)) },
        });
        (this.root ?? this.$el).dispatchEvent(event);
        if (!pending) throw new Error("no listener");
        const result = await pending;
        if (!this.alive) return;
        if (result && result.error) p.err = result.error;
        else {
          // The password is write-only: it is not kept once sent.
          const kept = kind === "ht" ? (rules as HttpRule[]).map(({ password: _p, ...r }) => r) : rules;
          p.applied = kept.map((r) => ({ ...r }));
          p.staged = kept.map((r) => ({ ...r }));
          p.removed = [];
          p.ok = this.config.labels.applied;
        }
      } catch {
        if (this.alive) p.err = this.config.labels.genericError;
      } finally {
        if (this.alive) {
          p.applying = false;
          this.refresh(kind);
        }
      }
    },
  }));
};

export type { RuleState };
