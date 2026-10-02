// nqProfileForm: the profile settings form (photo preview, public profile, account, preferences, Save / Discard bar).
// The markup is server-rendered (<x-nq::profile-form>); the state lives here. Each action fires an event on the root with
// detail `{ …, wait(promise) }`; the host does the work:
//
//   <form x-data="nqProfileForm({ values: {…}, hasCheck: true, labels: {…} })" x-on:submit.prevent="save()"
//         x-on:save="$event.detail.wait(update($event.detail.values))"> … </form>
//
//   save                 { values, wait }              resolve, or { error, fieldErrors } to keep the form and show them
//   check-username       { username, wait }            resolve true / false / { available, message }; only fired when `hasCheck`
//   resend-verification  { wait }                      resolve when the email is sent
//   change-email         { email, password, wait }     resolve, or { error, fieldErrors: { email, password } }
// A rejected promise, or nobody listening, shows the generic error.

import type { Magics, Register } from "./types";

type Values = { name: string; username: string; email: string; phone: string; bio: string; locale: string; timezone: string; location: string; website: string };
type Errors = Partial<Record<keyof Values | "password", string>>;
type Outcome = { error?: string; fieldErrors?: Errors } | void | undefined;
type Check = { status: "idle" | "checking" | "available" | "taken" | "error"; message?: string };
type Labels = Record<string, string>;
type Config = {
  values: Partial<Values>;
  hasLocation?: boolean;
  hasWebsite?: boolean;
  hasCheck?: boolean;
  debounce?: number;
  bioMax?: number;
  locale?: string;
  emailVerified?: boolean | null;
  labels: Labels;
};

const USERNAME = /^[a-z0-9][a-z0-9._-]{1,28}[a-z0-9]$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WEBSITE = /^https?:\/\/[^\s.]+\.[^\s]+$/i;
const KEYS = ["name", "username", "phone", "bio", "locale", "timezone", "location", "website"] as const;

/** Fire `name` on the root and wait for the promise the host passes to `wait`. Throws when nobody does. */
async function ask(root: HTMLElement, name: string, detail: Record<string, unknown>): Promise<Outcome> {
  let pending: Promise<Outcome> | undefined;
  root.dispatchEvent(new CustomEvent(name, { bubbles: true, detail: { ...detail, wait: (p: Promise<Outcome>) => (pending = Promise.resolve(p)) } }));
  if (!pending) throw new Error("no listener");
  return pending;
}

const failed = (r: Outcome): r is { error?: string; fieldErrors?: Errors } => !!r && typeof r === "object" && !!(r.error || r.fieldErrors);

interface ProfileState extends Magics {
  config: Config;
  name: string;
  username: string;
  phone: string;
  bio: string;
  locale: string;
  timezone: string;
  location: string;
  website: string;
  saved: Values;
  serverErrors: Errors;
  formError: string | null;
  notice: string | null;
  saving: boolean;
  attempted: boolean;
  check: Check;
  checkTimer: ReturnType<typeof setTimeout> | undefined;
  checkRun: number;
  dirty: boolean;
  blocked: boolean;
  errs: Errors;
  bad: Record<"name" | "username" | "bio" | "location" | "website" | "phone", boolean>;
  hint: string;
  counter: string;
  shownName: string;
  site: string;
  resend: "idle" | "sending" | "sent" | "failed";
  resendMsg: string;
  resendTimer: ReturnType<typeof setTimeout> | undefined;
  pendingEmail: string | null;
  emailOpen: boolean;
  newEmail: string;
  password: string;
  emailErrors: Errors;
  emailError: string | null;
  emailBusy: boolean;
  alive: boolean;
  last: Values | null;
  root: HTMLElement | null;
  values(): Values;
  sync(): void;
  schedule(): void;
  changed(): void;
  discard(): void;
  save(): Promise<void>;
  resendVerification(): Promise<void>;
  submitEmail(): Promise<void>;
}

