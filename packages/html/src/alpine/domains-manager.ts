// nqDomainsManager: the add form, the remove confirm and the table rows of the custom domains card.
// The markup is the React DomainsManager's; the domains live here and feed <x-nq::data-table> through x-model.
//
//   <div x-data="nqDomainsManager({ domains: [...], labels: {…} })"
//        @add="$event.detail.wait(…)" @remove="$event.detail.wait(…)" @recheck="$event.detail.wait(…)" @make-primary="$event.detail.wait(…)"> … </div>
//
// It is presentational: the host does the work. Each action fires an event on the root with detail `{ …, wait(promise) }`:
//   add           { host, wait }   host is already normalised; resolve, or resolve { error } (shown under the field); may resolve { id }
//   remove        { id, wait }     runs after the confirm; resolve, or resolve { error }
//   recheck       { id, wait }     resolve { check } with the new state ("verified", "pending", "checking", "failed"), or { error }
//   make-primary  { id, wait }     resolve, or resolve { error }
// On success the card updates its own list. A rejected promise, or nobody listening, shows the generic error.

import { isValidHostname, normalizeHost, summarizeDomains, type DomainCheck } from "./domains-manager-logic";
import type { Magics, Register } from "./types";

interface Domain {
  id: string;
  host: string;
  check: DomainCheck;
  primary?: boolean;
  addedAt?: string | null;
  error?: string;
}

interface DomainsConfig {
  domains: Domain[];
  labels: {
    invalid: string;
    duplicate: string;
    genericError: string;
    /** "{verified} of {total} verified" */
    summary: string;
    /** "Remove {host}?" */
    removeTitle: string;
  };
}

type Outcome = { error?: string; id?: string; check?: DomainCheck } | void | undefined;

interface Row {
  id: string;
  host: string;
  check: DomainCheck;
  primary: string;
  added: string | null;
}

interface DomainsState extends Magics {
  config: DomainsConfig;
  domains: Domain[];
  tableRows: Row[];
  value: string;
  fieldInvalid: boolean;
  error: string | null;
  adding: boolean;
  notice: string | null;
  removeOpen: boolean;
  removing: Domain | null;
  alive: boolean;
  root: HTMLElement | null;
  buildRows(): Row[];
  sync(domains: Domain[]): void;
  ask(name: string, detail: Record<string, unknown>): Promise<Outcome>;
  run(name: string, detail: Record<string, unknown>, onOk: (result: Outcome) => void): Promise<void>;
}

let seq = 0;

export const domainsManager: Register = (Alpine) => {
  Alpine.data("nqDomainsManager", (config: DomainsConfig) => ({
    config,
    domains: config.domains.map((d) => ({ ...d })),
    tableRows: [] as Row[],
    value: "",
    fieldInvalid: false,
    error: null as string | null,
    adding: false,
    notice: null as string | null,
    removeOpen: false,
    removing: null as Domain | null,
    alive: true,
    root: null as HTMLElement | null,
    init(this: DomainsState) {
      this.root = this.$el;
      this.tableRows = this.buildRows();
      this.$watch("removeOpen", (open: boolean) => {
        if (!open) this.removing = null;
      });
    },
    destroy(this: DomainsState) {
      this.alive = false;
    },
    buildRows(this: DomainsState): Row[] {
      return this.domains.map((d) => ({ id: d.id, host: d.host, check: d.check, primary: d.primary ? "primary" : "", added: d.addedAt ? d.addedAt.slice(0, 10) : null }));
    },
    sync(this: DomainsState, domains: Domain[]) {
      this.domains = domains;
      this.tableRows = this.buildRows();
    },
    get summaryText(): string {
      const s = this as unknown as DomainsState;
      const sum = summarizeDomains(s.domains);
      return sum.total ? s.config.labels.summary.replace("{verified}", String(sum.verified)).replace("{total}", String(sum.total)) : "";
    },
    get allVerified(): boolean {
      const s = this as unknown as DomainsState;
      const sum = summarizeDomains(s.domains);
      return sum.total > 0 && sum.verified === sum.total;
    },
    get removeTitle(): string {
      const s = this as unknown as DomainsState;
      return s.removing ? s.config.labels.removeTitle.replace("{host}", s.removing.host) : "";
    },
    /** Fire an event on the root and wait for the promise the host hands to `wait`. */
    async ask(this: DomainsState, name: string, detail: Record<string, unknown>): Promise<Outcome> {
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
    async run(this: DomainsState, name: string, detail: Record<string, unknown>, onOk: (result: Outcome) => void) {
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
    onInput(this: DomainsState) {
      this.error = null;
      this.fieldInvalid = false;
    },
    async submit(this: DomainsState) {
      if (this.adding) return;
      const host = normalizeHost(this.value);
      if (!isValidHostname(host)) {
        this.error = this.config.labels.invalid;
        this.fieldInvalid = true;
        return;
      }
      if (this.domains.some((d) => d.host === host)) {
        this.error = this.config.labels.duplicate;
        this.fieldInvalid = true;
        return;
      }
      this.adding = true;
      this.error = null;
      try {
        const result = await this.ask("add", { host });
        if (!this.alive) return;
        if (result && result.error !== undefined) {
          this.error = result.error;
          this.fieldInvalid = true;
        } else {
          this.sync([...this.domains, { id: (result && result.id) || `new-${++seq}`, host, check: "pending", addedAt: new Date().toISOString() }]);
          this.value = "";
        }
      } catch {
        if (this.alive) {
          this.error = this.config.labels.genericError;
          this.fieldInvalid = true;
        }
      } finally {
        if (this.alive) this.adding = false;
      }
    },
    /** Row actions from the table's ⋯ menu. */
    onAction(this: DomainsState, event: CustomEvent<{ action: string; row: { id: string } }>) {
      const { action, row } = event.detail;
      const domain = this.domains.find((d) => d.id === row.id);
      if (!domain) return;
      if (action === "recheck") {
        void this.run("recheck", { id: domain.id }, (result) => {
          if (result && result.check) this.sync(this.domains.map((d) => (d.id === domain.id ? { ...d, check: result.check as DomainCheck } : d)));
        });
      } else if (action === "primary") {
        if (domain.primary) return;
        void this.run("make-primary", { id: domain.id }, () => this.sync(this.domains.map((d) => ({ ...d, primary: d.id === domain.id }))));
      } else if (action === "remove") {
        this.removing = domain;
        this.removeOpen = true;
      }
    },
    confirmRemove(this: DomainsState) {
      const domain = this.removing;
      if (!domain) return;
      void this.run("remove", { id: domain.id }, () => this.sync(this.domains.filter((d) => d.id !== domain.id)));
    },
  }));
};
