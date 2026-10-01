// nqConnectedAccounts: the OAuth accounts linked to a sign-in. The markup is the React ConnectedAccounts', the state lives here.
// Connect and Disconnect dispatch `nq-connect` / `nq-disconnect` (bubbles) with detail { id, wait(promise) }: pass a promise to
// wait() and the row shows a spinner until it settles; resolve `{ error }` (or reject) to show a message, otherwise the row flips
// to its new state. `connected` is x-modelable, so Livewire can drive it. The last remaining sign-in method cannot be
// disconnected: `total` counts the connected providers plus `others` (a password, each passkey).
//
//   <div data-slot="connected-accounts" x-data="nqConnectedAccounts({ connected: { google: true }, accounts: { google: 'a@b.co' }, others: 1, messages })"
//        x-modelable="connected" @nq-connect="$event.detail.wait(link($event.detail.id))"> … </div>

import type { Magics, Register } from "./types";

interface Result {
  error?: string;
  account?: string;
}

interface Messages {
  connectFailed: string;
  disconnectFailed: string;
}

interface ConnectedState extends Magics {
  connected: Record<string, boolean>;
  accounts: Record<string, string | undefined>;
  others: number;
  messages: Messages;
  busy: string | null;
  error: string | null;
  total: number;
  root: HTMLElement;
  ask(event: string, id: string): Promise<Result | void> | null;
}

interface Init {
  connected?: Record<string, boolean>;
  accounts?: Record<string, string>;
  others?: number;
  messages?: Partial<Messages>;
}

export const connectedAccounts: Register = (Alpine) => {
  Alpine.data("nqConnectedAccounts", (init: Init = {}) => ({
    connected: { ...(init.connected ?? {}) } as Record<string, boolean>,
    accounts: { ...(init.accounts ?? {}) } as Record<string, string | undefined>,
    others: init.others ?? 0,
    messages: { connectFailed: "Could not connect the account. Try again.", disconnectFailed: "Could not disconnect the account. Try again.", ...(init.messages ?? {}) } as Messages,
    busy: null as string | null,
    error: null as string | null,
    root: null as unknown as HTMLElement,
    init(this: ConnectedState) {
      this.root = this.$el;
    },
    /** Sign-in methods left: connected providers plus the others (password, passkeys). */
    get total(): number {
      const s = this as unknown as ConnectedState;
      return Object.values(s.connected).filter(Boolean).length + Number(s.others);
    },
    ask(this: ConnectedState, event: string, id: string) {
      let waiting: Promise<Result | void> | null = null;
      this.root.dispatchEvent(
        new CustomEvent(event, {
          bubbles: true,
          detail: {
            id,
            wait: (promise: Promise<Result | void> | void) => {
              if (promise && typeof (promise as Promise<unknown>).then === "function") waiting = promise as Promise<Result | void>;
            },
          },
        }),
      );
      return waiting;
    },
    async connect(this: ConnectedState, id: string) {
      if (this.busy) return;
      const waiting = this.ask("nq-connect", id);
      if (!waiting) return;
      this.busy = id;
      this.error = null;
      try {
        const result = await waiting;
        if (result && result.error) this.error = result.error;
        else {
          this.connected[id] = true;
          if (result && result.account) this.accounts[id] = result.account;
        }
      } catch {
        this.error = this.messages.connectFailed;
      } finally {
        this.busy = null;
      }
    },
    async disconnect(this: ConnectedState, id: string) {
      if (this.busy) return;
      const waiting = this.ask("nq-disconnect", id);
      if (!waiting) return;
      this.busy = id;
      this.error = null;
      try {
        const result = await waiting;
        if (result && result.error) this.error = result.error;
        else {
          this.connected[id] = false;
          this.accounts[id] = undefined;
        }
      } catch {
        this.error = this.messages.disconnectFailed;
      } finally {
        this.busy = null;
      }
    },
  }));
};
