// nqUserActionsMenu: the dialogs and actions an admin has on one account: edit, impersonate, set a password or send a reset
// link, send a sign-in link, delete. The markup is the React UserActionsMenu one (see the Blade component), the state lives here.
//
//   <div data-slot="user-actions-menu" x-data="nqUserActionsMenu({ email, roles, permissions, minPasswordLength, labels })">…</div>
//
// It is presentational: the host does the work. Each action fires an event on the root with detail `{ …, wait(promise) }`:
//   edit          { values: { email, roles, permissions }, wait }   resolve, or resolve { error }
//   impersonate   { wait }                                          resolve, or resolve { error }
//   set-password  { password, wait }                                resolve, or resolve { error }
//   reset-link    { wait }                                          resolve { link } | { emailed: true } | { error }
//   magic-link    { wait }                                          same
//   delete        { wait }                                          resolve, or resolve { error }
// A rejected promise, or nobody listening, shows the generic error. A dialog stays open while it is working.

import { copyText } from "./copy-button";
import type { Magics, Register } from "./types";

interface UserActionsConfig {
  email: string;
  roles?: string[];
  permissions?: string[];
  minPasswordLength?: number;
  labels: {
    failed: string;
    emailInvalid: string;
    /** Already filled with the minimum. */
    passwordShort: string;
    resetLinkTitle: string;
    magicLinkTitle: string;
  };
}

type Outcome = { error?: string; link?: string; emailed?: boolean } | void | undefined;
type Confirm = "impersonate" | "delete";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface UserActionsState extends Magics {
  config: UserActionsConfig;
  root: HTMLElement | null;
  editOpen: boolean;
  passwordOpen: boolean;
  linkOpen: boolean;
  confirmOpen: boolean;
  confirmKind: Confirm;
  busy: boolean;
  err: string | null;
  email: string;
  roles: string[];
  perms: string[];
  emailErr: boolean;
  newPassword: string;
  pwErr: string | null;
  pwDone: boolean;
  linkTitle: string;
  linkPending: boolean;
  linkUrl: string;
  linkEmailed: boolean;
  linkError: string | null;
  copied: boolean;
  timer: ReturnType<typeof setTimeout> | undefined;
  alive: boolean;
  resetEdit(): void;
  begin(kind: "edit" | "password" | "impersonate" | "delete"): void;
  ask(name: string, detail: Record<string, unknown>): Promise<Outcome>;
  act(name: string, detail: Record<string, unknown>): Promise<boolean>;
  link(event: string, title: string): Promise<void>;
}

