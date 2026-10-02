// nqDnsManagement: the add / edit dialog, the delete confirm and the table rows of the DNS records card.
// The markup is the React DnsManagement's; the records live here and feed <x-nq::data-table> through x-model.
//
//   <div x-data="nqDnsManagement({ zone: 'example.com', records: [...], proxy: true, labels: {…} })"
//        @save="$event.detail.wait(…)" @delete="$event.detail.wait(…)" @toggle-proxy="$event.detail.wait(…)"> … </div>
//
// It is presentational: the host does the work. Each action fires an event on the root with detail `{ …, wait(promise) }`:
//   save          { input: { id?, type, name, content, ttl, proxied, priority?, comment? }, wait }  resolve, or { error }; a new record may resolve { id }
//   delete        { id, wait }                                                                      resolve, or resolve { error }
//   toggle-proxy  { id, proxied, wait }                                                             resolve, or resolve { error }
// On success the module updates its own list (add, replace or remove the record), so the table follows without a re-render.
// A rejected promise, or nobody listening, shows the generic error.

import { DEFAULT_TTLS, fqdn, formatTtl, isProxiable, needsPriority, relativeName, TTL_AUTO, validateRecord, type DnsErrors, type TtlUnits } from "./dns-management-logic";
import type { Magics, Register } from "./types";

interface DnsRecord {
  id: string;
  type: string;
  name: string;
  content: string;
  ttl: number;
  proxied?: boolean;
  priority?: number;
  comment?: string;
}

interface DnsConfig {
  zone: string;
  records: DnsRecord[];
  types: string[];
  ttlOptions?: number[];
  proxy?: boolean;
  labels: {
    genericError: string;
    onlyProxiable: string;
    nameHint: string; // "Full name: {name}"
    errors: Record<string, string>;
    /** Unit templates with {n}. `hour`, `day` (singular) and `hours2`, `days2` (dual) are optional. */
    ttlUnits: { auto: string; seconds: string; minutes: string; hours: string; days: string; hour?: string; day?: string; hours2?: string; days2?: string };
  };
}

type Outcome = { error?: string; id?: string } | void | undefined;

interface Row {
  id: string;
  label: string;
  type: string;
  name: string;
  content: string;
  ttl: string;
  proxied: boolean;
}

interface DnsState extends Magics {
  config: DnsConfig;
  records: DnsRecord[];
  tableRows: Row[];
  formOpen: boolean;
  editingId: string | null;
  type: string;
  name: string;
  content: string;
  priority: string;
  ttl: string;
  proxied: boolean;
  comment: string;
  nameInvalid: boolean;
  contentInvalid: boolean;
  priorityInvalid: boolean;
  errors: Record<string, string>;
  formError: string | null;
  pageError: string | null;
  pending: boolean;
  deleteOpen: boolean;
  deleting: DnsRecord | null;
  deletePending: boolean;
  alive: boolean;
  root: HTMLElement | null;
  units: TtlUnits;
  buildRows(): Row[];
  sync(records: DnsRecord[]): void;
  resetForm(record: DnsRecord | null): void;
  openEdit(id: string): void;
  pickType(): void;
  ask(name: string, detail: Record<string, unknown>): Promise<Outcome>;
}

const PLACEHOLDERS: Record<string, string> = {
  A: "203.0.113.10",
  AAAA: "2001:db8::1",
  CNAME: "target.example.com",
  MX: "mail.example.com",
  TXT: "v=spf1 include:_spf.example.com ~all",
  NS: "ns1.example.com",
  SRV: "target.example.com",
  CAA: "0 issue \"letsencrypt.org\"",
};

const fill = (template: string, n: number) => template.replace("{n}", String(n));

function makeUnits(u: DnsConfig["labels"]["ttlUnits"]): TtlUnits {
  return {
    auto: u.auto,
    seconds: (n) => fill(u.seconds, n),
    minutes: (n) => fill(u.minutes, n),
    hours: (n) => (n === 1 && u.hour ? u.hour : n === 2 && u.hours2 ? u.hours2 : fill(u.hours, n)),
    days: (n) => (n === 1 && u.day ? u.day : n === 2 && u.days2 ? u.days2 : fill(u.days, n)),
  };
}

