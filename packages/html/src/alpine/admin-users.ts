// nqAdminUsers: the dialogs and actions of the user management suite (add user, edit roles, confirm disable / reset / impersonate, bulk).
// The markup is the React AdminUsers'; the table and tiles are server-rendered, the state lives here.
//
//   <div x-data="nqAdminUsers({ locale: 'en', currentUserId: 'u1', freeRoles: false, roles: { admin: { label: 'Admin' } }, labels: {…} })"
//        x-on:nq-data-table-action="onAction($event)"> … </div>
//
// It is presentational: the host does the work. Each action fires an event on the root with detail `{ …, wait(promise) }`:
//   add-user        { values, wait }               values: { name, email, roles, sendInvite, verified, password? }; resolve, or { error, fieldErrors: { name?, email? } }
//   verify          { user, wait }                 resolve, or { error }
//   set-disabled    { user, disabled, wait }
//   reset-password  { user, wait }
//   impersonate     { user, wait }
//   update-roles    { user, roles, wait }
//   open            { user }                       (a row was clicked; no wait)
// A rejected promise, or nobody listening, shows the generic error. After a success the host re-renders the page.

import type { Magics, Register } from "./types";

interface RoleInfo {
  label: string;
  description?: string;
}

interface AdminUsersConfig {
  locale?: string;
  currentUserId?: string | null;
  freeRoles?: boolean;
  password?: boolean;
  minPasswordLength?: number;
  defaultRoles?: string[] | null;
  roles: Record<string, RoleInfo>;
  labels: Record<string, string>;
}

type Outcome = { error?: string; fieldErrors?: Record<string, string> } | void | undefined;
type User = { id: string; name: string; email: string; status: string; verified: boolean; roles: string[] };
type Kind = "disable" | "reset" | "impersonate";

