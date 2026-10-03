// nqMembersManager: the dialogs and actions of the members manager (invite, change role, remove, transfer ownership, leave, resend / revoke invites).
// The table and the pending list are server-rendered; the state lives here.
//
//   <div x-data="nqMembersManager({ locale: 'en', currentUserId: 'm1', ownerRole: 'owner', grantable: ['admin'], members: {…}, invites: {…}, roles: {…}, labels: {…} })"
//        x-on:nq-data-table-action="onAction($event)"> … </div>
//
// It is presentational: the host does the work. Each action fires an event on the root with detail `{ …, wait(promise) }`:
//   invite           { values: { emails, role }, wait }    resolve, or { error, emailsError }
//   change-role      { member, role, wait }
//   remove           { member, wait }
//   transfer-ownership { member, wait }
//   resend-invite    { invite, wait }
//   revoke-invite    { invite, wait }
//   leave            { wait }
// A rejected promise, or nobody listening, shows the generic error. After a success the host re-renders the page.
// The last owner is protected: they cannot be demoted, removed or leave. Blocked actions explain why in the notice.

import type { Magics, Register } from "./types";

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
}
interface Invite {
  id: string;
  email: string;
  role: string;
}

interface MembersConfig {
  locale?: string;
  currentUserId?: string | null;
  ownerRole: string;
  grantable: string[];
  members: Record<string, Member>;
  invites: Record<string, Invite>;
  roles: Record<string, { label: string; description?: string }>;
  defaultRole: string;
  labels: Record<string, string>;
}

type Outcome = { error?: string; emailsError?: string } | void | undefined;
type Kind = "remove" | "transfer" | "leave";
type Block = "self-last-owner" | "not-grantable" | "owner-only" | "self";

