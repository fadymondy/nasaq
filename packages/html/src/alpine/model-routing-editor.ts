// nqModelRoutingEditor: which model handles each task class (with a fallback), the active backend, and registering providers.
// The markup is the React ModelRoutingEditor's, the lists are server-rendered, the state lives here.
//
//   <form x-data="nqModelRoutingEditor({ tasks, models, providers, value: { auto, routes, backend }, labels })"> … </form>
//
// It stores nothing: every action fires a waitable event on the root and the host does the work.
//   nq-routing-save             { value: { auto, routes, backend }, waitUntil }                 resolve, or { error } to show a failure
//   nq-routing-register         { name, kind: "cloud" | "node", endpoint, modalities, waitUntil }  resolve, or { error } to keep the dialog open
//   nq-routing-remove-provider  { id, waitUntil }
// e.g. x-on:nq-routing-save="$event.detail.waitUntil(fetch('/routing', { method: 'PUT', body: JSON.stringify($event.detail.value) }))".
// A rejected promise, or nobody listening, shows the generic error. After a registration or removal the host re-renders the providers.

import { MODALITIES, routingEquals, routingIssues, validateProvider, type RoutingIssue, type RoutingModality, type RoutingValue } from "./routing-math";
import type { Magics, Register } from "./types";

const NONE = "__none__";

interface Config {
  tasks: { id: string; modality?: RoutingModality }[];
  models: { id: string; modalities?: RoutingModality[] }[];
  providers: { id: string; name: string }[];
  value: { auto: boolean; routes?: RoutingValue["routes"] | []; backend?: string };
  labels: Record<string, string>;
}

interface Row {
  model: string | null;
  fallback: string;
}

interface Flags {
  model: boolean;
  same: boolean;
  any: boolean;
  kind: RoutingIssue["kind"] | null;
}

type Outcome = { error?: string } | void | null | undefined;

interface State extends Magics {
  config: Config;
  root: HTMLElement | null;
  auto: boolean;
  rows: Row[];
  backendSel: string[];
  baseline: RoutingValue;
  flags: Flags[];
  submitted: boolean;
  busy: boolean;
  failure: string | null;
  justSaved: boolean;
  registerOpen: boolean;
  regName: string;
  regKind: string[];
  regEndpoint: string;
  regMods: string[];
  regSubmitted: boolean;
  regBusy: boolean;
  regFailure: string | null;
  regFlags: { name: boolean; endpoint: boolean; modalities: boolean };
  regMessages: { name: string; endpoint: string; modalities: string };
  alive: boolean;
  lastBackend: string;
  dirty: boolean;
  issues: RoutingIssue[];
  value(): RoutingValue;
  sync(): void;
  regSync(): void;
  regReset(): void;
  ask(name: string, detail: Record<string, unknown>): Promise<Outcome>;
}

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

