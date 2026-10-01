// nqDesktopLocations: add, remove, permissions, make default and re-index for the desktop locations list.
// The markup is the React DesktopLocations', the list is server-rendered, the state lives here.
//
//   <section x-data="nqDesktopLocations({ paths: [...], labels: {…} })">
//     <li x-data="nqDesktopLocationRow({ id, locked, permissions })"> … switches x-model="p.read" … </li>
//   </section>
//
// It has no filesystem access: every action fires a waitable event on the root and the host does the work.
//   nq-location-add          { path, permissions: { read, write, index }, waitUntil }  resolve, or { error } to keep the dialog open
//   nq-location-remove       { id, waitUntil }
//   nq-location-permissions  { id, permissions, waitUntil }                            on { error } the switches go back
//   nq-location-default      { id, waitUntil }      nq-location-reindex  { id, waitUntil }
//   nq-location-browse       { waitUntil }          resolve the picked path, or null
// e.g. x-on:nq-location-add="$event.detail.waitUntil(fetch('/roots', { method: 'POST', body: $event.detail.path }))".
// A rejected promise, or nobody listening, shows the generic error. After a change the host re-renders the list.

import { checkLocationPath, normalizePath } from "./location-path";
import type { Magics, Register } from "./types";

interface Permissions {
  read: boolean;
  write: boolean;
  index: boolean;
}

interface LocationsConfig {
  paths: string[];
  labels: {
    genericError: string;
    problemEmpty: string;
    problemRelative: string;
    problemDuplicate: string;
    warnInside: string;
    warnContains: string;
    removeTitle: string;
  };
}

interface RowConfig {
  id: string;
  locked: boolean;
  permissions: Permissions;
}

type Outcome = { error?: string } | string | null | void | undefined;

interface LocationsState extends Magics {
  config: LocationsConfig;
  root: HTMLElement | null;
  pageError: string | null;
  busyId: string | null;
  addOpen: boolean;
  path: string;
  touched: boolean;
  perms: Permissions;
  problem: string | null;
  problemText: string;
  warnText: string;
  pathInvalid: boolean;
  formError: string | null;
  pending: boolean;
  browsing: boolean;
  removeOpen: boolean;
  removeId: string;
  removeName: string;
  removePath: string;
  removeError: string | null;
  removing: boolean;
  alive: boolean;
  ask(name: string, detail: Record<string, unknown>): Promise<Outcome>;
  validate(): void;
}

