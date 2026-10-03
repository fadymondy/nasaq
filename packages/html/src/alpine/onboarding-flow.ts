// nqOnboardingFlow: the flow after sign-up (welcome, profile, workspace, invites, preferences, an integration, a review). The markup is the
// Blade onboarding-flow component, which wraps <x-nq::setup-wizard>; this keeps the values, the saved progress and the checks.
//
//   <div data-slot="onboarding-flow" x-data="nqOnboardingFlow({ steps: ['welcome', 'profile', …], optional: ['invite', …], storageKey: 'onboarding:u1', userName: 'Sara', defaults: {…}, labels: {…} })"
//        x-on:nq-onboarding-save="$event.detail.waitUntil(save($event.detail.stepId, $event.detail.values))"
//        x-on:nq-onboarding-connect="$event.detail.waitUntil(connect($event.detail.integrationId))"
//        x-on:nq-onboarding-finish="$event.detail.waitUntil(finish($event.detail.values))">
//
// Events, all bubbling from the root, each with detail.waitUntil(promise); resolve { error } to keep the person on the step:
//   nq-onboarding-save { stepId: profile | workspace | invite | preferences, values }   leaving one of those steps forward
//   nq-onboarding-connect { integrationId }                                              the Connect button of an integration
//   nq-onboarding-finish { values }                                                      the last step's Finish
// Progress (`current`, `completed`, `skipped`) is kept in localStorage under `storageKey` and resumed after a reload; `nq-onboarding-progress`
// fires with it on every change. The avatar goes through the avatar-upload events (nq-avatar-change): resolve the hosted URL.

import { initialProgress, markCompleted, markSkipped, parseInviteEmails, parseProgress, serializeProgress, type OnboardingProgress } from "./onboarding-flow-logic";
import type { AlpineLike, Magics, Register } from "./types";

interface Values {
  profile: { name: string; role: string; avatar?: string | null };
  workspace: { mode: "create" | "join"; name: string; code: string };
  invite: { emails: string[]; role: string };
  preferences: { locale: string; theme: string; notifications: { email: boolean; push: boolean; digest: boolean } };
  connected: string[];
}
interface Config {
  steps?: string[];
  optional?: string[];
  review?: string[];
  storageKey?: string | null;
  userName?: string | null;
  defaults?: Partial<Values>;
  labels?: Record<string, string>;
}
interface Failure {
  error?: string;
}
interface Wizard {
  index: number;
  setCompleted(ids: string[] | null): void;
}
interface FlowState extends Magics {
  $store: { nq?: { locale?: string; theme?: string; setLocale(l: string): void; setTheme(t: string): void } };
  steps: string[];
  optional: string[];
  review: string[];
  storageKey: string | null;
  userName: string;
  base: Values;
  obL: Record<string, string>;
  vals: Values;
  prog: OnboardingProgress<Values>;
  inv: Record<string, boolean>;
  errs: Record<string, string>;
  resumed: boolean;
  connecting: string | null;
  connectError: string;
  obLoc: string[];
  obTheme: string[];
  loaded: boolean;
  root: HTMLElement | undefined;
  wizard(): Wizard | null;
  persist(): void;
  resume(): void;
  clearErrors(): void;
  obName(): string;
  obEmit(event: string, detail: Record<string, unknown>): unknown[];
  obSettle(waits: unknown[]): Promise<Failure | undefined>;
  obValidate(id: string): Record<string, string>;
}

const failure = (r: unknown): Failure | undefined => (r && typeof r === "object" && (r as Failure).error ? (r as Failure) : undefined);
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));

const blank = (userName: string, over: Partial<Values> = {}): Values => ({
  profile: { name: userName, role: "", ...over.profile },
  workspace: { mode: "create", name: "", code: "", ...over.workspace },
  invite: { emails: [], role: "member", ...over.invite },
  preferences: { locale: "en", theme: "system", ...over.preferences, notifications: { email: true, push: false, digest: true, ...over.preferences?.notifications } },
  connected: [...(over.connected ?? [])],
});

const SAVES: Record<string, keyof Values> = { profile: "profile", workspace: "workspace", invite: "invite", preferences: "preferences" };

