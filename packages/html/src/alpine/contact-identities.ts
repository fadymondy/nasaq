// nqContactIdentities: link, unlink, make primary, copy and consent for a contact's accounts.
// The markup is the React ContactIdentities', the lists are server-rendered, the state lives here.
//
//   <section x-data="nqContactIdentities({ identities: [...], consent: { email: true }, labels: {…} })"> … </section>
//
// It stores nothing: every action fires a waitable event on the root and the host does the work.
//   nq-contact-add      { channel, value, label, waitUntil }    resolve, or { error } to keep the form open
//   nq-contact-remove   { id, channel, value, waitUntil }       (asked first in a dialog)
//   nq-contact-primary  { id, channel, value, waitUntil }
//   nq-contact-consent  { channel, status: "granted" | "denied", waitUntil }   on { error } the switch goes back
// e.g. x-on:nq-contact-add="$event.detail.waitUntil(fetch('/accounts', { method: 'POST', body: JSON.stringify($event.detail) }))".
// A rejected promise, or nobody listening, shows the generic error. After a change the host re-renders the lists.

import { validateContactIdentity, type ContactChannel, type ContactIdentityIssue } from "./contact-identities-logic";
import type { Magics, Register } from "./types";

interface Identity {
  id: string;
  channel: ContactChannel;
  value: string;
}

interface Config {
  identities: Identity[];
  channels: ContactChannel[];
  consent: Partial<Record<ContactChannel, boolean>>;
  labels: { failed: string; removeTitle: string; issues: Record<ContactIdentityIssue, string> };
}

type Outcome = { error?: string } | void | null | undefined;

interface State extends Magics {
  config: Config;
  root: HTMLElement | null;
  error: string | null;
  busy: string | null;
  adding: boolean;
  channel: ContactChannel;
  value: string;
  label: string;
  issue: ContactIdentityIssue | null;
  fieldInvalid: boolean;
  removeOpen: boolean;
  removeIndex: number;
  consent: Partial<Record<ContactChannel, boolean>>;
  lastConsent: Partial<Record<ContactChannel, boolean>>;
  alive: boolean;
  ask(name: string, detail: Record<string, unknown>): Promise<Outcome>;
  run(key: string, name: string, detail: Record<string, unknown>): Promise<boolean>;
  setIssue(issue: ContactIdentityIssue | null): void;
  consentChanged(): Promise<void>;
}

export const contactIdentities: Register = (Alpine) => {
  Alpine.data("nqContactIdentities", (config: Config) => ({
    config,
    root: null as HTMLElement | null,
    error: null as string | null,
    busy: null as string | null,
    adding: false,
    channel: (config.channels[0] ?? "email") as ContactChannel,
    value: "",
    label: "",
    issue: null as ContactIdentityIssue | null,
    fieldInvalid: false,
    removeOpen: false,
    removeIndex: -1,
    consent: { ...config.consent } as Partial<Record<ContactChannel, boolean>>,
    lastConsent: { ...config.consent } as Partial<Record<ContactChannel, boolean>>,
    alive: true,
    init(this: State) {
      this.root = this.$el;
      // The switches are x-modelable, so watching `consent` sees every click.
      this.$watch("consent", () => void this.consentChanged());
    },
    destroy(this: State) {
      this.alive = false;
    },
    async ask(this: State, name: string, detail: Record<string, unknown>): Promise<Outcome> {
      let pending: Promise<Outcome> | undefined;
      const event = new CustomEvent(name, {
        bubbles: true,
        detail: { ...detail, waitUntil: (p: Promise<Outcome>) => (pending = Promise.resolve(p)) },
      });
      (this.root ?? this.$el).dispatchEvent(event);
      if (!pending) throw new Error("no listener");
      return pending;
    },
    /** One async action: true when it went through, false when it failed (the message shows above the list). */
    async run(this: State, key: string, name: string, detail: Record<string, unknown>): Promise<boolean> {
      this.busy = key;
      this.error = null;
      let ok = true;
      try {
        const result = await this.ask(name, detail);
        if (result && result.error) {
          ok = false;
          if (this.alive) this.error = result.error;
        }
      } catch {
        ok = false;
        if (this.alive) this.error = this.config.labels.failed;
      } finally {
        if (this.alive) this.busy = null;
      }
      return ok;
    },
    openForm(this: State) {
      this.adding = true;
      this.$nextTick(() => this.root?.querySelector<HTMLInputElement>('[data-slot="contact-identities-form"] input')?.focus());
    },
    closeForm(this: State) {
      this.adding = false;
      this.setIssue(null);
    },
    setIssue(this: State, issue: ContactIdentityIssue | null) {
      this.issue = issue;
      this.fieldInvalid = !!issue;
    },
    issueText(this: State) {
      return this.issue ? this.config.labels.issues[this.issue] : "";
    },
    async submit(this: State) {
      const found = validateContactIdentity(this.channel, this.value, this.config.identities);
      this.setIssue(found);
      if (found) return;
      const ok = await this.run("add", "nq-contact-add", { channel: this.channel, value: this.value.trim(), label: this.label.trim() || undefined });
      if (ok && this.alive) {
        this.value = "";
        this.label = "";
        this.adding = false;
      }
    },
    /** A row action by its position in config.identities: "primary", "copy" or "remove". */
    act(this: State, action: string, index: number) {
      const identity = this.config.identities[index];
      if (!identity) return;
      if (action === "remove") {
        this.removeIndex = index;
        this.removeOpen = true;
      } else if (action === "copy") void navigator.clipboard?.writeText(identity.value);
      else void this.run(`${action}-${identity.id}`, "nq-contact-primary", { id: identity.id, channel: identity.channel, value: identity.value });
    },
    removeTitle(this: State) {
      return this.config.labels.removeTitle.replace("{value}", this.config.identities[this.removeIndex]?.value ?? "");
    },
    confirmRemove(this: State) {
      const identity = this.config.identities[this.removeIndex];
      if (identity) void this.run(`remove-${identity.id}`, "nq-contact-remove", { id: identity.id, channel: identity.channel, value: identity.value });
    },
    async consentChanged(this: State) {
      const channel = (Object.keys(this.consent) as ContactChannel[]).find((c) => !!this.consent[c] !== !!this.lastConsent[c]);
      if (!channel || this.busy) return;
      const next = !!this.consent[channel];
      const ok = await this.run(`consent-${channel}`, "nq-contact-consent", { channel, status: next ? "granted" : "denied" });
      if (!this.alive) return;
      if (ok) this.lastConsent = { ...this.lastConsent, [channel]: next };
      else this.consent = { ...this.consent, [channel]: !!this.lastConsent[channel] };
    },
  }));
};
