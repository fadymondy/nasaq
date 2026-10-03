// nqPasskeyList: manage the passkeys on an account. The markup is the React PasskeyList's, the state lives here.
// It draws the list only. Add, rename and remove dispatch `nq-passkey-add`, `nq-passkey-rename` (detail { id, name }) and
// `nq-passkey-remove` (detail { id }), each with `wait(promise)`: pass the promise of your WebAuthn ceremony or request and
// the UI shows its pending state until it settles. Resolve `{ error }` (or reject) to show a message. A renamed row shows
// its new name and a removed row disappears once the promise resolves. With no wait() the host owns the change (Livewire).
//
//   <div data-slot="passkey-list" x-data="nqPasskeyList({ supported: null, names: { a: 'MacBook' }, messages })"
//        @nq-passkey-remove="$event.detail.wait(api.remove($event.detail.id))"> … </div>

import type { Magics, Register } from "./types";

interface Result {
  error?: string;
}

interface Messages {
  addFailed: string;
  addCancelled: string;
  renameFailed: string;
  removeFailed: string;
}

interface PasskeyState extends Magics {
  supported: boolean | null;
  names: Record<string, string>;
  gone: Record<string, boolean>;
  count: number;
  messages: Messages;
  adding: boolean;
  error: string | null;
  editing: string | null;
  draft: string;
  renaming: string | null;
  renameError: Record<string, string | null>;
  root: HTMLElement;
  ask(event: string, detail: Record<string, unknown>): Promise<Result | void> | null;
}

interface Init {
  supported?: boolean | null;
  names?: Record<string, string>;
  messages?: Partial<Messages>;
}

export const passkeyList: Register = (Alpine) => {
  Alpine.data("nqPasskeyList", (init: Init = {}) => ({
    supported: (init.supported ?? null) as boolean | null,
    names: { ...(init.names ?? {}) } as Record<string, string>,
    gone: {} as Record<string, boolean>,
    messages: {
      addFailed: "Could not add the passkey. Try again.",
      addCancelled: "Adding the passkey was cancelled.",
      renameFailed: "Could not rename the passkey. Try again.",
      removeFailed: "Could not remove the passkey. Try again.",
      ...(init.messages ?? {}),
    } as Messages,
    adding: false,
    error: null as string | null,
    editing: null as string | null,
    draft: "",
    renaming: null as string | null,
    renameError: {} as Record<string, string | null>,
    root: null as unknown as HTMLElement,
    init(this: PasskeyState) {
      this.root = this.$el;
      // Read after mount, like the React component: the server cannot know.
      if (this.supported === null) this.supported = typeof window !== "undefined" && typeof window.PublicKeyCredential !== "undefined";
    },
    /** Passkeys still listed. */
    get count(): number {
      const s = this as unknown as PasskeyState;
      return Object.keys(s.names).filter((id) => !s.gone[id]).length;
    },
    ask(this: PasskeyState, event: string, detail: Record<string, unknown>) {
      let waiting: Promise<Result | void> | null = null;
      this.root.dispatchEvent(
        new CustomEvent(event, {
          bubbles: true,
          detail: {
            ...detail,
            wait: (promise: Promise<Result | void> | void) => {
              if (promise && typeof (promise as Promise<unknown>).then === "function") waiting = promise as Promise<Result | void>;
            },
          },
        }),
      );
      return waiting;
    },
    async add(this: PasskeyState) {
      if (this.adding || !this.supported) return;
      const waiting = this.ask("nq-passkey-add", {});
      if (!waiting) return;
      this.adding = true;
      this.error = null;
      try {
        const result = await waiting;
        if (result && result.error) this.error = result.error;
      } catch (e) {
        this.error = (e as { name?: string } | null)?.name === "NotAllowedError" ? this.messages.addCancelled : this.messages.addFailed;
      } finally {
        this.adding = false;
      }
    },
    startEdit(this: PasskeyState, id: string, el: HTMLElement) {
      this.editing = id;
      this.draft = this.names[id] ?? "";
      this.renameError[id] = null;
      this.$nextTick(() => el.closest("li")?.querySelector<HTMLInputElement>("input")?.focus());
    },
    cancelEdit(this: PasskeyState, id: string) {
      this.renameError[id] = null;
      this.editing = null;
    },
    async save(this: PasskeyState, id: string) {
      const next = this.draft.trim();
      if (!next || this.renaming) return;
      if (next === this.names[id]) {
        this.editing = null;
        return;
      }
      const waiting = this.ask("nq-passkey-rename", { id, name: next });
      if (!waiting) {
        this.names[id] = next;
        this.editing = null;
        return;
      }
      this.renaming = id;
      this.renameError[id] = null;
      try {
        const result = await waiting;
        if (result && result.error) this.renameError[id] = result.error;
        else {
          this.names[id] = next;
          this.editing = null;
        }
      } catch {
        this.renameError[id] = this.messages.renameFailed;
      } finally {
        this.renaming = null;
      }
    },
    async remove(this: PasskeyState, id: string) {
      const waiting = this.ask("nq-passkey-remove", { id });
      if (!waiting) return;
      this.error = null;
      try {
        const result = await waiting;
        if (result && result.error) this.error = result.error;
        else this.gone[id] = true;
      } catch {
        this.error = this.messages.removeFailed;
      }
    },
  }));
};