export const dnsManagement: Register = (Alpine) => {
  Alpine.data("nqDnsManagement", (config: DnsConfig) => ({
    config,
    records: config.records.map((r) => ({ ...r })),
    tableRows: [] as Row[],
    formOpen: false,
    editingId: null as string | null,
    type: config.types[0] ?? "A",
    name: "",
    content: "",
    priority: "10",
    ttl: String(TTL_AUTO),
    proxied: false,
    comment: "",
    nameInvalid: false,
    contentInvalid: false,
    priorityInvalid: false,
    errors: {} as Record<string, string>,
    formError: null as string | null,
    pageError: null as string | null,
    pending: false,
    deleteOpen: false,
    deleting: null as DnsRecord | null,
    deletePending: false,
    alive: true,
    root: null as HTMLElement | null,
    units: makeUnits(config.labels.ttlUnits),
    init(this: DnsState) {
      this.root = this.$el;
      this.tableRows = this.buildRows();
      this.$watch("type", () => this.pickType());
      // The delete confirm closes through x-model; forget the record once it has gone.
      this.$watch("deleteOpen", (open: boolean) => {
        if (!open && !this.deletePending) this.deleting = null;
      });
    },
    destroy(this: DnsState) {
      this.alive = false;
    },
    buildRows(this: DnsState): Row[] {
      return this.records.map((r) => {
        const rel = relativeName(r.name, this.config.zone);
        return {
          id: r.id,
          label: `${r.type} ${rel}`,
          type: r.type,
          name: rel,
          content: r.priority !== undefined && needsPriority(r.type) ? `${r.priority} ${r.content}` : r.content,
          ttl: formatTtl(r.ttl, this.units),
          proxied: r.proxied === true,
        };
      });
    },
    sync(this: DnsState, records: DnsRecord[]) {
      this.records = records;
      this.tableRows = this.buildRows();
    },
    get canProxy(): boolean {
      const s = this as unknown as DnsState;
      return s.config.proxy !== false && isProxiable(s.type);
    },
    get placeholder(): string {
      return PLACEHOLDERS[(this as unknown as DnsState).type] ?? "";
    },
    get showPriority(): boolean {
      return needsPriority((this as unknown as DnsState).type);
    },
    get fullName(): string {
      const s = this as unknown as DnsState;
      return s.config.labels.nameHint.replace("{name}", fqdn(s.name || "@", s.config.zone));
    },
    /** TTL choices for the select: the configured ones, plus the current value of a record being edited. */
    get ttlChoices(): { value: string; label: string }[] {
      const s = this as unknown as DnsState;
      const items = (s.config.ttlOptions ?? DEFAULT_TTLS).map((v) => ({ value: String(v), label: formatTtl(v, s.units) }));
      if (!items.some((i) => i.value === s.ttl) && Number.isFinite(Number(s.ttl))) items.push({ value: s.ttl, label: formatTtl(Number(s.ttl), s.units) });
      return items;
    },
    resetForm(this: DnsState, record: DnsRecord | null) {
      this.editingId = record?.id ?? null;
      this.type = record?.type ?? this.config.types[0] ?? "A";
      this.name = record ? relativeName(record.name, this.config.zone) : "";
      this.content = record?.content ?? "";
      this.priority = String(record?.priority ?? 10);
      this.ttl = String(record?.ttl ?? TTL_AUTO);
      this.proxied = record?.proxied ?? false;
      this.comment = record?.comment ?? "";
      this.nameInvalid = this.contentInvalid = this.priorityInvalid = false;
      this.errors = {};
      this.formError = null;
    },
    openAdd(this: DnsState) {
      this.resetForm(null);
      this.formOpen = true;
    },
    openEdit(this: DnsState, id: string) {
      const record = this.records.find((r) => r.id === id);
      if (!record) return;
      this.resetForm(record);
      this.formOpen = true;
    },
    pickType(this: DnsState) {
      if (!isProxiable(this.type)) this.proxied = false;
    },
    /** Row actions from the table's ⋯ menu. */
    onAction(this: DnsState, event: CustomEvent<{ action: string; row: { id: string } }>) {
      const { action, row } = event.detail;
      if (action === "edit") this.openEdit(row.id);
      else if (action === "delete") {
        const record = this.records.find((r) => r.id === row.id);
        if (!record) return;
        this.deleting = record;
        this.deleteOpen = true;
      }
    },
    /** The proxy switch in the table. */
    onEdit(this: DnsState, event: CustomEvent<{ row: { id: string }; column: string; value: unknown; promise?: Promise<unknown> }>) {
      const detail = event.detail;
      if (detail.column !== "proxied") return;
      const record = this.records.find((r) => r.id === detail.row.id);
      if (!record) return;
      const proxied = detail.value === true;
      if (!isProxiable(record.type)) {
        detail.promise = Promise.resolve({ error: this.config.labels.onlyProxiable });
        return;
      }
      detail.promise = this.ask("toggle-proxy", { id: record.id, proxied }).then((result) => {
        if (result && result.error !== undefined) return result;
        if (this.alive) this.sync(this.records.map((r) => (r.id === record.id ? { ...r, proxied } : r)));
        return undefined;
      });
    },
    /** Fire an event on the root and wait for the promise the host hands to `wait`. */
    async ask(this: DnsState, name: string, detail: Record<string, unknown>): Promise<Outcome> {
      let pending: Promise<Outcome> | undefined;
      const event = new CustomEvent(name, {
        bubbles: true,
        detail: { ...detail, wait: (p: Promise<Outcome>) => (pending = Promise.resolve(p)) },
      });
      (this.root ?? this.$el).dispatchEvent(event);
      if (!pending) throw new Error("no listener");
      return pending;
    },
    async submit(this: DnsState) {
      if (this.pending) return;
      const proxied = this.config.proxy !== false && isProxiable(this.type) ? this.proxied : false;
      const draft = {
        type: this.type,
        name: this.name,
        content: this.content,
        ttl: Number(this.ttl),
        priority: needsPriority(this.type) ? Number(this.priority) : undefined,
        proxied,
      };
      const found: DnsErrors = validateRecord(draft, this.config.zone, this.records, this.editingId ?? undefined);
      const e = this.config.labels.errors;
      this.errors = {
        name: found.name ? (e[found.name] ?? "") : "",
        content: found.content ? (e[found.content] ?? "") : "",
        priority: found.priority ? (e[found.priority] ?? "") : "",
        ttl: found.ttl ? (e[found.ttl] ?? "") : "",
      };
      this.nameInvalid = !!found.name;
      this.contentInvalid = !!found.content;
      this.priorityInvalid = !!found.priority;
      this.formError = found.ttl ? (e[found.ttl] ?? "") : null;
      if (Object.keys(found).length > 0) return;
      const input: Record<string, unknown> = {
        ...(this.editingId ? { id: this.editingId } : {}),
        type: this.type,
        name: relativeName(this.name, this.config.zone),
        content: this.content.trim(),
        ttl: draft.ttl,
        proxied,
        ...(draft.priority !== undefined ? { priority: draft.priority } : {}),
        ...(this.comment.trim() ? { comment: this.comment.trim() } : {}),
      };
      this.pending = true;
      try {
        const result = await this.ask("save", { input });
        if (!this.alive) return;
        if (result && result.error !== undefined) this.formError = result.error;
        else {
          const saved = { ...input, id: (input.id as string | undefined) ?? (result && result.id) ?? hostId(this.records) } as DnsRecord;
          this.sync(this.editingId ? this.records.map((r) => (r.id === this.editingId ? saved : r)) : [...this.records, saved]);
          this.formOpen = false;
        }
      } catch {
        if (this.alive) this.formError = this.config.labels.genericError;
      } finally {
        if (this.alive) this.pending = false;
      }
    },
    async confirmDelete(this: DnsState) {
      const record = this.deleting;
      if (!record || this.deletePending) return;
      this.deletePending = true;
      this.pageError = null;
      try {
        const result = await this.ask("delete", { id: record.id });
        if (!this.alive) return;
        if (result && result.error !== undefined) this.pageError = result.error;
        else this.sync(this.records.filter((r) => r.id !== record.id));
      } catch {
        if (this.alive) this.pageError = this.config.labels.genericError;
      } finally {
        if (this.alive) {
          this.deletePending = false;
          this.deleteOpen = false;
          this.deleting = null;
        }
      }
    },
  }));
};

let seq = 0;
/** An id for a record added here, until the host re-renders with its own. */
function hostId(existing: DnsRecord[]): string {
  let id: string;
  do id = `new-${++seq}`;
  while (existing.some((r) => r.id === id));
  return id;
}