export const profileForm: Register = (Alpine) => {
  Alpine.data("nqProfileForm", (config: Config) => {
    const start: Values = { name: "", username: "", email: "", phone: "", bio: "", locale: "en", timezone: "", location: "", website: "", ...config.values };
    return {
      config,
      name: start.name,
      username: start.username,
      phone: start.phone,
      bio: start.bio,
      locale: start.locale,
      timezone: start.timezone,
      location: start.location,
      website: start.website,
      saved: { ...start },
      serverErrors: {} as Errors,
      formError: null as string | null,
      notice: null as string | null,
      saving: false,
      attempted: false,
      check: { status: "idle" } as Check,
      checkTimer: undefined as ReturnType<typeof setTimeout> | undefined,
      checkRun: 0,
      dirty: false,
      blocked: false,
      errs: {} as Errors,
      bad: { name: false, username: false, bio: false, location: false, website: false, phone: false },
      hint: config.labels.usernameHelp ?? "",
      counter: "",
      shownName: start.name,
      site: "",
      resend: "idle" as "idle" | "sending" | "sent" | "failed",
      resendMsg: "",
      resendTimer: undefined as ReturnType<typeof setTimeout> | undefined,
      pendingEmail: null as string | null,
      emailOpen: false,
      newEmail: "",
      password: "",
      emailErrors: {} as Errors,
      emailError: null as string | null,
      emailBusy: false,
      alive: true,
      root: null as HTMLElement | null,

      init(this: ProfileState) {
        this.root = this.$el;
        this.last = this.values();
        this.sync();
        for (const key of KEYS) this.$watch(key, () => this.changed());
        this.$watch("emailOpen", (open: boolean) => {
          if (open) return;
          this.newEmail = "";
          this.password = "";
          this.emailErrors = {};
          this.emailError = null;
        });
      },
      destroy(this: ProfileState) {
        this.alive = false;
        clearTimeout(this.checkTimer);
        clearTimeout(this.resendTimer);
      },
      values(this: ProfileState): Values {
        return { ...this.saved, name: this.name, username: this.username, phone: this.phone, bio: this.bio, locale: this.locale, timezone: this.timezone, location: this.location, website: this.website };
      },
      /** Any field changed: clean the username, drop the server error of what was edited, re-check, re-derive. */
      changed(this: ProfileState) {
        const clean = this.username.toLowerCase().replace(/[^a-z0-9._-]/g, "");
        if (clean !== this.username) {
          this.username = clean;
          return;
        }
        const now = this.values();
        const next = { ...this.serverErrors };
        for (const key of KEYS) if (now[key] !== this.last?.[key]) delete next[key];
        this.serverErrors = next;
        this.last = now;
        this.notice = null;
        this.schedule();
        this.sync();
      },
      last: null as Values | null,
      /** The debounced availability check; stale answers are dropped. */
      schedule(this: ProfileState) {
        this.checkRun++;
        clearTimeout(this.checkTimer);
        const value = this.username;
        if (!this.config.hasCheck || value === this.saved.username || !USERNAME.test(value)) {
          this.check = { status: "idle" };
          return;
        }
        const run = this.checkRun;
        this.check = { status: "checking" };
        this.checkTimer = setTimeout(async () => {
          let pending: Promise<unknown> | undefined;
          this.root!.dispatchEvent(new CustomEvent("check-username", { bubbles: true, detail: { username: value, wait: (p: Promise<unknown>) => (pending = Promise.resolve(p)) } }));
          try {
            if (!pending) {
              if (run === this.checkRun) this.check = { status: "idle" };
              return;
            }
            const result = (await pending) as boolean | { available: boolean; message?: string } | undefined;
            if (run !== this.checkRun || !this.alive || result === undefined) return;
            const free = typeof result === "boolean" ? result : result.available;
            this.check = { status: free ? "available" : "taken", message: typeof result === "object" ? result.message : undefined };
          } catch {
            if (run !== this.checkRun || !this.alive) return;
            this.check = { status: "error" };
          }
          this.sync();
        }, this.config.debounce ?? 400);
      },
      /** Works out the messages and flags the template shows. */
      sync(this: ProfileState) {
        const L = this.config.labels;
        const d = this.values();
        this.dirty = KEYS.some((k) => d[k] !== this.saved[k]);
        const local: Errors = {};
        if (this.attempted && !d.name.trim()) local.name = L.nameRequired;
        if (d.username && d.username !== this.saved.username && !USERNAME.test(d.username)) local.username = L.usernameFormat;
        if (this.attempted && !d.username) local.username = L.usernameFormat;
        if (this.check.status === "taken") local.username = this.check.message ?? L.usernameTaken;
        if (this.attempted && d.website && !WEBSITE.test(d.website.trim())) local.website = L.websiteInvalid;
        this.errs = { ...this.serverErrors, ...local };
        this.blocked = this.check.status === "checking" || this.check.status === "taken" || !!local.username;
        this.bad = { name: !!this.errs.name, username: !!this.errs.username, bio: !!this.errs.bio, location: !!this.errs.location, website: !!this.errs.website, phone: !!this.errs.phone };
        const s = this.check.status;
        this.hint = s === "checking" ? L.usernameChecking! : s === "available" ? (this.check.message ?? L.usernameAvailable!.replace("{x}", `@${d.username}`)) : s === "error" ? L.usernameCheckFailed! : L.usernameHelp!;
        const fmt = new Intl.NumberFormat(this.config.locale ?? "en", { numberingSystem: "latn" });
        this.counter = `${fmt.format(Array.from(d.bio).length)}/${fmt.format(this.config.bioMax ?? 160)}`;
        this.shownName = d.name.trim() || this.saved.name;
        this.site = d.website.trim().replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
      },
      discard(this: ProfileState) {
        this.name = this.saved.name;
        this.username = this.saved.username;
        this.phone = this.saved.phone;
        this.bio = this.saved.bio;
        this.locale = this.saved.locale;
        this.timezone = this.saved.timezone;
        this.location = this.saved.location;
        this.website = this.saved.website;
        this.serverErrors = {};
        this.formError = null;
        this.attempted = false;
        this.last = this.values();
        this.schedule();
        this.sync();
      },
      async save(this: ProfileState) {
        if (!this.dirty || this.saving) return;
        this.attempted = true;
        this.sync();
        const d = this.values();
        if (this.blocked || !d.name.trim() || !d.username || (d.website && !WEBSITE.test(d.website.trim()))) return;
        this.saving = true;
        this.formError = null;
        this.notice = null;
        try {
          const values = { ...d, name: d.name.trim() };
          const result = await ask(this.root!, "save", { values });
          if (!this.alive) return;
          if (failed(result)) {
            this.serverErrors = result.fieldErrors ?? {};
            this.formError = result.error ?? null;
          } else {
            this.saved = values;
            this.name = values.name;
            this.last = this.values();
            this.serverErrors = {};
            this.attempted = false;
            this.notice = this.config.labels.saved!;
          }
        } catch {
          if (this.alive) this.formError = this.config.labels.saveFailed!;
        } finally {
          if (this.alive) {
            this.saving = false;
            this.sync();
          }
        }
      },
      async resendVerification(this: ProfileState) {
        if (this.resend === "sending") return;
        const L = this.config.labels;
        this.resend = "sending";
        this.resendMsg = "";
        try {
          await ask(this.root!, "resend-verification", {});
          this.resend = "sent";
          this.resendMsg = L.resent!.replace("{x}", this.saved.email);
          clearTimeout(this.resendTimer);
          // Sending again is possible after a short pause, so the link is not hammered.
          this.resendTimer = setTimeout(() => {
            this.resend = "idle";
            this.resendMsg = "";
          }, 30_000);
        } catch {
          this.resend = "failed";
          this.resendMsg = L.resendFailed!;
        }
      },
      async submitEmail(this: ProfileState) {
        if (this.emailBusy) return;
        const L = this.config.labels;
        const next: Errors = {};
        const value = this.newEmail.trim();
        if (!EMAIL.test(value)) next.email = L.emailInvalid;
        else if (value.toLowerCase() === this.saved.email.toLowerCase()) next.email = L.emailSame;
        if (!this.password) next.password = L.passwordRequired;
        this.emailErrors = next;
        if (next.email || next.password) return;
        this.emailBusy = true;
        this.emailError = null;
        try {
          const result = await ask(this.root!, "change-email", { email: value, password: this.password });
          if (!this.alive) return;
          if (failed(result)) {
            this.emailErrors = result.fieldErrors ?? {};
            this.emailError = result.error ?? null;
          } else {
            this.pendingEmail = value;
            this.emailOpen = false;
          }
        } catch {
          if (this.alive) this.emailError = L.changeEmailFailed!;
        } finally {
          if (this.alive) this.emailBusy = false;
        }
      },
    };
  });
};
