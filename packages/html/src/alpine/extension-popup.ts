// nqExtensionPopup / nqExtensionConnect / nqExtensionOptions: the state behind the browser-extension components. The markup is the React component's.
//
//   <div data-slot="extension-popup" x-data="nqExtensionPopup({ paused: false, status: 'connected' })" x-modelable="paused" x-bind:data-state="state()">
//     <x-nq::switch x-model="paused" …>   badges shown with x-show="paused" / "!paused"
//   </div>
//   <form data-slot="extension-connect" x-data="nqExtensionConnect({ mode: 'server', server: '', invalidServer: '…', invalidCode: '…' })" x-on:submit.prevent="submit()">
//   <div data-slot="extension-options" x-data="nqExtensionOptions({ dirty: false, saved: 'Saved', unsaved: 'Unsaved changes' })" x-modelable="dirty" x-on:input="touch()" x-on:change="touch()">
//
// Events (all bubbling, on the component root):
//   nq-pause-change  { paused }                 the pause switch changed.
//   nq-connect       { server, code, wait(p) }  a valid form was submitted; wait() a promise resolving to nothing or { error } to keep the button busy and show the error.
//   nq-save          { wait(p) }                the options page Save was pressed; same wait() contract. A clean finish marks the page saved (dirty false).

import type { Magics, Register } from "./types";

type Outcome = void | { error?: string } | undefined;

/** Whether a string is an http(s) URL with a host: what the connect form accepts. */
export function isServerAddress(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return (url.protocol === "https:" || url.protocol === "http:") && url.hostname.length > 0;
  } catch {
    return false;
  }
}

/** Dispatches `name` with a `wait()` collector and resolves once every promise handed to it has settled. */
async function dispatchAndWait(el: Magics, name: string, detail: Record<string, unknown>): Promise<Outcome> {
  const waits: Promise<Outcome>[] = [];
  el.$dispatch(name, { ...detail, wait: (p: Promise<Outcome>) => void waits.push(Promise.resolve(p)) });
  const results = await Promise.all(waits);
  return results.find((r) => r && typeof r === "object" && r.error) as Outcome;
}

export const extensionPopup: Register = (Alpine) => {
  Alpine.data("nqExtensionPopup", (cfg: { paused: boolean; status: string }) => ({
    paused: Boolean(cfg.paused),
    status: cfg.status,
    init(this: Magics & { paused: boolean }) {
      this.$watch("paused", (paused: boolean) => this.$dispatch("nq-pause-change", { paused }));
    },
    state(this: { paused: boolean; status: string }) {
      return this.paused ? "paused" : this.status;
    },
  }));

  Alpine.data("nqExtensionConnect", (cfg: { mode: "server" | "pair"; server: string; invalidServer: string; invalidCode: string }) => ({
    server: cfg.server ?? "",
    code: "",
    busy: false,
    error: null as string | null,
    async submit(this: Magics & { server: string; code: string; busy: boolean; error: string | null }) {
      const pair = cfg.mode === "pair";
      if (pair ? this.code.trim().length !== 6 : !isServerAddress(this.server)) {
        this.error = pair ? cfg.invalidCode : cfg.invalidServer;
        return;
      }
      this.error = null;
      this.busy = true;
      try {
        const result = await dispatchAndWait(this, "nq-connect", { server: this.server.trim(), code: this.code.trim() });
        if (result && result.error) this.error = result.error;
      } finally {
        this.busy = false;
      }
    },
  }));

  Alpine.data("nqExtensionOptions", (cfg: { dirty: boolean; saved: string; unsaved: string }) => ({
    dirty: Boolean(cfg.dirty),
    saving: false,
    error: null as string | null,
    /** A control inside changed: there is something to save. */
    touch(this: { dirty: boolean }) {
      this.dirty = true;
    },
    message(this: { dirty: boolean; error: string | null }) {
      return this.error ?? (this.dirty ? cfg.unsaved : cfg.saved);
    },
    async save(this: Magics & { dirty: boolean; saving: boolean; error: string | null }) {
      this.saving = true;
      this.error = null;
      try {
        const result = await dispatchAndWait(this, "nq-save", {});
        if (result && result.error) this.error = result.error;
        else this.dirty = false;
      } finally {
        this.saving = false;
      }
    },
  }));
};
