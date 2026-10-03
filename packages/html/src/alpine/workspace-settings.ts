// nqWorkspaceForm: the create-workspace form (also inside the create dialog and the onboarding page).
// nqWorkspaceSettings: general settings (rename, address), leave and delete of one workspace.
// nqWorkspaceList: the list of workspaces with an Open button that waits for the host.
// The markup is server-rendered (the Blade components); the state lives here. Each action fires an event on the root with
// detail `{ …, wait(promise) }`; the host does the work:
//
//   <form x-data="nqWorkspaceForm({ showSlug: true, hasCheck: true, labels: {…} })" x-on:submit.prevent="submit()"
//         x-on:create="$event.detail.wait(createWorkspace($event.detail.values))" x-on:check-slug="$event.detail.wait(isFree($event.detail.slug))"> … </form>
//
//   create       { values: { name, slug }, wait }   resolve, or { error, fieldErrors: { name, slug } } to keep the form
//   check-slug   { slug, wait }                      resolve true / false / { available, message }; only fired when `hasCheck`
//   cancel       (no detail)
//   rename       { values, wait }                    like create
//   leave        { wait }                            resolve, or { error }
//   delete       { wait }                            resolve, or { error } (raised from the danger zone's nq-account-delete)
//   open         { workspace, wait? }                the list's Open button
//   create       (no detail)                         the list's New workspace button
// A rejected promise, or nobody listening, shows the generic error.

import type { Magics, Register } from "./types";

type Errors = { name?: string; slug?: string };
type Outcome = { error?: string; fieldErrors?: Errors } | void | undefined;
type Check = { status: "idle" | "checking" | "available" | "taken" | "error"; message?: string };
type Labels = Record<string, string>;

const SLUG_MIN = 3;
const SLUG_MAX = 40;
const SLUG = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

const slugify = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, "");

type Problem = "Empty" | "Short" | "Long" | "Format";
const slugProblem = (slug: string): Problem | null => (!slug ? "Empty" : slug.length < SLUG_MIN ? "Short" : slug.length > SLUG_MAX ? "Long" : !SLUG.test(slug) ? "Format" : null);

/** Fire `name` on the root and wait for the promise the host passes to `wait`. Throws when nobody does. */
async function ask(root: HTMLElement, name: string, detail: Record<string, unknown>): Promise<Outcome> {
  let pending: Promise<Outcome> | undefined;
  root.dispatchEvent(new CustomEvent(name, { bubbles: true, detail: { ...detail, wait: (p: Promise<Outcome>) => (pending = Promise.resolve(p)) } }));
  if (!pending) throw new Error("no listener");
  return pending;
}

interface CheckHost extends Magics {
  config: { hasCheck?: boolean; showSlug?: boolean; defaultName?: string; labels: Labels };
  slug: string;
  check: Check;
  checkTimer: ReturnType<typeof setTimeout> | undefined;
  checkRun: number;
  skipCheck(): boolean;
  sync(): void;
  alive: boolean;
  root: HTMLElement | null;
}

/** The debounced availability check, shared by the form and the settings. */
function scheduleCheck(host: CheckHost) {
  host.checkRun++;
  clearTimeout(host.checkTimer);
  if (!host.config.hasCheck || host.skipCheck() || slugProblem(host.slug)) {
    host.check = { status: "idle" };
    host.sync();
    return;
  }
  const run = host.checkRun;
  const slug = host.slug;
  host.check = { status: "checking" };
  host.sync();
  host.checkTimer = setTimeout(async () => {
    let pending: Promise<unknown> | undefined;
    host.root!.dispatchEvent(new CustomEvent("check-slug", { bubbles: true, detail: { slug, wait: (p: Promise<unknown>) => (pending = Promise.resolve(p)) } }));
    if (!pending) {
      if (run === host.checkRun) {
        host.check = { status: "idle" };
        host.sync();
      }
      return;
    }
    try {
      const result = (await pending) as boolean | { available: boolean; message?: string } | undefined;
      if (run !== host.checkRun || !host.alive || result === undefined) return;
      const free = typeof result === "boolean" ? result : result.available;
      host.check = { status: free ? "available" : "taken", message: typeof result === "object" ? result.message : undefined };
    } catch {
      if (run !== host.checkRun || !host.alive) return;
      host.check = { status: "error" };
    }
    host.sync();
  }, 400);
}

interface FormState extends CheckHost {
  name: string;
  touched: boolean;
  attempted: boolean;
  serverErrors: Errors;
  formError: string | null;
  busy: boolean;
  open: boolean;
  nameBad: boolean;
  nameMsg: string;
  slugBad: boolean;
  slugMsg: string;
  hint: string;
  reset(): void;
}