export const desktopLocations: Register = (Alpine) => {
  Alpine.data("nqDesktopLocations", (config: LocationsConfig) => ({
    config,
    root: null as HTMLElement | null,
    pageError: null as string | null,
    busyId: null as string | null,
    addOpen: false,
    path: "",
    touched: false,
    perms: { read: true, write: false, index: true } as Permissions,
    problem: null as string | null,
    problemText: "",
    warnText: "",
    pathInvalid: false,
    formError: null as string | null,
    pending: false,
    browsing: false,
    removeOpen: false,
    removeId: "",
    removeName: "",
    removePath: "",
    removeError: null as string | null,
    removing: false,
    alive: true,
    init(this: LocationsState) {
      this.root = this.$el;
      // A busy dialog cannot be dismissed (Escape, backdrop), as in React.
      this.$watch("addOpen", (open: boolean) => {
        if (!open && this.pending) this.addOpen = true;
      });
      this.$watch("removeOpen", (open: boolean) => {
        if (!open && this.removing) this.removeOpen = true;
      });
    },
    destroy(this: LocationsState) {
      this.alive = false;
    },
    /** Fire a waitable event on the root and wait for the promise the host hands to waitUntil. */
    async ask(this: LocationsState, name: string, detail: Record<string, unknown>): Promise<Outcome> {
      let pending: Promise<Outcome> | undefined;
      const event = new CustomEvent(name, {
        bubbles: true,
        detail: { ...detail, waitUntil: (p: Promise<Outcome>) => (pending = Promise.resolve(p)) },
      });
      (this.root ?? this.$el).dispatchEvent(event);
      if (!pending) throw new Error("no listener");
      return pending;
    },
    /** A row action: true when it went through, false when it failed (the message is shown on the page). */
    async run(this: LocationsState, id: string, name: string, detail: Record<string, unknown>): Promise<boolean> {
      this.busyId = id;
      this.pageError = null;
      let ok = true;
      try {
        const result = await this.ask(name, detail);
        if (result && typeof result === "object" && result.error) {
          ok = false;
          if (this.alive) this.pageError = result.error;
        }
      } catch {
        ok = false;
        if (this.alive) this.pageError = this.config.labels.genericError;
      } finally {
        if (this.alive) this.busyId = null;
      }
      return ok;
    },
    openAdd(this: LocationsState) {
      this.path = "";
      this.touched = false;
      this.perms = { read: true, write: false, index: true };
      this.formError = null;
      this.addOpen = true;
    },
    /** Recomputes the path problem and warning. Run from x-effect, so it re-runs when the path changes. */
    validate(this: LocationsState) {
      const l = this.config.labels;
      const check = checkLocationPath(this.path, this.config.paths);
      this.problem = check.problem;
      this.problemText = check.problem === "empty" ? l.problemEmpty : check.problem === "relative" ? l.problemRelative : check.problem === "duplicate" ? l.problemDuplicate : "";
      this.pathInvalid = this.problemText !== "" && (this.touched || check.problem === "duplicate");
      this.warnText = check.warning && check.other ? (check.warning === "inside" ? l.warnInside : l.warnContains).replace("{other}", check.other) : "";
      // Write and the search index need read.
      if (!this.perms.read && (this.perms.write || this.perms.index)) this.perms = { read: false, write: false, index: false };
    },
    async browse(this: LocationsState) {
      this.browsing = true;
      try {
        const picked = await this.ask("nq-location-browse", {});
        if (typeof picked === "string" && picked) {
          this.path = picked;
          this.touched = true;
        }
      } catch {
        this.formError = this.config.labels.genericError;
      } finally {
        if (this.alive) this.browsing = false;
      }
    },
    async submitAdd(this: LocationsState) {
      this.touched = true;
      this.validate();
      if (this.problem || this.pending) return;
      this.pending = true;
      this.formError = null;
      try {
        const result = await this.ask("nq-location-add", { path: normalizePath(this.path), permissions: { ...this.perms } });
        if (!this.alive) return;
        if (result && typeof result === "object" && result.error) this.formError = result.error;
        else {
          this.pending = false;
          this.addOpen = false;
        }
      } catch {
        if (this.alive) this.formError = this.config.labels.genericError;
      } finally {
        if (this.alive) this.pending = false;
      }
    },
    askRemove(this: LocationsState, id: string, name: string, path: string) {
      this.removeId = id;
      this.removeName = name;
      this.removePath = path;
      this.removeError = null;
      this.removeOpen = true;
    },
    removeTitle(this: LocationsState) {
      return this.config.labels.removeTitle.replace("{name}", this.removeName);
    },
    async confirmRemove(this: LocationsState) {
      if (this.removing) return;
      this.removing = true;
      this.removeError = null;
      try {
        const result = await this.ask("nq-location-remove", { id: this.removeId });
        if (!this.alive) return;
        if (result && typeof result === "object" && result.error) this.removeError = result.error;
        else {
          this.removing = false;
          this.removeOpen = false;
        }
      } catch {
        if (this.alive) this.removeError = this.config.labels.genericError;
      } finally {
        if (this.alive) this.removing = false;
      }
    },
  }));

  // One location row: its permission switches. The row's switches are x-model'd to `p`; a change goes to the host.
  Alpine.data("nqDesktopLocationRow", (config: RowConfig) => ({
    id: config.id,
    locked: config.locked,
    p: { ...config.permissions } as Permissions,
    last: { ...config.permissions } as Permissions,
    sending: false,
    init(this: { p: Permissions; changed(): void; $watch(k: string, cb: () => void): void }) {
      // The switches are x-modelable, so a click reaches p after the click handler; watching p catches it at the right time.
      this.$watch("p", () => this.changed());
    },
    off(this: { locked: boolean; busyId: string | null; id: string; p: Permissions }, key: keyof Permissions) {
      return this.locked || this.busyId === this.id || (key !== "read" && !this.p.read);
    },
    async changed(this: { id: string; p: Permissions; last: Permissions; sending: boolean; $nextTick(): Promise<void>; run(id: string, name: string, detail: Record<string, unknown>): Promise<boolean> }) {
      if (this.sending) return;
      if (!this.p.read && (this.p.write || this.p.index)) this.p = { ...this.p, write: false, index: false };
      const next = { ...this.p };
      if (next.read === this.last.read && next.write === this.last.write && next.index === this.last.index) return;
      this.sending = true;
      const ok = await this.run(this.id, "nq-location-permissions", { id: this.id, permissions: next });
      if (ok) this.last = next;
      else this.p = { ...this.last };
      await this.$nextTick();
      this.sending = false;
    },
  }));
};
