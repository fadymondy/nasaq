// nqProxyHosts: reverse-proxy hosts. The table is an <x-nq::data-table> fed through x-model (domains, forwards-to, TLS, WebSockets, status,
// an enabled switch); the add / edit dialog and the delete confirmation live here. The markup is the React ProxyHosts'.
//
//   <div x-data="nqProxyHosts({ hosts, can, locale, labels })" @save-host="$event.detail.wait(…)" @delete-host="…" @toggle-host="…"> … </div>
//
// It is presentational: every action fires an event on the root with detail `{ …, wait(promise) }`; resolve, or resolve `{ error }` to show it.
// A rejected promise, or nobody listening, shows the generic error. After a success the list is updated here (a new host takes the `id` the handler returns, or a generated one).
//   save-host    { id?, hosts, upstream, tlsMode, websockets, enabled }   -> { error?, id? }
//   delete-host  { id }                                                  -> { error? }
//   toggle-host  { id, enabled }                                         -> { error? }   (the in-cell switch; an error rolls it back and is shown)

import { parseHosts, tlsModeAllowsWebsockets, validateProxyHost, type TlsMode } from "./proxy-hosts-logic";
import type { Magics, Register } from "./types";

interface Host {
  id: string;
  hosts: string[];
  upstream: string;
  tlsMode: TlsMode;
  websockets: boolean;
  enabled: boolean;
  status?: "online" | "offline" | "unknown";
}
interface Labels {
  genericError: string;
  deleteTitle: string;
  more: string;
  moreLabel?: string;
}
interface Config {
  hosts: Host[];
  can: { toggle: boolean };
  labels: Labels;
}
type Row = Record<string, unknown>;
type Outcome = { error?: string; id?: string } | void | undefined;

interface Form {
  open: boolean;
  editingId: string | null;
  hostsText: string;
  upstream: string;
  tls: string;
  websockets: boolean;
  enabled: boolean;
  touched: boolean;
  pending: boolean;
  error: string | null;
  invalid: { hosts: boolean; upstream: boolean };
}

interface State extends Magics {
  config: Config;
  items: Host[];
  table: { rows: Row[] };
  notice: string | null;
  form: Form;
  confirm: { open: boolean; title: string; id: string };
  alive: boolean;
  root: HTMLElement | null;
  refresh(): void;
  call(name: string, detail: Record<string, unknown>): Promise<Outcome>;
  openForm(id: string | null): void;
  validateForm(): string[];
}

const fill = (template: string, vars: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_m, k: string) => String(vars[k] ?? ""));
let seq = 0;
const newId = () => `new-${Date.now().toString(36)}${++seq}`;