export const workspaceSettings: Register = (Alpine) => {
  Alpine.data("nqWorkspaceForm", (config: { showSlug?: boolean; hasCheck?: boolean; defaultName?: string; open?: boolean; labels: Labels }) => ({
    config,
    name: config.defaultName ?? "",
    slug: slugify(config.defaultName ?? ""),
    touched: false,
    attempted: false,
    check: { status: "idle" } as Check,
    checkTimer: undefined as ReturnType<typeof setTimeout> | undefined,
    checkRun: 0,
    serverErrors: {} as Errors,
    formError: null as string | null,
    busy: false,
    open: config.open === true,
    alive: true,
    root: null as HTMLElement | null,
    nameBad: false,
    nameMsg: "",
    slugBad: false,
    slugMsg: "",
    hint: config.labels.slugHelp ?? "",

    init(this: FormState) {
      this.root = this.$el;
      this.sync();
      scheduleCheck(this);
      // The dialog starts fresh each time it opens.
      this.$watch("open", (open: boolean) => {
        if (open) this.reset();
      });
    },
    destroy(this: FormState) {
      this.alive = false;
      clearTimeout(this.checkTimer);
    },
    skipCheck() {
      return false;
    },
    reset(this: FormState) {
      this.name = this.config.defaultName ?? "";
      this.slug = slugify(this.name);
      this.touched = false;
      this.attempted = false;
      this.serverErrors = {};
      this.formError = null;
      this.busy = false;
      scheduleCheck(this);
    },
    /** Works out the messages and flags the template shows. */
    sync(this: FormState) {
      const L = this.config.labels;
      const problem = this.config.showSlug === false ? null : slugProblem(this.slug);
      this.nameMsg = this.serverErrors.name ?? (this.attempted && !this.name.trim() ? L.nameRequired! : "");
      this.slugMsg =
        this.serverErrors.slug ??
        (this.check.status === "taken" ? (this.check.message ?? L.slugTaken!) : problem && (this.touched || this.attempted) && (this.slug || this.attempted) ? L[`problem${problem}`]! : "");
      this.nameBad = this.nameMsg !== "";
      this.slugBad = this.slugMsg !== "";
      this.hint = this.check.status === "checking" ? L.slugChecking! : this.check.status === "available" ? L.slugAvailable! : this.check.status === "error" ? L.slugCheckFailed! : L.slugHelp!;
    },
    onName(this: FormState, value: string) {
      this.name = value;
      if (!this.touched) {
        this.slug = slugify(value);
        scheduleCheck(this);
      }
      this.serverErrors = { ...this.serverErrors, name: undefined };
      this.sync();
    },
    onSlug(this: FormState, value: string) {
      this.touched = true;
      this.slug = value.toLowerCase();
      this.serverErrors = { ...this.serverErrors, slug: undefined };
      scheduleCheck(this);
    },
    cancel(this: FormState) {
      this.root!.dispatchEvent(new CustomEvent("cancel", { bubbles: true }));
      this.open = false;
    },
    async submit(this: FormState) {
      this.attempted = true;
      this.formError = null;
      this.sync();
      const problem = this.config.showSlug === false ? null : slugProblem(this.slug);
      if (!this.name.trim() || problem || this.check.status === "taken" || this.check.status === "checking" || this.busy) return;
      this.busy = true;
      try {
        const result = await ask(this.root!, "create", { values: { name: this.name.trim(), slug: this.slug } });
        if (!this.alive) return;
        if (result && typeof result === "object" && (result.error || result.fieldErrors)) {
          this.serverErrors = result.fieldErrors ?? {};
          this.formError = result.error ?? null;
        } else this.open = false;
      } catch {
        if (this.alive) this.formError = this.config.labels.failed!;
      } finally {
        if (this.alive) {
          this.busy = false;
          this.sync();
        }
      }
    },
  }));

  /* ---------------------------------------------------------------- settings */
  interface SettingsState extends CheckHost {
    name: string;
    saved: { name: string; slug: string };
    saving: boolean;
    notice: { tone: "success" | "danger"; text: string } | null;
    errors: Errors;
    nameBad: boolean;
    nameMsg: string;
    slugBad: boolean;
    slugMsg: string;
    hint: string;
    leaveOpen: boolean;
    leaving: boolean;
    leaveError: string | null;
    dirty(): boolean;
    problem(): string | null;
    cannotSave(): boolean;
  }

  Alpine.data("nqWorkspaceSettings", (config: { name: string; slug: string; hasCheck?: boolean; labels: Labels }) => ({
    config,
    name: config.name,
    slug: config.slug,
    saved: { name: config.name, slug: config.slug },
    saving: false,
    notice: null as { tone: "success" | "danger"; text: string } | null,
    errors: {} as Errors,
    check: { status: "idle" } as Check,
    checkTimer: undefined as ReturnType<typeof setTimeout> | undefined,
    checkRun: 0,
    alive: true,
    root: null as HTMLElement | null,
    nameBad: false,
    nameMsg: "",
    slugBad: false,
    slugMsg: "",
    hint: config.labels.slugHelp ?? "",
    leaveOpen: false,
    leaving: false,
    leaveError: null as string | null,

    init(this: SettingsState) {
      this.root = this.$el;
      this.sync();
    },
    destroy(this: SettingsState) {
      this.alive = false;
      clearTimeout(this.checkTimer);
    },
    skipCheck(this: SettingsState) {
      return this.slug === this.saved.slug;
    },
    dirty(this: SettingsState) {
      return this.name.trim() !== this.saved.name || this.slug !== this.saved.slug;
    },
    problem(this: SettingsState) {
      return slugProblem(this.slug);
    },
    sync(this: SettingsState) {
      const L = this.config.labels;
      const problem = slugProblem(this.slug);
      const dirty = this.dirty();
      const nameErr = this.errors.name ?? (!this.name.trim() ? L.nameRequired! : "");
      const slugErr = this.errors.slug ?? (this.check.status === "taken" ? (this.check.message ?? L.slugTaken!) : problem ? L[`problem${problem}`]! : "");
      this.nameMsg = nameErr;
      this.nameBad = nameErr !== "" && dirty;
      this.slugMsg = slugErr;
      this.slugBad = slugErr !== "" && (dirty || !!this.errors.slug);
      this.hint = this.check.status === "checking" ? L.slugChecking! : this.check.status === "available" ? L.slugAvailable! : L.slugHelp!;
    },
    cannotSave(this: SettingsState) {
      const L = this.config.labels;
      const nameErr = this.errors.name ?? (!this.name.trim() ? L.nameRequired : "");
      const slugErr = this.errors.slug ?? (this.check.status === "taken" ? "x" : this.problem() ? "x" : "");
      return !this.dirty() || !!nameErr || !!slugErr || this.check.status === "checking" || this.saving;
    },
    onName(this: SettingsState, value: string) {
      this.name = value;
      this.errors = { ...this.errors, name: undefined };
      this.notice = null;
      this.sync();
    },
    onSlug(this: SettingsState, value: string) {
      this.slug = value.toLowerCase();
      this.errors = { ...this.errors, slug: undefined };
      this.notice = null;
      scheduleCheck(this);
    },
    async save(this: SettingsState) {
      if (this.cannotSave()) return;
      this.saving = true;
      this.notice = null;
      try {
        const values = { name: this.name.trim(), slug: this.slug };
        const result = await ask(this.root!, "rename", { values });
        if (!this.alive) return;
        if (result && typeof result === "object" && (result.error || result.fieldErrors)) {
          this.errors = result.fieldErrors ?? {};
          if (result.error) this.notice = { tone: "danger", text: result.error };
        } else {
          this.errors = {};
          this.saved = values;
          this.check = { status: "idle" };
          this.notice = { tone: "success", text: this.config.labels.saved! };
        }
      } catch {
        if (this.alive) this.notice = { tone: "danger", text: this.config.labels.failed! };
      } finally {
        if (this.alive) {
          this.saving = false;
          this.sync();
        }
      }
    },
    async leave(this: SettingsState) {
      if (this.leaving) return;
      this.leaving = true;
      this.leaveError = null;
      try {
        const result = await ask(this.root!, "leave", {});
        if (!this.alive) return;
        if (result && typeof result === "object" && result.error) this.leaveError = result.error;
        else this.leaveOpen = false;
      } catch {
        if (this.alive) this.leaveError = this.config.labels.failed!;
      } finally {
        if (this.alive) this.leaving = false;
      }
    },
    /** The danger zone's nq-account-delete: hand the host's promise to it. */
    onDelete(this: SettingsState, event: CustomEvent<{ waitUntil: (p: Promise<unknown>) => void }>) {
      const failed = this.config.labels.deleteFailed!;
      event.detail.waitUntil(
        (async () => {
          try {
            return await ask(this.root!, "delete", {});
          } catch {
            throw new Error(failed);
          }
        })(),
      );
    },
  }));

  /* ---------------------------------------------------------------- list */
  Alpine.data("nqWorkspaceList", (config: { workspaces: Record<string, { id: string; name: string }> }) => ({
    config,
    opening: null as string | null,
    root: null as HTMLElement | null,
    init(this: Magics & { root: HTMLElement | null }) {
      this.root = this.$el;
    },
    isOpening(this: { opening: string | null }, id: string) {
      return this.opening === id;
    },
    create(this: { root: HTMLElement | null }) {
      this.root!.dispatchEvent(new CustomEvent("create", { bubbles: true }));
    },
    async open(this: { root: HTMLElement | null; config: typeof config; opening: string | null }, id: string) {
      const workspace = this.config.workspaces[id];
      if (!workspace || this.opening) return;
      this.opening = id;
      let pending: Promise<unknown> | undefined;
      this.root!.dispatchEvent(new CustomEvent("open", { bubbles: true, detail: { workspace, wait: (p: Promise<unknown>) => (pending = Promise.resolve(p)) } }));
      try {
        await pending;
      } catch {
        /* the host shows its own error */
      } finally {
        this.opening = null;
      }
    },
  }));
};