export const userActionsMenu: Register = (Alpine) => {
  Alpine.data("nqUserActionsMenu", (config: UserActionsConfig) => ({
    config,
    root: null as HTMLElement | null,
    editOpen: false,
    passwordOpen: false,
    linkOpen: false,
    confirmOpen: false,
    confirmKind: "delete" as Confirm,
    busy: false,
    err: null as string | null,
    email: config.email,
    roles: [...(config.roles ?? [])],
    perms: [...(config.permissions ?? [])],
    emailErr: false,
    newPassword: "",
    pwErr: null as string | null,
    pwDone: false,
    linkTitle: "",
    linkPending: false,
    linkUrl: "",
    linkEmailed: false,
    linkError: null as string | null,
    copied: false,
    timer: undefined as ReturnType<typeof setTimeout> | undefined,
    alive: true,
    init(this: UserActionsState) {
      this.root = this.$el;
      // A dialog cannot be dismissed while its action is running: put it back.
      for (const key of ["editOpen", "passwordOpen", "confirmOpen"] as const) {
        this.$watch(key, (open: boolean) => {
          if (!open && this.busy) this[key] = true;
        });
      }
      this.$watch("linkOpen", (open: boolean) => {
        if (!open && this.linkPending) this.linkOpen = true;
      });
    },
    destroy(this: UserActionsState) {
      this.alive = false;
      clearTimeout(this.timer);
    },
    resetEdit(this: UserActionsState) {
      this.email = this.config.email;
      this.roles = [...(this.config.roles ?? [])];
      this.perms = [...(this.config.permissions ?? [])];
      this.emailErr = false;
    },
    /** Open a dialog from the menu or the toolbar. */
    begin(this: UserActionsState, kind: "edit" | "password" | "impersonate" | "delete") {
      this.err = null;
      if (kind === "edit") {
        this.resetEdit();
        this.editOpen = true;
      } else if (kind === "password") {
        this.newPassword = "";
        this.pwErr = null;
        this.pwDone = false;
        this.passwordOpen = true;
      } else {
        this.confirmKind = kind;
        this.confirmOpen = true;
      }
    },
    beginEdit(this: UserActionsState) {
      this.begin("edit");
    },
    beginImpersonate(this: UserActionsState) {
      this.begin("impersonate");
    },
    beginPassword(this: UserActionsState) {
      this.begin("password");
    },
    dismiss(this: UserActionsState) {
      if (this.busy) return;
      this.editOpen = false;
      this.passwordOpen = false;
      this.confirmOpen = false;
    },
    async ask(this: UserActionsState, name: string, detail: Record<string, unknown>): Promise<Outcome> {
      let pending: Promise<Outcome> | undefined;
      const event = new CustomEvent(name, {
        bubbles: true,
        detail: { ...detail, wait: (p: Promise<Outcome>) => (pending = Promise.resolve(p)) },
      });
      (this.root ?? this.$el).dispatchEvent(event);
      if (!pending) throw new Error("no listener");
      return pending;
    },
    /** Run an action that resolves to nothing or `{ error }`; true on success. */
    async act(this: UserActionsState, name: string, detail: Record<string, unknown>) {
      this.busy = true;
      this.err = null;
      let ok = false;
      try {
        const result = await this.ask(name, detail);
        if (!this.alive) return false;
        if (result && result.error) this.err = result.error;
        else ok = true;
      } catch {
        if (this.alive) this.err = this.config.labels.failed;
      } finally {
        if (this.alive) this.busy = false;
      }
      return ok;
    },
    async saveEdit(this: UserActionsState) {
      if (this.busy) return;
      const email = this.email.trim();
      if (!EMAIL.test(email)) {
        this.emailErr = true;
        return;
      }
      this.emailErr = false;
      if (await this.act("edit", { values: { email, roles: [...this.roles], permissions: [...this.perms] } })) this.editOpen = false;
    },
    async savePassword(this: UserActionsState) {
      if (this.busy) return;
      if (this.newPassword.length < (this.config.minPasswordLength ?? 8)) {
        this.pwErr = this.config.labels.passwordShort;
        return;
      }
      this.pwErr = null;
      if (await this.act("set-password", { password: this.newPassword })) this.pwDone = true;
    },
    async confirmAction(this: UserActionsState) {
      if (this.busy) return;
      if (await this.act(this.confirmKind, {})) this.confirmOpen = false;
    },
    /** Close the dialog that asked, show the link dialog as pending, then fill it in. */
    async link(this: UserActionsState, event: string, title: string) {
      this.editOpen = false;
      this.passwordOpen = false;
      this.linkTitle = title;
      this.linkPending = true;
      this.linkUrl = "";
      this.linkEmailed = false;
      this.linkError = null;
      this.copied = false;
      this.linkOpen = true;
      try {
        const result = await this.ask(event, {});
        if (!this.alive) return;
        if (result && result.error) this.linkError = result.error;
        else {
          this.linkUrl = (result && result.link) || "";
          this.linkEmailed = Boolean(result && result.emailed);
        }
      } catch {
        if (this.alive) this.linkError = this.config.labels.failed;
      } finally {
        if (this.alive) this.linkPending = false;
      }
    },
    sendReset(this: UserActionsState) {
      return this.link("reset-link", this.config.labels.resetLinkTitle);
    },
    sendMagic(this: UserActionsState) {
      return this.link("magic-link", this.config.labels.magicLinkTitle);
    },
    async copyLink(this: UserActionsState) {
      const ok = await copyText(this.linkUrl);
      if (!this.alive) return;
      this.copied = ok;
      this.root?.dispatchEvent(new CustomEvent(ok ? "nq:copy" : "nq:copy-error", { bubbles: true, detail: ok ? { text: this.linkUrl } : undefined }));
      clearTimeout(this.timer);
      if (ok) this.timer = setTimeout(() => (this.copied = false), 1500);
    },
    closeLink(this: UserActionsState) {
      if (!this.linkPending) this.linkOpen = false;
    },
  }));
};
