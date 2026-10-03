// nqSmtpSettings and nqMailDomains: the state behind the Blade mail-settings components. The words, the DNS checklist, the health badge and the
// table rows are rendered by the server; this holds the forms, the test steps, the domain switch, the add dialogs and the remove confirmation.
//
//   <div data-slot="smtp-settings" x-data="nqSmtpSettings({ host, port, encryption, username, fromName, fromAddress, passwordSet, defaultTestTo, strings })">
//     <input x-model="host"> <input x-model="port"> <x-nq::select x-model="encryption"> <input x-model="username"> <input x-model="password"> …
//     <form x-on:submit.prevent="save()"> <button x-on:click="sendTest()">
//   </div>
//   <div data-slot="mail-domains" x-data="nqMailDomains({ domainId, domains, strings })"> <select x-model="domainId"> <button x-on:click="recheck()"> … </div>
//
// Nothing here talks to a server. Each action dispatches a bubbling, cancelable event from the root with detail { ..., resolve(result?), reject(message), waitUntil(promise) }:
//   "nq-smtp-save" { host, port, encryption, username, password?, fromName, fromAddress }   "nq-smtp-test" { ...same, to } (resolve { ok, steps: [{ id, ok, message? }] })
//   "nq-mail-recheck" { domainId }   "nq-mail-add-mailbox" { domainId, local, quotaMb, password }   "nq-mail-remove-mailbox" { domainId, id }
//   "nq-mail-add-alias" { domainId, source, destination }   "nq-mail-remove-alias" { domainId, id }
// An error (resolve({ error }), reject(message), a rejected promise) is shown in an alert. Nobody claimed the event (no waitUntil / resolve / reject call, no preventDefault):
// it counts as done. The server renders the next state; pass the new rows back on the next render.
//
// The wrapper's names (hostBad, mailboxOpen, mLocal...) differ from the inner components' names (`open`, `invalid`, `value`) on purpose:
// x-model expressions are read in the scope of the element that carries them. The tables use nqDataTable inside nqMailDomains.
import { defaultSmtpPort, isEmail, stepStates, TEST_STEPS, validateAlias, validateMailbox, validateSmtp, type SmtpEncryption, type StepState, type TestOutcome } from "./mail-settings-logic";
import type { Magics, Register } from "./types";

export interface MailOutcome {
  error?: string;
}

interface Settled {
  error: string | null;
  result: unknown;
}

/** Dispatches the event from `root` and waits for whoever claimed it. Resolves to an error message (or null) and the value it was resolved with. */
async function run(root: HTMLElement, name: string, detail: Record<string, unknown>, failed: string): Promise<Settled> {
  let claimed = false;
  let settle!: (outcome: unknown) => void;
  const outcome = new Promise<unknown>((resolve) => (settle = resolve));
  const full: Record<string, unknown> = {
    ...detail,
    resolve(result?: unknown) {
      claimed = true;
      settle(result);
    },
    reject(message?: string) {
      claimed = true;
      settle({ error: message || failed });
    },
    waitUntil(promise: Promise<unknown>) {
      claimed = true;
      Promise.resolve(promise).then(settle, (e) => settle({ error: e instanceof Error && e.message ? e.message : typeof e === "string" && e ? e : failed }));
    },
  };
  const event = new CustomEvent(name, { detail: full, bubbles: true, cancelable: true });
  root.dispatchEvent(event);
  if (!claimed && !event.defaultPrevented) return { error: null, result: undefined };
  const result = await outcome;
  const error = result && typeof result === "object" && typeof (result as MailOutcome).error === "string" && (result as MailOutcome).error ? (result as MailOutcome).error! : null;
  return { error, result };
}

/* ---------------------------------------------------------------- smtp */

interface SmtpConfig {
  host: string;
  port: number;
  encryption: SmtpEncryption;
  username: string;
  fromName: string;
  fromAddress: string;
  passwordSet: boolean;
  defaultTestTo: string;
  strings: { genericError: string; encryptionHint: string };
}

interface SmtpState extends Magics {
  config: SmtpConfig;
  root: HTMLElement;
  alive: boolean;
  host: string;
  port: string;
  encryption: SmtpEncryption;
  username: string;
  password: string;
  fromName: string;
  fromAddress: string;
  touched: boolean;
  saving: boolean;
  error: string;
  saved: boolean;
  to: string;
  toTouched: boolean;
  testing: boolean;
  outcome: TestOutcome | null;
  testError: string;
  problems: string[];
  draft(): Record<string, unknown>;
}