export const proxyHosts: Register = (Alpine) => {
  Alpine.data("nqProxyHosts", (config: Config) => ({
    config,
    items: config.hosts.map((h) => ({ ...h, hosts: [...h.hosts] })),
    table: { rows: [] as Row[] },
    notice: null as string | null,
    form: { open: false, editingId: null, hostsText: "", upstream: "", tls: "auto", websockets: false, enabled: true, touched: false, pending: false, error: null, invalid: { hosts: false, upstream: false } } as Form,
    confirm: { open: false, title: "", id: "" },
    alive: true,
    root: null as HTMLElement | null,

    init(this: State) {
      this.root = this.$el;
      this.refresh();
    },
    destroy(this: State) {
      this.alive = false;
    },

    refresh(this: State) {
      this.table.rows = this.items.map((h) => ({
        id: h.id,
        hosts: [...h.hosts],
        shown: h.hosts.slice(0, h.hosts.length > 3 ? 2 : 3),
        more: h.hosts.length > 3 ? fill(this.config.labels.more, { n: h.hosts.length - 2 }) : "",
        moreLabel: h.hosts.length > 3 ? fill(this.config.labels.moreLabel ?? "", { n: h.hosts.length - 2 }) : "",
        rest: h.hosts.length > 3 ? h.hosts.slice(2) : [],
        hostsText: h.hosts.join(" "),
        upstream: h.upstream,
        tls: h.tlsMode,
        ws: h.websockets,
        status: h.status ?? "unknown",
        enabled: h.enabled,
      }));
    },

    async call(this: State, name: string, detail: Record<string, unknown>): Promise<Outcome> {
      let pending: Promise<Outcome> | undefined;
      const event = new CustomEvent(name, { bubbles: true, detail: { ...detail, wait: (x: Promise<Outcome>) => (pending = Promise.resolve(x)) } });
      (this.root ?? this.$el).dispatchEvent(event);
      if (!pending) throw new Error("no listener");
      return await pending;
    },

    /* ---- the switch in a cell and the row actions ---- */
    onEdit(this: State, event: CustomEvent<{ row: { id: string }; column: string; value: unknown; promise?: Promise<unknown> }>) {
      const { row, column, value } = event.detail;
      if (column !== "enabled") return;
      event.detail.promise = (this as unknown as { toggle(id: string, on: boolean): Promise<{ error: string } | undefined> }).toggle(row.id, value === true);
    },
    async toggle(this: State, id: string, enabled: boolean) {
      this.notice = null;
      try {
        const r = await this.call("toggle-host", { id, enabled });
        if (r && r.error) {
          this.notice = r.error;
          return { error: r.error };
        }
        const h = this.items.find((x) => x.id === id);
        if (h) h.enabled = enabled;
        return undefined;
      } catch {
        this.notice = this.config.labels.genericError;
        return { error: this.config.labels.genericError };
      }
    },
    onAction(this: State, event: CustomEvent<{ action: string; row: { id: string } }>) {
      const { action, row } = event.detail;
      if (action === "edit") this.openForm(row.id);
      else if (action === "delete") (this as unknown as { askDelete(id: string): void }).askDelete(row.id);
    },

    /* ---- the dialog ---- */
    openForm(this: State, id: string | null) {
      const h = id ? this.items.find((x) => x.id === id) : undefined;
      this.form = {
        open: true,
        editingId: h ? h.id : null,
        hostsText: h ? h.hosts.join("\n") : "",
        upstream: h?.upstream ?? "",
        tls: h?.tlsMode ?? "auto",
        websockets: h?.websockets ?? false,
        enabled: h?.enabled ?? true,
        touched: false,
        pending: false,
        error: null,
        invalid: { hosts: false, upstream: false },
      };
    },
    get wsBlocked(): boolean {
      return !tlsModeAllowsWebsockets((this as unknown as State).form.tls as TlsMode);
    },
    onFormInput(this: State) {
      if (this.form.touched) this.validateForm();
    },
    validateForm(this: State): string[] {
      const f = this.form;
      const errors = validateProxyHost({ hosts: parseHosts(f.hostsText), upstream: f.upstream });
      f.invalid = { hosts: errors.includes("hosts"), upstream: errors.includes("upstream") };
      return errors;
    },
    async saveForm(this: State) {
      const f = this.form;
      f.touched = true;
      if (this.validateForm().length || f.pending) return;
      f.pending = true;
      f.error = null;
      const hosts = parseHosts(f.hostsText);
      const input = {
        ...(f.editingId ? { id: f.editingId } : {}),
        hosts,
        upstream: f.upstream.trim(),
        tlsMode: f.tls as TlsMode,
        websockets: tlsModeAllowsWebsockets(f.tls as TlsMode) && f.websockets,
        enabled: f.enabled,
      };
      try {
        const r = await this.call("save-host", input);
        if (!this.alive) return;
        if (r && r.error) {
          f.error = r.error;
          return;
        }
        if (f.editingId) {
          const h = this.items.find((x) => x.id === f.editingId);
          if (h) Object.assign(h, { hosts: input.hosts, upstream: input.upstream, tlsMode: input.tlsMode, websockets: input.websockets, enabled: input.enabled });
        } else {
          this.items = [...this.items, { id: (r && r.id) || newId(), hosts: input.hosts, upstream: input.upstream, tlsMode: input.tlsMode, websockets: input.websockets, enabled: input.enabled, status: "unknown" }];
        }
        f.open = false;
        this.refresh();
      } catch {
        if (this.alive) f.error = this.config.labels.genericError;
      } finally {
        if (this.alive) f.pending = false;
      }
    },

    /* ---- delete asks first ---- */
    askDelete(this: State, id: string) {
      const h = this.items.find((x) => x.id === id);
      if (!h) return;
      this.confirm = { open: true, title: fill(this.config.labels.deleteTitle, { name: h.hosts[0] ?? "" }), id };
    },
    /** Runs after the dialog's own action button has closed it; the target is held in `confirm`. */
    async runConfirm(this: State) {
      const id = this.confirm.id;
      this.notice = null;
      try {
        const r = await this.call("delete-host", { id });
        if (!this.alive) return;
        if (r && r.error) {
          this.notice = r.error;
          return;
        }
        this.items = this.items.filter((x) => x.id !== id);
        this.refresh();
      } catch {
        if (this.alive) this.notice = this.config.labels.genericError;
      }
    },
  }));
};