interface MembersState extends Magics {
  config: MembersConfig;
  root: HTMLElement | null;
  notice: { tone: "success" | "danger"; text: string } | null;
  noticeTimer: ReturnType<typeof setTimeout> | undefined;
  alive: boolean;
  busy: boolean;
  busyIds: Record<string, boolean>;
  inviteOpen: boolean;
  draft: { emails: string[]; role: string };
  emailsBad: boolean;
  emailsMsg: string;
  formError: string | null;
  roleOpen: boolean;
  roleMember: Member | null;
  roleDraft: string;
  roleError: string | null;
  confirmOpen: boolean;
  confirmKind: Kind | null;
  confirmMember: Member | null;
  confirmError: string | null;
  say(tone: "success" | "danger", text: string): void;
  ask(name: string, detail: Record<string, unknown>): Promise<Outcome>;
  failure(run: () => Promise<Outcome>): Promise<string | null>;
  fill(template: string, values: Record<string, string>): string;
  num(value: number): string;
  report(failure: string | null, ok: string): boolean;
  ownerCount(): number;
  isLastOwner(member: Member): boolean;
  roleBlock(member: Member): Block | null;
  removeBlockOf(member: Member): Block | null;
  reasonText(block: Block): string;
  openRole(member: Member): void;
  openConfirm(kind: Kind, member: Member | null): void;
  closeConfirm(): void;
  isBusy(id: string): boolean;
  withBusy(id: string, run: () => Promise<void>): Promise<void>;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const membersManager: Register = (Alpine) => {
  Alpine.data("nqMembersManager", (config: MembersConfig) => ({
    config,
    root: null as HTMLElement | null,
    notice: null as { tone: "success" | "danger"; text: string } | null,
    noticeTimer: undefined as ReturnType<typeof setTimeout> | undefined,
    alive: true,
    busy: false,
    busyIds: {} as Record<string, boolean>,

    inviteOpen: false,
    draft: { emails: [] as string[], role: config.defaultRole },
    emailsBad: false,
    emailsMsg: "",
    formError: null as string | null,

    roleOpen: false,
    roleMember: null as Member | null,
    roleDraft: "",
    roleError: null as string | null,

    confirmOpen: false,
    confirmKind: null as Kind | null,
    confirmMember: null as Member | null,
    confirmError: null as string | null,

    init(this: MembersState) {
      this.root = this.$el;
    },
    destroy(this: MembersState) {
      this.alive = false;
      clearTimeout(this.noticeTimer);
    },
    num(this: MembersState, value: number) {
      return new Intl.NumberFormat(`${this.config.locale ?? "en"}-u-nu-latn`).format(value);
    },
    fill(template: string, values: Record<string, string>) {
      return Object.entries(values).reduce((out, [k, v]) => out.split(`{${k}}`).join(v), template);
    },
    say(this: MembersState, tone: "success" | "danger", text: string) {
      this.notice = { tone, text };
      clearTimeout(this.noticeTimer);
      this.noticeTimer = setTimeout(() => (this.notice = null), 6000);
    },
    /** Fire an event on the root and wait for the promise the host hands to `wait`. */
    async ask(this: MembersState, name: string, detail: Record<string, unknown>): Promise<Outcome> {
      let pending: Promise<Outcome> | undefined;
      const event = new CustomEvent(name, { bubbles: true, detail: { ...detail, wait: (p: Promise<Outcome>) => (pending = Promise.resolve(p)) } });
      (this.root ?? this.$el).dispatchEvent(event);
      if (!pending) throw new Error("no listener");
      return pending;
    },
    /** null on success, the error text ("" for a generic failure) otherwise. */
    async failure(this: MembersState, run: () => Promise<Outcome>) {
      try {
        const result = await run();
        return result && typeof result === "object" && result.error ? result.error : null;
      } catch {
        return "";
      }
    },
    report(this: MembersState, failure: string | null, ok: string) {
      if (!this.alive) return false;
      if (failure === null) this.say("success", ok);
      else this.say("danger", failure || this.config.labels.failed!);
      return failure === null;
    },
    isBusy(this: MembersState, id: string) {
      return this.busyIds[id] === true;
    },
    async withBusy(this: MembersState, id: string, run: () => Promise<void>) {
      this.busyIds = { ...this.busyIds, [id]: true };
      try {
        await run();
      } finally {
        if (this.alive) {
          const next = { ...this.busyIds };
          delete next[id];
          this.busyIds = next;
        }
      }
    },

    /* ---------------------------------------------------------------- rules (the React members-rules, on the config) */
    ownerCount(this: MembersState) {
      return Object.values(this.config.members).filter((m) => m.role === this.config.ownerRole).length;
    },
    isLastOwner(this: MembersState, member: Member) {
      return member.role === this.config.ownerRole && this.ownerCount() <= 1;
    },
    roleBlock(this: MembersState, member: Member): Block | null {
      if (this.isLastOwner(member)) return "self-last-owner";
      if (member.role === this.config.ownerRole) return "owner-only";
      if (!this.config.grantable.includes(member.role)) return "not-grantable";
      return null;
    },
    removeBlockOf(this: MembersState, member: Member): Block | null {
      if (member.id === this.config.currentUserId) return "self";
      if (this.isLastOwner(member)) return "self-last-owner";
      return null;
    },
    reasonText(this: MembersState, block: Block) {
      const L = this.config.labels;
      return block === "self-last-owner" ? L.blockLastOwner! : block === "owner-only" ? L.blockOwnerOnly! : block === "not-grantable" ? L.blockNotGrantable! : L.blockSelf!;
    },

    /* ---------------------------------------------------------------- row actions */
    onAction(this: MembersState, event: CustomEvent<{ action: string; row: { id: string } }>) {
      const { action, row } = event.detail;
      const member = this.config.members[String(row.id)];
      if (!member) return;
      if (action === "role") {
        const block = this.roleBlock(member);
        if (block) this.say("danger", this.reasonText(block));
        else this.openRole(member);
      } else if (action === "transfer") {
        if (member.role !== this.config.ownerRole) this.openConfirm("transfer", member);
      } else if (action === "remove") {
        const block = this.removeBlockOf(member);
        if (block) this.say("danger", this.reasonText(block));
        else this.openConfirm("remove", member);
      }
    },

    /* ---------------------------------------------------------------- pending invites */
    async resend(this: MembersState, id: string) {
      const invite = this.config.invites[id];
      if (!invite || this.isBusy(id)) return;
      await this.withBusy(id, async () => {
        const failure = await this.failure(() => this.ask("resend-invite", { invite }));
        this.report(failure, this.fill(this.config.labels.resentOk!, { email: invite.email }));
      });
    },
    async revokeInvite(this: MembersState, id: string) {
      const invite = this.config.invites[id];
      if (!invite || this.isBusy(id)) return;
      await this.withBusy(id, async () => {
        const failure = await this.failure(() => this.ask("revoke-invite", { invite }));
        this.report(failure, this.fill(this.config.labels.revokedOk!, { email: invite.email }));
      });
    },

    /* ---------------------------------------------------------------- change role */
    openRole(this: MembersState, member: Member) {
      this.roleMember = member;
      this.roleDraft = member.role;
      this.roleError = null;
      this.roleOpen = true;
    },
    get roleDialogTitle() {
      const self = this as unknown as MembersState;
      return self.roleMember ? self.fill(self.config.labels.roleTitle!, { name: self.roleMember.name }) : "";
    },
    async saveRole(this: MembersState) {
      const member = this.roleMember;
      if (!member || this.busy) return;
      if (!this.roleDraft || this.roleDraft === member.role) {
        this.roleOpen = false;
        return;
      }
      this.busy = true;
      this.roleError = null;
      const role = this.roleDraft;
      const failure = await this.failure(() => this.ask("change-role", { member, role }));
      if (!this.alive) return;
      this.busy = false;
      if (failure === null) {
        this.roleOpen = false;
        this.say("success", this.fill(this.config.labels.roleOk!, { name: member.name }));
      } else this.roleError = failure || this.config.labels.failed!;
    },

    /* ---------------------------------------------------------------- confirm dialog */
    openConfirm(this: MembersState, kind: Kind, member: Member | null) {
      this.confirmKind = kind;
      this.confirmMember = member;
      this.confirmError = null;
      this.confirmOpen = true;
    },
    openLeave(this: MembersState) {
      this.openConfirm("leave", null);
    },
    closeConfirm(this: MembersState) {
      if (this.busy) return;
      this.confirmOpen = false;
      this.confirmError = null;
    },
    get confirmTitle() {
      const self = this as unknown as MembersState;
      const L = self.config.labels;
      const name = self.confirmMember?.name ?? "";
      return self.confirmKind === "remove" ? self.fill(L.removeTitle!, { name }) : self.confirmKind === "transfer" ? self.fill(L.transferTitle!, { name }) : self.confirmKind === "leave" ? L.leaveTitle! : "";
    },
    get confirmBody() {
      const self = this as unknown as MembersState;
      const L = self.config.labels;
      return self.confirmKind === "remove" ? L.removeBody! : self.confirmKind === "transfer" ? L.transferBody! : self.confirmKind === "leave" ? L.leaveBody! : "";
    },
    get confirmAction() {
      const self = this as unknown as MembersState;
      const L = self.config.labels;
      return self.confirmKind === "remove" ? L.removeConfirm! : self.confirmKind === "transfer" ? L.transferConfirm! : self.confirmKind === "leave" ? L.leaveConfirm! : "";
    },
    async runConfirm(this: MembersState) {
      const kind = this.confirmKind;
      const member = this.confirmMember;
      if (!kind || this.busy) return;
      this.busy = true;
      this.confirmError = null;
      const failure = await this.failure(() => (kind === "remove" ? this.ask("remove", { member }) : kind === "transfer" ? this.ask("transfer-ownership", { member }) : this.ask("leave", {})));
      if (!this.alive) return;
      this.busy = false;
      if (failure === null) {
        const L = this.config.labels;
        if (kind === "remove") this.say("success", this.fill(L.removedOk!, { name: member?.name ?? "" }));
        else if (kind === "transfer") this.say("success", this.fill(L.transferredOk!, { name: member?.name ?? "" }));
        this.confirmOpen = false;
      } else this.confirmError = failure || this.config.labels.failed!;
    },

    /* ---------------------------------------------------------------- invite dialog */
    openInvite(this: MembersState) {
      this.draft = { emails: [], role: this.config.defaultRole };
      this.emailsBad = false;
      this.emailsMsg = "";
      this.formError = null;
      this.inviteOpen = true;
    },
    /** The tag-input validator: true, or the message to show. */
    validateEmail(this: MembersState, tag: string, tags: string[]) {
      const L = this.config.labels;
      if (!EMAIL.test(tag.trim())) return this.fill(L.emailInvalid!, { v: tag });
      if (tags.some((x) => x.toLowerCase() === tag.toLowerCase())) return this.fill(L.emailDuplicate!, { v: tag });
      return true;
    },
    get roleDescription() {
      const self = this as unknown as MembersState;
      return self.config.roles[self.draft.role]?.description ?? "";
    },
    async submitInvite(this: MembersState) {
      if (this.busy) return;
      const L = this.config.labels;
      this.formError = null;
      if (this.draft.emails.length === 0) {
        this.emailsMsg = L.emailsRequired!;
        this.emailsBad = true;
        return;
      }
      this.emailsMsg = "";
      this.emailsBad = false;
      const values = { emails: [...this.draft.emails], role: this.draft.role };
      this.busy = true;
      let result: Outcome;
      let thrown = false;
      try {
        result = await this.ask("invite", { values });
      } catch {
        thrown = true;
      }
      if (!this.alive) return;
      this.busy = false;
      if (thrown) {
        this.formError = L.failed!;
        return;
      }
      if (result && typeof result === "object" && (result.error || result.emailsError)) {
        this.emailsMsg = result.emailsError ?? "";
        this.emailsBad = this.emailsMsg !== "";
        this.formError = result.error ?? null;
      } else {
        this.inviteOpen = false;
        const n = values.emails.length;
        this.say("success", n === 1 ? L.invitedOne! : this.fill(L.invitedMany!, { n: this.num(n) }));
      }
    },
  }));
};