export const modelRoutingEditor: Register = (Alpine) => {
  Alpine.data("nqModelRoutingEditor", (config: Config) => {
    const routes = (Array.isArray(config.value.routes) ? {} : (config.value.routes ?? {})) as RoutingValue["routes"];
    const rows: Row[] = config.tasks.map((t) => ({ model: routes[t.id]?.model ?? null, fallback: routes[t.id]?.fallback ?? NONE }));
    const backend = config.value.backend ?? config.providers[0]?.id;
    return {
      config,
      root: null as HTMLElement | null,
      auto: !!config.value.auto,
      rows,
      backendSel: backend ? [backend] : ([] as string[]),
      baseline: null as unknown as RoutingValue,
      flags: config.tasks.map(() => ({ model: false, same: false, any: false, kind: null })) as Flags[],
      submitted: false,
      busy: false,
      failure: null as string | null,
      justSaved: false,
      registerOpen: false,
      regName: "",
      regKind: ["cloud"] as string[],
      regEndpoint: "",
      regMods: ["text"] as string[],
      regSubmitted: false,
      regBusy: false,
      regFailure: null as string | null,
      regFlags: { name: false, endpoint: false, modalities: false },
      regMessages: { name: "", endpoint: "", modalities: "" },
      alive: true,
      lastBackend: backend ?? "",
      init(this: State) {
        this.root = this.$el;
        this.baseline = this.value();
        // The selects, the switch and the toggle groups are x-modelable, so watching the state sees every change.
        const changed = () => {
          this.justSaved = false;
          this.sync();
        };
        this.$watch("rows", changed);
        this.$watch("auto", changed);
        this.$watch("backendSel", (v: string[]) => {
          // A single-choice group: pressing the active one again keeps it.
          if (v.length === 0) {
            if (this.lastBackend) this.backendSel = [this.lastBackend];
          } else {
            this.lastBackend = v[0]!;
            changed();
          }
        });
        this.$watch("submitted", () => this.sync());
        this.$watch("regKind", (v: string[]) => {
          if (v.length === 0) this.regKind = ["cloud"];
          else if (v.length > 1) this.regKind = [v[v.length - 1]!];
        });
        this.$watch("regName", () => this.regSync());
        this.$watch("regEndpoint", () => this.regSync());
        this.$watch("regMods", (v: string[]) => {
          const ordered = MODALITIES.filter((m) => v.includes(m)) as string[];
          if (!sameList(ordered, v)) this.regMods = ordered;
          else this.regSync();
        });
        this.$watch("regSubmitted", () => this.regSync());
        // A busy dialog cannot be dismissed (Escape, backdrop), and closing resets the form, as in React.
        this.$watch("registerOpen", (open: boolean) => {
          if (open) return;
          if (this.regBusy) this.registerOpen = true;
          else this.regReset();
        });
        this.sync();
      },
      destroy(this: State) {
        this.alive = false;
      },
      value(this: State): RoutingValue {
        const out: RoutingValue["routes"] = {};
        this.config.tasks.forEach((t, n) => {
          const r = this.rows[n]!;
          if (r.model || r.fallback !== NONE) out[t.id] = { model: r.model || undefined, fallback: r.fallback !== NONE ? r.fallback : undefined };
        });
        return { auto: this.auto, routes: out, backend: this.backendSel[0] };
      },
      get issues(): RoutingIssue[] {
        return routingIssues((this as unknown as State).value(), (this as unknown as State).config.tasks, (this as unknown as State).config.models);
      },
      get dirty(): boolean {
        return !routingEquals((this as unknown as State).value(), (this as unknown as State).baseline);
      },
      status(this: State) {
        return this.dirty ? this.config.labels.dirty : this.justSaved ? this.config.labels.saved : "";
      },
      /** Which rows show a problem: after a save attempt, or at once for "same" and "unknown". */
      sync(this: State) {
        const found = this.issues;
        this.flags = this.config.tasks.map((t) => {
          const kind = found.find((i) => i.taskId === t.id)?.kind ?? null;
          const show = !!kind && (this.submitted || kind === "same" || kind === "unknown");
          return { kind: show ? kind : null, model: show && kind !== "same", same: show && kind === "same", any: show };
        });
      },
      issueText(this: State, n: number) {
        const k = this.flags[n]?.kind;
        return k ? this.config.labels[k] ?? "" : "";
      },
      isActive(this: State, n: number) {
        return this.backendSel[0] === this.config.providers[n]?.id;
      },
      async ask(this: State, name: string, detail: Record<string, unknown>): Promise<Outcome> {
        let pending: Promise<Outcome> | undefined;
        const event = new CustomEvent(name, {
          bubbles: true,
          detail: { ...detail, waitUntil: (p: Promise<Outcome>) => (pending = Promise.resolve(p)) },
        });
        (this.root ?? this.$el).dispatchEvent(event);
        // An empty message means "nobody listened": the caller shows its generic text.
        if (!pending) throw new Error("");
        return pending;
      },
      async submit(this: State) {
        this.submitted = true;
        this.sync();
        if (this.issues.length > 0) return;
        this.busy = true;
        this.failure = null;
        let error: string | undefined;
        const value = this.value();
        try {
          const r = await this.ask("nq-routing-save", { value });
          if (r && typeof r === "object" && r.error) error = r.error;
        } catch (e) {
          error = e instanceof Error && e.message ? e.message : (this.config.labels.failed ?? "");
        }
        if (!this.alive) return;
        this.busy = false;
        if (error) {
          this.failure = error;
          return;
        }
        this.baseline = value;
        this.submitted = false;
        this.justSaved = true;
      },
      discard(this: State) {
        const b = this.baseline;
        this.config.tasks.forEach((t, n) => {
          this.rows[n] = { model: b.routes[t.id]?.model ?? null, fallback: b.routes[t.id]?.fallback ?? NONE };
        });
        this.rows = [...this.rows];
        this.auto = b.auto;
        this.backendSel = b.backend ? [b.backend] : [];
        this.submitted = false;
        this.failure = null;
        this.sync();
      },
      async removeProvider(this: State, n: number) {
        const p = this.config.providers[n];
        if (!p) return;
        this.failure = null;
        try {
          const r = await this.ask("nq-routing-remove-provider", { id: p.id });
          if (r && typeof r === "object" && r.error) this.failure = r.error;
        } catch (e) {
          this.failure = e instanceof Error && e.message ? e.message : (this.config.labels.failed ?? "");
        }
      },
      /** The register dialog's validation, run on every change; the messages show after the first submit. */
      regSync(this: State) {
        const errors = validateProvider({ name: this.regName, endpoint: this.regEndpoint, modalities: this.regMods as RoutingModality[] }, this.config.providers);
        const l = this.config.labels;
        this.regMessages = {
          name: errors.name === "required" ? l.nameRequired! : errors.name === "duplicate" ? l.nameDuplicate! : "",
          endpoint: errors.endpoint === "required" ? l.endpointRequired! : errors.endpoint === "invalid" ? l.endpointInvalid! : "",
          modalities: errors.modalities ? l.modalitiesRequired! : "",
        };
        this.regFlags = {
          name: this.regSubmitted && !!errors.name,
          endpoint: this.regSubmitted && !!errors.endpoint,
          modalities: this.regSubmitted && !!errors.modalities,
        };
      },
      regReset(this: State) {
        this.regName = "";
        this.regKind = ["cloud"];
        this.regEndpoint = "";
        this.regMods = ["text"];
        this.regSubmitted = false;
        this.regFailure = null;
        this.regSync();
      },
      async register(this: State) {
        this.regSubmitted = true;
        this.regSync();
        if (this.regMessages.name || this.regMessages.endpoint || this.regMessages.modalities) return;
        this.regBusy = true;
        this.regFailure = null;
        let error: string | undefined;
        try {
          const r = await this.ask("nq-routing-register", { name: this.regName.trim(), kind: this.regKind[0], endpoint: this.regEndpoint.trim(), modalities: [...this.regMods] });
          if (r && typeof r === "object" && r.error) error = r.error;
        } catch (e) {
          error = e instanceof Error && e.message ? e.message : this.config.labels.registerFailed;
        }
        if (!this.alive) return;
        this.regBusy = false;
        if (error) {
          this.regFailure = error;
          return;
        }
        this.registerOpen = false;
      },
    };
  });
};