interface AdminUsersState extends Magics {
  config: AdminUsersConfig;
  root: HTMLElement | null;
  notice: { tone: "success" | "danger"; text: string } | null;
  noticeTimer: ReturnType<typeof setTimeout> | undefined;
  alive: boolean;
  busy: boolean;
  addOpen: boolean;
  draft: { name: string; email: string; password: string; sendInvite: boolean; verified: boolean; on: Record<string, boolean>; tags: string[] };
  nameBad: boolean;
  emailBad: boolean;
  passwordBad: boolean;
  nameMsg: string;
  emailMsg: string;
  passwordMsg: string;
  rolesMsg: string;
  formError: string | null;
  rolesOpen: boolean;
  editing: User | null;
  editOn: Record<string, boolean>;
  rolesError: string | null;
  confirmOpen: boolean;
  confirmKind: Kind | null;
  confirmUser: User | null;
  confirmError: string | null;
  report(failure: string | null, ok: string): boolean;
  verify(user: User): Promise<void>;
  setDisabled(user: User, disabled: boolean): Promise<void>;
  openConfirm(kind: Kind, user: User): void;
  openRoles(user: User): void;
  rolesChanged: boolean;
  canSaveRoles: boolean;
  say(tone: "success" | "danger", text: string): void;
  ask(name: string, detail: Record<string, unknown>): Promise<Outcome>;
  failure(run: () => Promise<Outcome>): Promise<string | null>;
  fill(template: string, values: Record<string, string>): string;
  num(value: number): string;
  chosenRoles(on: Record<string, boolean>): string[];
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const adminUsers: Register = (Alpine) => {
  Alpine.data("nqAdminUsers", (config: AdminUsersConfig) => ({
    config,
    root: null as HTMLElement | null,
    notice: null as { tone: "success" | "danger"; text: string } | null,
    noticeTimer: undefined as ReturnType<typeof setTimeout> | undefined,
    alive: true,
    busy: false,

    addOpen: false,
    draft: { name: "", email: "", password: "", sendInvite: true, verified: false, on: {} as Record<string, boolean>, tags: [] as string[] },
    nameBad: false,
    emailBad: false,
    passwordBad: false,
    nameMsg: "",
    emailMsg: "",
    passwordMsg: "",
    rolesMsg: "",
    formError: null as string | null,

    rolesOpen: false,
    editing: null as User | null,
    editOn: {} as Record<string, boolean>,
    rolesError: null as string | null,

    confirmOpen: false,
    confirmKind: null as Kind | null,
    confirmUser: null as User | null,
    confirmError: null as string | null,

    init(this: AdminUsersState) {
      this.root = this.$el;
    },
    destroy(this: AdminUsersState) {
      this.alive = false;
      clearTimeout(this.noticeTimer);
    },
    num(this: AdminUsersState, value: number) {
      return new Intl.NumberFormat(`${this.config.locale ?? "en"}-u-nu-latn`).format(value);
    },
    fill(_template: string, values: Record<string, string>) {
      return Object.entries(values).reduce((out, [k, v]) => out.split(`{${k}}`).join(v), _template);
    },
    say(this: AdminUsersState, tone: "success" | "danger", text: string) {
      this.notice = { tone, text };
      clearTimeout(this.noticeTimer);
      this.noticeTimer = setTimeout(() => (this.notice = null), 6000);
    },
    /** Fire an event on the root and wait for the promise the host hands to `wait`. */
    async ask(this: AdminUsersState, name: string, detail: Record<string, unknown>): Promise<Outcome> {
      let pending: Promise<Outcome> | undefined;
      const event = new CustomEvent(name, { bubbles: true, detail: { ...detail, wait: (p: Promise<Outcome>) => (pending = Promise.resolve(p)) } });
      (this.root ?? this.$el).dispatchEvent(event);
      if (!pending) throw new Error("no listener");
      return pending;
    },
    /** null on success, the error text ("" for a generic failure) otherwise. */
    async failure(this: AdminUsersState, run: () => Promise<Outcome>) {
      try {
        const result = await run();
        return result && typeof result === "object" && result.error ? result.error : null;
      } catch {
        return "";
      }
    },
    chosenRoles(on: Record<string, boolean>) {
      return Object.keys(on).filter((k) => on[k]);
    },

    /* ---------------------------------------------------------------- row actions */
    onAction(this: AdminUsersState, event: CustomEvent<{ action: string; row: User }>) {
      const { action, row } = event.detail;
      const self = row.id === this.config.currentUserId;
      if (action === "verify") {
        if (!row.verified) void this.verify(row);
      } else if (action === "roles") this.openRoles(row);
      else if (action === "reset") this.openConfirm("reset", row);
      else if (action === "impersonate") {
        if (!self && row.status === "active") this.openConfirm("impersonate", row);
      } else if (action === "disable") {
        if (!self && row.status !== "disabled") this.openConfirm("disable", row);
      } else if (action === "enable") {
        if (row.status === "disabled") void this.setDisabled(row, false);
      }
    },
    onRowClick(this: AdminUsersState, event: CustomEvent<{ row: User }>) {
      this.root?.dispatchEvent(new CustomEvent("open", { bubbles: true, detail: { user: event.detail.row } }));
    },
    report(this: AdminUsersState, failure: string | null, ok: string) {
      if (!this.alive) return false;
      if (failure === null) this.say("success", ok);
      else this.say("danger", failure || this.config.labels.failed!);
      return failure === null;
    },
    async verify(this: AdminUsersState, user: User) {
      const failure = await this.failure(() => this.ask("verify", { user }));
      this.report(failure, this.fill(this.config.labels.verifiedOk!, { name: user.name }));
    },
    async setDisabled(this: AdminUsersState, user: User, disabled: boolean) {
      const failure = await this.failure(() => this.ask("set-disabled", { user, disabled }));
      this.report(failure, this.fill(disabled ? this.config.labels.disabledOk! : this.config.labels.enabledOk!, { name: user.name }));
    },
    async bulk(this: AdminUsersState, kind: "verify" | "disable", rows: User[]) {
      const self = this.config.currentUserId;
      const targets = rows.filter((u) => (kind === "verify" ? !u.verified : u.status !== "disabled" && u.id !== self));
      const results = await Promise.all(targets.map((user) => this.failure(() => (kind === "verify" ? this.ask("verify", { user }) : this.ask("set-disabled", { user, disabled: true })))));
      const failed = results.filter((r) => r !== null).length;
      if (this.alive) this.say(failed ? "danger" : "success", failed ? this.config.labels.failed! : this.fill(this.config.labels.bulkOk!, { n: this.num(targets.length) }));
    },

    /* ---------------------------------------------------------------- confirm dialog */
    openConfirm(this: AdminUsersState, kind: Kind, user: User) {
      this.confirmKind = kind;
      this.confirmUser = user;
      this.confirmError = null;
      this.confirmOpen = true;
    },
    get confirmTitle() {
      const self = this as unknown as AdminUsersState;
      const k = self.confirmKind;
      const name = self.confirmUser?.name ?? "";
      if (!k) return "";
      return self.fill(self.config.labels[`${k}Title`]!, { name });
    },
    get confirmBody() {
      const self = this as unknown as AdminUsersState;
      return self.confirmKind ? self.config.labels[`${self.confirmKind}Body`]! : "";
    },
    get confirmAction() {
      const self = this as unknown as AdminUsersState;
      return self.confirmKind ? self.config.labels[`${self.confirmKind}Confirm`]! : "";
    },
    async runConfirm(this: AdminUsersState) {
      const kind = this.confirmKind;
      const user = this.confirmUser;
      if (!kind || !user || this.busy) return;
      this.busy = true;
      this.confirmError = null;
      const failure = await this.failure(() => (kind === "disable" ? this.ask("set-disabled", { user, disabled: true }) : kind === "reset" ? this.ask("reset-password", { user }) : this.ask("impersonate", { user })));
      if (!this.alive) return;
      this.busy = false;
      if (failure === null) {
        this.confirmOpen = false;
        this.say("success", this.fill(this.config.labels[`${kind}Ok`]!, { name: user.name }));
      } else this.confirmError = failure || this.config.labels.failed!;
    },

    /* ---------------------------------------------------------------- roles dialog */
    openRoles(this: AdminUsersState, user: User) {
      this.editing = user;
      this.editOn = Object.fromEntries(Object.keys(this.config.roles).map((id) => [id, user.roles.includes(id)]));
      this.rolesError = null;
      this.rolesOpen = true;
    },
    get rolesTitle() {
      const self = this as unknown as AdminUsersState;
      return self.editing ? self.fill(self.config.labels.rolesTitle!, { name: self.editing.name }) : "";
    },
    get rolesChanged() {
      const self = this as unknown as AdminUsersState;
      const user = self.editing;
      if (!user) return false;
      const next = self.chosenRoles(self.editOn);
      return next.length !== user.roles.length || next.some((r) => !user.roles.includes(r));
    },
    get canSaveRoles() {
      const self = this as unknown as AdminUsersState;
      return self.rolesChanged && self.chosenRoles(self.editOn).length > 0;
    },
    async saveRoles(this: AdminUsersState) {
      const user = this.editing;
      if (!user || this.busy || !this.canSaveRoles) return;
      this.busy = true;
      const roles = this.chosenRoles(this.editOn);
      const failure = await this.failure(() => this.ask("update-roles", { user, roles }));
      if (!this.alive) return;
      this.busy = false;
      if (failure === null) {
        this.rolesOpen = false;
        this.say("success", this.fill(this.config.labels.rolesOk!, { name: user.name }));
      } else this.rolesError = failure || this.config.labels.failed!;
    },

    /* ---------------------------------------------------------------- add dialog */
    openAdd(this: AdminUsersState) {
      const free = this.config.freeRoles === true;
      const ids = Object.keys(this.config.roles);
      const initial = this.config.defaultRoles ?? (free ? [] : ids.slice(0, 1));
      this.draft = {
        name: "",
        email: "",
        password: "",
        sendInvite: true,
        verified: false,
        on: Object.fromEntries(ids.map((id) => [id, initial.includes(id)])),
        tags: free ? [...initial] : [],
      };
      this.nameBad = this.emailBad = this.passwordBad = false;
      this.nameMsg = this.emailMsg = this.passwordMsg = this.rolesMsg = "";
      this.formError = null;
      this.addOpen = true;
    },
    get hasPassword() {
      const self = this as unknown as AdminUsersState;
      return self.config.password === true && self.draft.password !== "";
    },
    async submitAdd(this: AdminUsersState) {
      if (this.busy) return;
      const d = this.draft;
      const L = this.config.labels;
      const free = this.config.freeRoles === true;
      const roles = free ? [...d.tags] : this.chosenRoles(d.on);
      this.nameMsg = this.emailMsg = this.passwordMsg = this.rolesMsg = "";
      if (!d.name.trim()) this.nameMsg = L.nameRequired!;
      if (!d.email.trim()) this.emailMsg = L.emailRequired!;
      else if (!EMAIL.test(d.email.trim())) this.emailMsg = L.emailInvalid!;
      if (!free && roles.length === 0) this.rolesMsg = L.rolesRequired!;
      const min = this.config.minPasswordLength ?? 8;
      if (this.config.password && d.password && d.password.length < min) this.passwordMsg = this.fill(L.passwordShort!, { min: this.num(min) });
      this.nameBad = this.nameMsg !== "";
      this.emailBad = this.emailMsg !== "";
      this.passwordBad = this.passwordMsg !== "";
      this.formError = null;
      if (this.nameBad || this.emailBad || this.passwordBad || this.rolesMsg !== "") return;
      const values: Record<string, unknown> = { name: d.name.trim(), email: d.email.trim(), roles, sendInvite: d.sendInvite, verified: d.verified };
      if (this.config.password && d.password) {
        values.password = d.password;
        values.sendInvite = false;
      }
      this.busy = true;
      let result: Outcome;
      let thrown = false;
      try {
        result = await this.ask("add-user", { values });
      } catch {
        thrown = true;
      }
      if (!this.alive) return;
      this.busy = false;
      if (thrown) {
        this.formError = L.failed!;
        return;
      }
      if (result && typeof result === "object" && (result.error || result.fieldErrors)) {
        this.nameMsg = result.fieldErrors?.name ?? "";
        this.emailMsg = result.fieldErrors?.email ?? "";
        this.nameBad = this.nameMsg !== "";
        this.emailBad = this.emailMsg !== "";
        this.formError = result.error ?? null;
      } else {
        this.addOpen = false;
        this.say("success", this.fill(L.addedOk!, { name: String(values.name) }));
      }
    },
  }));
};
