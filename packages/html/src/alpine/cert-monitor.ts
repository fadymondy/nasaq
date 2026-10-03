// nqCertMonitor: the add form, the stop-monitoring confirm and the table rows of the TLS certificate monitor card.
// The markup is the React CertificateMonitor's; the certificates live here and feed <x-nq::data-table> through x-model.
//
//   <div x-data="nqCertMonitor({ certificates: [...], now, thresholds, labels: {…} })"
//        @add="$event.detail.wait(…)" @recheck="$event.detail.wait(…)" @renew="$event.detail.wait(…)" @remove="$event.detail.wait(…)"> … </div>
//
// It is presentational: the host does the work. Each action fires an event on the root with detail `{ …, wait(promise) }`:
//   add      { host, wait }   host is lower-cased; resolve, or resolve { error } (shown above the table); may resolve { id, issuer, validTo, autoRenew }
//   recheck  { id, wait }     resolve, or resolve { error }; resolve { validTo, issuer, autoRenew } to update the row
//   renew    { id, wait }     resolve, or resolve { error }; resolve { validTo } to update the row (ignored for auto-renewing certificates)
//   remove   { id, wait }     runs after the confirm; resolve, or resolve { error }
// On success the card updates its own list. A rejected promise, or nobody listening, shows the generic error.
// Days left are worked out from `now` (the server's clock at render time) so the page and the markup agree.

import { byExpiry, certDaysLeft, certStatus, isValidCertHost, summarizeCerts, type CertThresholds } from "./cert-monitor-logic";
import type { Magics, Register } from "./types";

interface Cert {
  id: string;
  host: string;
  issuer?: string;
  validTo?: string | null;
  autoRenew?: boolean;
  error?: string;
}

interface CertConfig {
  certificates: Cert[];
  now: string;
  thresholds: CertThresholds;
  labels: {
    invalid: string;
    genericError: string;
    /** "{total} monitored, {attention} need attention" */
    summary: string;
    /** "Stop monitoring {host}?" */
    removeTitle: string;
    unknown: string;
    today: string;
    /** "Expired {n} d ago" */
    expiredAgo: string;
    /** "{n} d" */
    daysLeft: string;
    autoRenew: string;
    manual: string;
  };
}

type Outcome = (Partial<Cert> & { error?: string }) | void | undefined;

interface Row {
  id: string;
  host: string;
  issuer: string | null;
  expires: string | null;
  renew: string;
  left: string;
  status: string;
}

interface CertState extends Magics {
  config: CertConfig;
  certs: Cert[];
  tableRows: Row[];
  value: string;
  fieldInvalid: boolean;
  error: string | null;
  adding: boolean;
  notice: string | null;
  removeOpen: boolean;
  removing: Cert | null;
  alive: boolean;
  root: HTMLElement | null;
  daysOf(c: Cert): number | null;
  buildRows(): Row[];
  sync(certs: Cert[]): void;
  ask(name: string, detail: Record<string, unknown>): Promise<Outcome>;
  run(name: string, detail: Record<string, unknown>, onOk: (result: Outcome) => void): Promise<void>;
}

let seq = 0;

