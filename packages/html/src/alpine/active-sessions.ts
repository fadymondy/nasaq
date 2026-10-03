// nqActiveSessions: sign out one device, or every other device, from the list of active sessions. The markup is the
// React ActiveSessions'; the list is server-rendered, the state lives here.
//
//   <div x-data="nqActiveSessions({ others: ['b', 'c'] })" x-on:nq-session-revoke="$event.detail.waitUntil(revoke($event.detail.id))">
//     <div x-nq::alert … x-data="nqAlertDialog()"> … <button x-on:click="revoke('b').then((ok) => ok && close())">Sign out</button> </div>
//   </div>
//
// Signing out is yours. It dispatches, from the root:
//   nq-session-revoke         detail: { id, waitUntil(promise) }
//   nq-session-revoke-others  detail: { waitUntil(promise) }
// Resolve { error: "…" } or reject to keep the confirmation open and show the message; anything else resolves it, and
// the signed-out rows are hidden. revoke() and revokeOthers() resolve true on success, so the dialog can close.

import type { Magics, Register } from "./types";

interface Config {
  /** Ids of the sessions that can be signed out (every one but the current). */
  others?: string[];
  failed?: string;
}

interface SessionsState extends Magics {
  error: string;
  busy: string | null;
  gone: string[];
  hasOthers: boolean;
  run(key: string, event: string, detail: Record<string, unknown>): Promise<boolean>;
}

export const activeSessions: Register = (Alpine) => {
  Alpine.data("nqActiveSessions", (config: Config = {}) => {
    let root: HTMLElement | undefined;
    const others = config.others ?? [];
    return {
      error: "",
      /** The id being signed out, "*" for all other devices, or null. */
      busy: null as string | null,
      gone: [] as string[],
      init(this: SessionsState) {
        root = this.$el;
      },
      get hasOthers(): boolean {
        const gone = (this as unknown as SessionsState).gone;
        return others.some((id) => !gone.includes(id));
      },
      async run(this: SessionsState, key: string, event: string, detail: Record<string, unknown>) {
        if (this.busy !== null) return false;
        this.busy = key;
        this.error = "";
        const pending: unknown[] = [];
        root?.dispatchEvent(new CustomEvent(event, { bubbles: true, detail: { ...detail, waitUntil: (p: unknown) => void pending.push(p) } }));
        try {
          const results = await Promise.all(pending);
          const failed = results.find((r) => r && typeof r === "object" && (r as { error?: string }).error) as { error: string } | undefined;
          if (failed) {
            this.error = failed.error;
            return false;
          }
          return true;
        } catch (e) {
          this.error = e instanceof Error && e.message ? e.message : (config.failed ?? "Could not sign out. Try again.");
          return false;
        } finally {
          this.busy = null;
        }
      },
      async revoke(this: SessionsState, id: string) {
        const ok = await this.run(id, "nq-session-revoke", { id });
        if (ok) this.gone = [...this.gone, id];
        return ok;
      },
      async revokeOthers(this: SessionsState) {
        const ok = await this.run("*", "nq-session-revoke-others", {});
        if (ok) this.gone = [...this.gone, ...others];
        return ok;
      },
    };
  });
};