export const onboardingFlow: Register = (Alpine) => {
  const A = Alpine as AlpineLike & { $data(el: Element): unknown };
  Alpine.data("nqOnboardingFlow", (config: Config = {}) => {
    const steps = config.steps ?? ["welcome", "profile", "workspace", "invite", "preferences", "integration", "finish"];
    const base = blank(config.userName ?? "", config.defaults);
    return {
      steps,
      optional: config.optional ?? ["invite", "preferences", "integration"],
      review: config.review ?? steps.filter((s) => s !== "welcome" && s !== "finish"),
      storageKey: config.storageKey ?? null,
      userName: config.userName ?? "",
      base,
      obL: config.labels ?? {},
      vals: clone(base),
      prog: initialProgress<Values>(steps[0] ?? "welcome", clone(base)),
      inv: { name: false, workspaceName: false, code: false } as Record<string, boolean>,
      errs: { name: "", workspaceName: "", code: "" } as Record<string, string>,
      resumed: false,
      connecting: null as string | null,
      connectError: "",
      obLoc: [base.preferences.locale],
      obTheme: [base.preferences.theme],
      loaded: false,
      root: undefined as HTMLElement | undefined,
      init(this: FlowState) {
        this.root = this.$el;
        const nq = this.$store.nq;
        if (nq?.theme && !config.defaults?.preferences?.theme) this.vals.preferences.theme = this.obTheme[0] = nq.theme;
        this.resume();
        this.$nextTick(() => {
          const w = this.wizard();
          if (w) {
            w.index = Math.max(0, this.steps.indexOf(this.prog.current));
            w.setCompleted([...this.prog.completed]);
          }
          this.loaded = true;
        });
        this.$watch("prog", () => {
          this.persist();
          this.root?.dispatchEvent(new CustomEvent("nq-onboarding-progress", { bubbles: true, detail: clone(this.prog) }));
        });
        this.$watch("vals", () => this.persist());
        this.$watch("prog.completed", (ids: string[]) => this.wizard()?.setCompleted([...ids]));
        this.$watch("obLoc", (next: string[]) => {
          const loc = next[0];
          if (!loc) {
            this.obLoc = [this.vals.preferences.locale];
            return;
          }
          if (loc === this.vals.preferences.locale) return;
          this.vals.preferences.locale = loc;
          this.$store.nq?.setLocale(loc);
        });
        this.$watch("obTheme", (next: string[]) => {
          const theme = next[0];
          if (!theme) {
            this.obTheme = [this.vals.preferences.theme];
            return;
          }
          if (theme === this.vals.preferences.theme) return;
          this.vals.preferences.theme = theme;
          this.$store.nq?.setTheme(theme);
        });
      },
      wizard(this: FlowState) {
        const el = this.root?.querySelector('[data-slot="setup-wizard"]');
        return el ? (A.$data(el) as Wizard) : null;
      },
      /** Reads saved progress after mount. */
      resume(this: FlowState) {
        if (!this.storageKey) return;
        try {
          const saved = parseProgress<Values>(window.localStorage.getItem(this.storageKey), this.steps);
          if (!saved) return;
          this.prog = { ...saved, values: clone(this.vals) };
          this.vals = blank(this.userName, { ...this.base, ...saved.values });
          this.obLoc = [this.vals.preferences.locale];
          this.obTheme = [this.vals.preferences.theme];
          this.resumed = saved.current !== "welcome" || saved.completed.length > 0;
        } catch {
          /* storage blocked: progress just lives in memory */
        }
      },
      persist(this: FlowState) {
        if (!this.storageKey || !this.loaded) return;
        try {
          window.localStorage.setItem(this.storageKey, serializeProgress({ ...clone(this.prog), values: clone(this.vals) }));
        } catch {
          /* ignore */
        }
      },
      startOver(this: FlowState) {
        this.vals = clone(this.base);
        this.prog = initialProgress<Values>(this.steps[0] ?? "welcome", clone(this.base));
        this.obLoc = [this.vals.preferences.locale];
        this.obTheme = [this.vals.preferences.theme];
        this.resumed = false;
        this.clearErrors();
        const w = this.wizard();
        if (w) {
          w.index = 0;
          w.setCompleted([]);
        }
        if (this.storageKey) {
          try {
            window.localStorage.removeItem(this.storageKey);
          } catch {
            /* ignore */
          }
        }
      },
      clearErrors(this: FlowState) {
        for (const k of Object.keys(this.inv)) {
          this.inv[k] = false;
          this.errs[k] = "";
        }
      },
      obName(this: FlowState) {
        return this.vals.profile.name || this.userName;
      },
      obHeading(this: FlowState) {
        const name = this.obName();
        return name ? fill(this.obL.welcomeHeading ?? "", { name }) : (this.obL.welcomeHeadingAnon ?? "");
      },
      obValidate(this: FlowState, id: string) {
        const e: Record<string, string> = {};
        if (id === "profile" && !this.vals.profile.name.trim()) e.name = this.obL.nameRequired ?? "";
        if (id === "workspace") {
          if (this.vals.workspace.mode === "create" && !this.vals.workspace.name.trim()) e.workspaceName = this.obL.workspaceNameRequired ?? "";
          if (this.vals.workspace.mode === "join" && !this.vals.workspace.code.trim()) e.code = this.obL.inviteCodeRequired ?? "";
        }
        return e;
      },
      obEmit(this: FlowState, event: string, detail: Record<string, unknown>) {
        const waits: unknown[] = [];
        (this.root ?? this.$el).dispatchEvent(new CustomEvent(event, { bubbles: true, detail: { ...detail, waitUntil: (p: unknown) => void waits.push(p) } }));
        return waits;
      },
      async obSettle(waits: unknown[]) {
        const results = await Promise.all(waits);
        return results.map(failure).find(Boolean);
      },
      /** The setup wizard asks before leaving a step forward. */
      async obComplete(this: FlowState, id: string) {
        const found = this.obValidate(id);
        this.clearErrors();
        for (const [k, message] of Object.entries(found)) {
          this.inv[k] = true;
          this.errs[k] = message;
        }
        if (Object.keys(found).length > 0) return { error: Object.values(found).join(" ") };
        const key = SAVES[id];
        if (key) {
          const result = await this.obSettle(this.obEmit("nq-onboarding-save", { stepId: id, values: clone(this.vals[key]) }));
          if (result) return result;
        }
        this.prog = markCompleted(this.prog, id);
        return undefined;
      },
      /** After any move: leaving an optional step forward without saving it is a skip. */
      obStep(this: FlowState, detail: { stepId?: string }) {
        const to = detail.stepId ?? "";
        const from = this.prog.current;
        this.clearErrors();
        let next = this.prog;
        if (this.steps.indexOf(to) > this.steps.indexOf(from) && this.optional.includes(from)) next = markSkipped(next, from);
        this.prog = next.current === to ? next : { ...next, current: to, updatedAt: Date.now() };
      },
      async obFinish(this: FlowState) {
        const result = await this.obSettle(this.obEmit("nq-onboarding-finish", { values: clone(this.vals) }));
        if (!result && this.storageKey) {
          try {
            window.localStorage.removeItem(this.storageKey);
          } catch {
            /* ignore */
          }
        }
        return result;
      },
      // Profile
      async obAvatar(this: FlowState, detail: { file: File; promise?: unknown; waitUntil?: unknown }) {
        const waits = this.obEmit("nq-onboarding-avatar", { file: detail.file });
        const results = await Promise.all(waits);
        const failed = results.map(failure).find(Boolean);
        if (failed) throw new Error(failed.error);
        const hosted = results.find((r) => typeof r === "string") as string | undefined;
        this.vals.profile.avatar = hosted || URL.createObjectURL(detail.file);
      },
      async obRemoveAvatar(this: FlowState) {
        this.vals.profile.avatar = null;
      },
      // Invite
      obEmail(this: FlowState, tag: string, tags: readonly string[]) {
        const p = parseInviteEmails(tag, tags);
        if (p.invalid.length > 0) return fill(this.obL.invalidEmail ?? "", { email: p.invalid[0] ?? tag });
        if (p.duplicates.length > 0) return fill(this.obL.duplicateEmail ?? "", { email: p.duplicates[0] ?? tag });
        return true;
      },
      obInvites(this: FlowState) {
        return fill(this.obL.invitesCount ?? "", { count: this.vals.invite.emails.length });
      },
      // Integration
      async obConnect(this: FlowState, id: string) {
        this.connecting = id;
        this.connectError = "";
        try {
          const result = await this.obSettle(this.obEmit("nq-onboarding-connect", { integrationId: id }));
          if (result?.error) this.connectError = result.error;
          else if (!this.vals.connected.includes(id)) this.vals.connected = [...this.vals.connected, id];
        } catch {
          this.connectError = this.obL.connectFailed ?? "";
        } finally {
          this.connecting = null;
        }
      },
      obConnected(this: FlowState, id: string) {
        return this.vals.connected.includes(id);
      },
      // Finish
      obStatus(this: FlowState, id: string) {
        return this.prog.completed.includes(id) ? "done" : this.prog.skipped.includes(id) ? "skipped" : "open";
      },
      obSkippedAny(this: FlowState) {
        return this.review.some((id) => !this.prog.completed.includes(id));
      },
    };
  });
};
