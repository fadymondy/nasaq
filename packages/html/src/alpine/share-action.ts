// nqShareAction: a share button and dialog: invite people by email with a role, the people who already have access, link access
// (restricted or anyone with the link) with an expiry, the link to copy, the native share sheet and an email link. The markup is the React
// ShareButton / ShareDialog's (see the Blade component); the state lives here.
//
//   <div x-data="nqShareAction('https://app.example.com/docs/q3', [], { title: 'Q3 plan', invite: true })">…</div>
//
// Options: title, text, roles ([{ value, label }]), defaultRole, defaultAccess, defaultLinkRole, defaultExpiry, invite (show the invite section).
// Events (bubbling): "invite" { emails, role, done(), fail(message) } (answer it, or the dialog waits), "rolechange" { person, role },
// "remove" { person } (the row is also removed here), "linkchange" { access, role, expiry, expiresAt }, "copy" { url }, "shared".

import { copyText } from "./copy-button";
import { defaultRoles, expiryToDate, isEmail, mailtoLink, strings, withExpiry, type ShareExpiry } from "./share-action-logic";
import type { Magics, Register } from "./types";

type Access = "restricted" | "anyone";
interface Role {
  value: string;
  label: string;
}
interface Person {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  role: string;
  owner?: boolean;
}

export interface ShareActionOptions {
  title?: string;
  text?: string;
  roles?: Role[];
  defaultRole?: string;
  defaultAccess?: Access;
  defaultLinkRole?: string;
  defaultExpiry?: ShareExpiry;
  invite?: boolean;
}

interface State extends Magics {
  $nq: { t(en: string, ar: string): string; locale: string };
  url: string;
  people: Person[];
  roles: Role[];
  title: string | undefined;
  text: string | undefined;
  dlg: boolean;
  inviteRole: string;
  emails: string[];
  pending: boolean;
  message: { tone: "success" | "danger"; text: string } | null;
  access: Access;
  linkRole: string;
  expiry: ShareExpiry;
  canShare: boolean;
  copied: boolean;
  root: HTMLElement;
  s(): ReturnType<typeof strings>;
  fire(name: string, detail?: unknown): void;
  shareLink(): string;
  mailHref(): string;
  roleLabel(value: string): string;
  validate(tag: string, tags: readonly string[]): boolean | string;
  invalidEmail(tag: string): string;
  roleFor(name: string): string;
  removeFor(name: string): string;
  sendInvite(): Promise<void>;
  emitLink(): void;
  removePerson(person: Person): void;
  copyLink(): Promise<void>;
  nativeShare(): Promise<void>;
}

export const shareAction: Register = (Alpine) => {
  Alpine.data("nqShareAction", (url = "", people: Person[] = [], options: ShareActionOptions = {}) => ({
    url,
    people,
    roles: options.roles ?? ([] as Role[]),
    title: options.title,
    text: options.text,
    dlg: false,
    inviteRole: options.defaultRole ?? options.roles?.[0]?.value ?? "viewer",
    emails: [] as string[],
    pending: false,
    message: null as { tone: "success" | "danger"; text: string } | null,
    access: (options.defaultAccess ?? "restricted") as Access,
    linkRole: options.defaultLinkRole ?? options.roles?.[0]?.value ?? "viewer",
    expiry: (options.defaultExpiry ?? "never") as ShareExpiry,
    canShare: false,
    copied: false,
    root: null as unknown as HTMLElement,

    init(this: State) {
      this.root = this.$el;
      if (!this.roles.length) this.roles = defaultRoles(this.$nq.locale);
      this.canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
      this.$watch<boolean>("dlg", (open) => {
        if (open) return;
        this.emails = [];
        this.message = null;
      });
      // Link settings changes are announced once they settle, so the first render is silent.
      for (const key of ["access", "linkRole", "expiry"]) this.$watch(key, () => this.emitLink());
    },

    s(this: State) {
      return strings(this.$nq.locale);
    },
    fire(this: State, name: string, detail?: unknown) {
      this.root.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
    },
    shareLink(this: State) {
      return this.access === "anyone" ? withExpiry(this.url, this.expiry) : this.url;
    },
    mailHref(this: State) {
      return mailtoLink(this.shareLink(), this.title, this.text);
    },
    roleLabel(this: State, value: string) {
      return this.roles.find((r) => r.value === value)?.label ?? value;
    },
    validate(this: State, tag: string, tags: readonly string[]) {
      return isEmail(tag) ? !tags.includes(tag.toLowerCase()) : this.invalidEmail(tag);
    },
    invalidEmail(this: State, tag: string) {
      return this.s().invalidEmail(tag);
    },
    roleFor(this: State, name: string) {
      return this.s().roleFor(name);
    },
    removeFor(this: State, name: string) {
      return this.s().removeFor(name);
    },

    async sendInvite(this: State) {
      if (!this.emails.length) return;
      const emails = [...this.emails];
      this.pending = true;
      this.message = null;
      try {
        await new Promise<void>((resolve, reject) => {
          this.fire("invite", { emails, role: this.inviteRole, done: () => resolve(), fail: (m?: string) => reject(new Error(m)) });
        });
        this.message = { tone: "success", text: this.s().inviteSent(emails.join(", ")) };
        this.emails = [];
      } catch (error) {
        this.message = { tone: "danger", text: (error as Error)?.message || this.s().failed };
      } finally {
        this.pending = false;
      }
    },
    emitLink(this: State) {
      this.fire("linkchange", { access: this.access, role: this.linkRole, expiry: this.expiry, expiresAt: expiryToDate(this.expiry) });
    },
    removePerson(this: State, person: Person) {
      this.people = this.people.filter((p) => p.id !== person.id);
      this.fire("remove", { person });
    },
    async copyLink(this: State) {
      const link = this.shareLink();
      if (!(await copyText(link))) return;
      this.copied = true;
      this.fire("copy", { url: link });
      setTimeout(() => (this.copied = false), 1500);
    },
    async nativeShare(this: State) {
      try {
        await navigator.share({ url: this.shareLink(), title: this.title, text: this.text });
        this.fire("shared");
      } catch {
        /* The user closed the sheet. */
      }
    },
  }));
};