export const mailSettings: Register = (Alpine) => {
  Alpine.data("nqSmtpSettings", (config: SmtpConfig) => ({
    config,
    root: null as unknown as HTMLElement,
    alive: true,
    host: config.host,
    port: String(config.port),
    encryption: config.encryption,
    username: config.username,
    password: "",
    fromName: config.fromName,
    fromAddress: config.fromAddress,
    touched: false,
    saving: false,
    error: "",
    saved: false,
    to: config.defaultTestTo ?? "",
    toTouched: false,
    testing: false,
    outcome: null as TestOutcome | null,
    testError: "",
    init(this: SmtpState) {
      this.root = this.$el;
      // Keep the port in step with the mode unless the user typed a custom one.
      this.$watch<SmtpEncryption>("encryption", (next, previous) => {
        if (this.port === String(defaultSmtpPort(previous))) this.port = String(defaultSmtpPort(next));
      });
    },
    destroy(this: SmtpState) {
      this.alive = false;
    },
    get problems(): string[] {
      const s = this as unknown as SmtpState;
      return validateSmtp({ host: s.host, port: s.port, encryption: s.encryption, username: s.username, fromName: s.fromName, fromAddress: s.fromAddress });
    },
    get hostBad(): boolean {
      const s = this as unknown as SmtpState;
      return s.touched && s.problems.includes("host");
    },
    get portBad(): boolean {
      const s = this as unknown as SmtpState;
      return s.touched && s.problems.includes("port");
    },
    get fromBad(): boolean {
      const s = this as unknown as SmtpState;
      return s.touched && s.problems.includes("fromAddress");
    },
    get toBad(): boolean {
      const s = this as unknown as SmtpState;
      return s.toTouched && !isEmail(s.to);
    },
    get encryptionHint(): string {
      const s = this as unknown as SmtpState;
      return s.config.strings.encryptionHint.replace("{port}", String(defaultSmtpPort(s.encryption)));
    },
    draft(this: SmtpState) {
      return {
        host: this.host.trim(),
        port: Number(this.port),
        encryption: this.encryption,
        username: this.username.trim(),
        ...(this.password ? { password: this.password } : {}),
        fromName: this.fromName.trim(),
        fromAddress: this.fromAddress.trim(),
      };
    },
    async save(this: SmtpState) {
      this.touched = true;
      this.saved = false;
      if (this.saving || this.problems.length) return;
      this.saving = true;
      this.error = "";
      const { error } = await run(this.root, "nq-smtp-save", this.draft(), this.config.strings.genericError);
      if (!this.alive) return;
      this.saving = false;
      if (error) this.error = error;
      else {
        this.saved = true;
        this.password = "";
      }
    },
    async sendTest(this: SmtpState) {
      this.toTouched = true;
      this.touched = true;
      if (this.testing || !isEmail(this.to) || this.problems.length) return;
      this.testing = true;
      this.outcome = null;
      this.testError = "";
      const { error, result } = await run(this.root, "nq-smtp-test", { ...this.draft(), to: this.to.trim() }, this.config.strings.genericError);
      if (!this.alive) return;
      this.testing = false;
      if (error) this.testError = error;
      else if (result && typeof result === "object" && Array.isArray((result as TestOutcome).steps)) this.outcome = result as TestOutcome;
    },
    /** pass | fail | skipped for a step of the last test. */
    stepOf(this: SmtpState, id: string): StepState {
      return this.outcome ? stepStates(this.outcome.steps)[id as (typeof TEST_STEPS)[number]] : "skipped";
    },
    get failMessage(): string {
      const s = this as unknown as SmtpState;
      return s.outcome?.steps.find((step) => !step.ok)?.message ?? "";
    },
  }));

  /* -------------------------------------------------------------- domains */

  interface DomainsConfig {
    domainId: string;
    domains: Array<{ id: string; name: string }>;
    strings: { genericError: string; removeMailboxTitle: string; removeMailboxBody: string; removeAliasTitle: string; removeAliasBody: string };
  }

  interface Removal {
    kind: "mailbox" | "alias";
    id: string;
    title: string;
    body: string;
  }

  interface DomainsState extends Magics {
    config: DomainsConfig;
    root: HTMLElement;
    alive: boolean;
    domainId: string;
    failure: string;
    checking: boolean;
    mailboxOpen: boolean;
    aliasOpen: boolean;
    mLocal: string;
    mQuota: string;
    mPassword: string;
    mTouched: boolean;
    mPending: boolean;
    mError: string;
    aSource: string;
    aDest: string;
    aTouched: boolean;
    aPending: boolean;
    aError: string;
    removeOpen: boolean;
    removeTitle: string;
    removeBody: string;
    removePending: boolean;
    removal: Removal | null;
    mProblems: string[];
    aProblems: string[];
    domainName: string;
  }

  Alpine.data("nqMailDomains", (config: DomainsConfig) => ({
    config,
    root: null as unknown as HTMLElement,
    alive: true,
    domainId: config.domainId,
    failure: "",
    checking: false,
    mailboxOpen: false,
    aliasOpen: false,
    mLocal: "",
    mQuota: "2048",
    mPassword: "",
    mTouched: false,
    mPending: false,
    mError: "",
    aSource: "",
    aDest: "",
    aTouched: false,
    aPending: false,
    aError: "",
    removeOpen: false,
    removeTitle: "",
    removeBody: "",
    removePending: false,
    removal: null as Removal | null,
    init(this: DomainsState) {
      this.root = this.$el;
      this.$watch<boolean>("mailboxOpen", (open) => {
        if (open) {
          this.mLocal = "";
          this.mQuota = "2048";
          this.mPassword = "";
          this.mTouched = false;
          this.mError = "";
        } else if (this.mPending) this.mailboxOpen = true;
      });
      this.$watch<boolean>("aliasOpen", (open) => {
        if (open) {
          this.aSource = "";
          this.aDest = "";
          this.aTouched = false;
          this.aError = "";
        } else if (this.aPending) this.aliasOpen = true;
      });
      this.$watch<boolean>("removeOpen", (open) => {
        if (!open && this.removePending) this.removeOpen = true;
      });
    },
    destroy(this: DomainsState) {
      this.alive = false;
    },
    get domainName(): string {
      const s = this as unknown as DomainsState;
      return s.config.domains.find((d) => d.id === s.domainId)?.name ?? "";
    },
    get mProblems(): string[] {
      const s = this as unknown as DomainsState;
      return validateMailbox({ local: s.mLocal, quotaMb: s.mQuota, password: s.mPassword });
    },
    get aProblems(): string[] {
      const s = this as unknown as DomainsState;
      return validateAlias({ source: s.aSource, destination: s.aDest });
    },
    get mLocalBad(): boolean {
      const s = this as unknown as DomainsState;
      return s.mTouched && s.mProblems.includes("local");
    },
    get mQuotaBad(): boolean {
      const s = this as unknown as DomainsState;
      return s.mTouched && s.mProblems.includes("quota");
    },
    get mPasswordBad(): boolean {
      const s = this as unknown as DomainsState;
      return s.mTouched && s.mProblems.includes("password");
    },
    get aSourceBad(): boolean {
      const s = this as unknown as DomainsState;
      return s.aTouched && s.aProblems.includes("source");
    },
    get aDestBad(): boolean {
      const s = this as unknown as DomainsState;
      return s.aTouched && s.aProblems.includes("destination");
    },
    async recheck(this: DomainsState) {
      if (this.checking) return;
      this.checking = true;
      this.failure = "";
      const { error } = await run(this.root, "nq-mail-recheck", { domainId: this.domainId }, this.config.strings.genericError);
      if (!this.alive) return;
      this.checking = false;
      if (error) this.failure = error;
    },
    async addMailbox(this: DomainsState) {
      this.mTouched = true;
      if (this.mPending || this.mProblems.length) return;
      this.mPending = true;
      this.mError = "";
      const { error } = await run(this.root, "nq-mail-add-mailbox", { domainId: this.domainId, local: this.mLocal.trim().toLowerCase(), quotaMb: Number(this.mQuota), password: this.mPassword }, this.config.strings.genericError);
      if (!this.alive) return;
      this.mPending = false;
      if (error) this.mError = error;
      else this.mailboxOpen = false;
    },
    async addAlias(this: DomainsState) {
      this.aTouched = true;
      if (this.aPending || this.aProblems.length) return;
      this.aPending = true;
      this.aError = "";
      const { error } = await run(this.root, "nq-mail-add-alias", { domainId: this.domainId, source: this.aSource.trim().toLowerCase(), destination: this.aDest.trim() }, this.config.strings.genericError);
      if (!this.alive) return;
      this.aPending = false;
      if (error) this.aError = error;
      else this.aliasOpen = false;
    },
    /** A row action from either table (nq-data-table-action): Remove opens the confirmation. */
    onAction(this: DomainsState, event: CustomEvent<{ action: string; row: Record<string, unknown> }>) {
      const { action, row } = event.detail;
      if (action !== "remove") return;
      event.stopPropagation();
      const s = this.config.strings;
      const mailbox = "local" in row;
      this.removal = { kind: mailbox ? "mailbox" : "alias", id: String(row.id), title: (mailbox ? s.removeMailboxTitle : s.removeAliasTitle).replace("{a}", String(row.address)), body: mailbox ? s.removeMailboxBody : s.removeAliasBody };
      this.removeTitle = this.removal.title;
      this.removeBody = this.removal.body;
      this.removeOpen = true;
    },
    async confirmRemove(this: DomainsState) {
      const request = this.removal;
      if (!request || this.removePending) return;
      this.removePending = true;
      this.failure = "";
      const { error } = await run(this.root, request.kind === "mailbox" ? "nq-mail-remove-mailbox" : "nq-mail-remove-alias", { domainId: this.domainId, id: request.id }, this.config.strings.genericError);
      if (!this.alive) return;
      this.removePending = false;
      this.removeOpen = false;
      if (error) this.failure = error;
    },
    closeRemove(this: DomainsState) {
      if (!this.removePending) this.removeOpen = false;
    },
  }));
};