export const certMonitor: Register = (Alpine) => {
  Alpine.data("nqCertMonitor", (config: CertConfig) => ({
    config,
    certs: config.certificates.map((c) => ({ ...c })),
    tableRows: [] as Row[],
    value: "",
    fieldInvalid: false,
    error: null as string | null,
    adding: false,
    notice: null as string | null,
    removeOpen: false,
    removing: null as Cert | null,
    alive: true,
    root: null as HTMLElement | null,
    init(this: CertState) {
      this.root = this.$el;
      this.tableRows = this.buildRows();
      this.$watch("removeOpen", (open: boolean) => {
        if (!open) this.removing = null;
      });
    },
    destroy(this: CertState) {
      this.alive = false;
    },
    daysOf(this: CertState, c: Cert): number | null {
      return c.error || !c.validTo ? null : certDaysLeft(c.validTo, new Date(this.config.now));
    },
    buildRows(this: CertState): Row[] {
      const l = this.config.labels;
      return this.certs
        .map((c) => ({ c, days: this.daysOf(c) }))
        .sort((a, b) => byExpiry(a.days, b.days))
        .map(({ c, days }) => ({
          id: c.id,
          host: c.host,
          issuer: c.issuer ?? null,
          expires: c.validTo && !c.error ? c.validTo.slice(0, 10) : null,
          renew: c.autoRenew ? l.autoRenew : l.manual,
          left: days === null ? l.unknown : days < 0 ? l.expiredAgo.replace("{n}", String(-days)) : days === 0 ? l.today : l.daysLeft.replace("{n}", String(days)),
          status: certStatus(days, this.config.thresholds),
        }));
    },
    sync(this: CertState, certs: Cert[]) {
      this.certs = certs;
      this.tableRows = this.buildRows();
    },
    get attention(): boolean {
      const s = this as unknown as CertState;
      const sum = summarizeCerts(s.certs.map((c) => s.daysOf(c)), s.config.thresholds);
      return sum.expiring + sum.critical + sum.expired + sum.error > 0;
    },
    get summaryText(): string {
      const s = this as unknown as CertState;
      const sum = summarizeCerts(s.certs.map((c) => s.daysOf(c)), s.config.thresholds);
      const attention = sum.expiring + sum.critical + sum.expired + sum.error;
      return s.config.labels.summary.replace("{total}", String(sum.total)).replace("{attention}", String(attention));
    },
    get removeTitle(): string {
      const s = this as unknown as CertState;
      return s.removing ? s.config.labels.removeTitle.replace("{host}", s.removing.host) : "";
    },
    /** Fire an event on the root and wait for the promise the host hands to `wait`. */
    async ask(this: CertState, name: string, detail: Record<string, unknown>): Promise<Outcome> {
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
    async run(this: CertState, name: string, detail: Record<string, unknown>, onOk: (result: Outcome) => void) {
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
    /** Typing clears the error. */
    onInput(this: CertState) {
      this.error = null;
      this.fieldInvalid = false;
    },
    async submit(this: CertState) {
      if (this.adding) return;
      const host = this.value.trim().toLowerCase();
      if (!isValidCertHost(host)) {
        this.error = this.config.labels.invalid;
        this.fieldInvalid = true;
        return;
      }
      this.adding = true;
      this.error = null;
      try {
        const result = await this.ask("add", { host });
        if (!this.alive) return;
        if (result && result.error !== undefined && !result.validTo && !result.id) {
          this.notice = result.error;
        } else {
          this.notice = null;
          this.sync([...this.certs, { ...(result || {}), id: (result && result.id) || `new-${++seq}`, host }]);
        }
        this.value = "";
      } catch {
        if (this.alive) this.notice = this.config.labels.genericError;
      } finally {
        if (this.alive) this.adding = false;
      }
    },
    /** Row actions from the table's menu. */
    onAction(this: CertState, event: CustomEvent<{ action: string; row: { id: string } }>) {
      const { action, row } = event.detail;
      const cert = this.certs.find((c) => c.id === row.id);
      if (!cert) return;
      const patch = (result: Outcome) => {
        if (result && typeof result === "object") {
          const { id: _id, ...rest } = result as Cert;
          this.sync(this.certs.map((c) => (c.id === cert.id ? { ...c, ...rest } : c)));
        }
      };
      if (action === "recheck") {
        void this.run("recheck", { id: cert.id }, patch);
      } else if (action === "renew") {
        if (cert.autoRenew) return;
        void this.run("renew", { id: cert.id }, patch);
      } else if (action === "remove") {
        this.removing = cert;
        this.removeOpen = true;
      }
    },
    confirmRemove(this: CertState) {
      const cert = this.removing;
      if (!cert) return;
      void this.run("remove", { id: cert.id }, () => this.sync(this.certs.filter((c) => c.id !== cert.id)));
    },
  }));
};
