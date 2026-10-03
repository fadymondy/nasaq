// nqAccessGrants: the workspace filter, the revoke confirm and the optimistic grants matrix of the React AccessGrants.
// The apps list and the matrix are server-rendered; the state lives here.
//
//   <div x-data="nqAccessGrants({ locale: 'en', apps: { a1: { name: 'Notion' } }, resources: ['docs'], cells: { 'g1:docs': 'read' }, labels: {…} })"> … </div>
//
// It is presentational: the host does the work. Each action fires an event on the root with detail `{ …, wait(promise) }`:
//   revoke        { appId, wait }                         resolve, or resolve { error }
//   change-grant  { agentId, resourceId, level, wait }    resolve, or resolve { error }; the cell goes back if it fails
// A rejected promise, or nobody listening, shows the generic error. After a revoke the host re-renders the page.
// The cells are `agentId:resourceId` keys; a select is bound with `x-model="cells[k]"` inside `x-data="{ k: '…' }"`.

import type { Magics, Register } from "./types";

type Level = "none" | "read" | "write";
type Outcome = void | { error?: string } | undefined;

interface AccessGrantsConfig {
  locale?: string;
  apps: Record<string, { name: string }>;
  /** Resource ids, the matrix columns. */
  resources: string[];
  /** Agent ids, the matrix rows. */
  agents: string[];
  /** `agentId:resourceId` to level. A missing cell is "none". */
  cells: Record<string, Level>;
  labels: Record<string, string>;
}

interface AccessGrantsState extends Magics {
  config: AccessGrantsConfig;
  root: HTMLElement | null;
  org: string;
  notice: { tone: "success" | "danger"; text: string } | null;
  noticeTimer: ReturnType<typeof setTimeout> | undefined;
  cells: Record<string, Level>;
  saved: Record<string, Level>;
  pending: Record<string, boolean>;
  revokeOpen: boolean;
  revoking: string | null;
  busy: boolean;
  alive: boolean;
  say(tone: "success" | "danger", text: string): void;
  ask(name: string, detail: Record<string, unknown>): Promise<Outcome>;
  fill(template: string, values: Record<string, string>): string;
  num(value: number): string;
  commit(key: string): Promise<void>;
}

export const accessGrants: Register = (Alpine) => {
  Alpine.data("nqAccessGrants", (config: AccessGrantsConfig) => ({
    config,
    root: null as HTMLElement | null,
    org: "all",
    notice: null as { tone: "success" | "danger"; text: string } | null,
    noticeTimer: undefined as ReturnType<typeof setTimeout> | undefined,
    cells: { ...config.cells } as Record<string, Level>,
    saved: { ...config.cells } as Record<string, Level>,
    pending: {} as Record<string, boolean>,
    revokeOpen: false,
    revoking: null as string | null,
    busy: false,
    alive: true,
    init(this: AccessGrantsState) {
      this.root = this.$el;
      this.$watch("cells", () => {
        for (const key of Object.keys(this.cells)) if (this.cells[key] !== this.saved[key] && !this.pending[key]) void this.commit(key);
      });
    },
    destroy(this: AccessGrantsState) {
      this.alive = false;
      clearTimeout(this.noticeTimer);
    },
    num(this: AccessGrantsState, value: number) {
      return new Intl.NumberFormat(`${this.config.locale ?? "en"}-u-nu-latn`).format(value);
    },
    fill(template: string, values: Record<string, string>) {
      return Object.entries(values).reduce((out, [k, v]) => out.split(`{${k}}`).join(v), template);
    },
    say(this: AccessGrantsState, tone: "success" | "danger", text: string) {
      this.notice = { tone, text };
      clearTimeout(this.noticeTimer);
      this.noticeTimer = setTimeout(() => (this.notice = null), 6000);
    },
    async ask(this: AccessGrantsState, name: string, detail: Record<string, unknown>): Promise<Outcome> {
      let pending: Promise<Outcome> | undefined;
      const event = new CustomEvent(name, { bubbles: true, detail: { ...detail, wait: (p: Promise<Outcome>) => (pending = Promise.resolve(p)) } });
      (this.root ?? this.$el).dispatchEvent(event);
      if (!pending) throw new Error("no listener");
      return pending;
    },

    /** How many resources an agent can read at all, and how many it can change, as the summary line. */
    summary(this: AccessGrantsState, agentId: string) {
      let read = 0;
      let write = 0;
      for (const r of this.config.resources) {
        const level = this.cells[`${agentId}:${r}`] ?? "none";
        if (level !== "none") read += 1;
        if (level === "write") write += 1;
      }
      return this.fill(this.config.labels.summary!, { r: this.num(read), w: this.num(write) });
    },
    /** Does an element tagged with an org id show under the current filter? */
    inOrg(this: AccessGrantsState, orgId: string | undefined) {
      return this.org === "all" || this.org === orgId;
    },

    /* ---------------------------------------------------------------- revoke */
    askRevoke(this: AccessGrantsState, appId: string) {
      if (!this.config.apps[appId]) return;
      this.revoking = appId;
      this.revokeOpen = true;
    },
    get revokeTitle(): string {
      const self = this as unknown as AccessGrantsState;
      const app = self.revoking ? self.config.apps[self.revoking] : null;
      return app ? self.fill(self.config.labels.revokeTitle!, { name: app.name }) : "";
    },
    async runRevoke(this: AccessGrantsState) {
      const id = this.revoking;
      const app = id ? this.config.apps[id] : null;
      if (!id || !app || this.busy) return;
      this.busy = true;
      this.notice = null;
      let text: string | null = null;
      try {
        const r = await this.ask("revoke", { appId: id });
        if (r && typeof r === "object" && r.error) text = r.error;
      } catch {
        text = this.config.labels.revokeFailed!;
      }
      if (!this.alive) return;
      this.busy = false;
      this.revokeOpen = false;
      if (text === null) this.say("success", this.fill(this.config.labels.revoked!, { name: app.name }));
      else this.say("danger", text);
    },

    /* ---------------------------------------------------------------- matrix */
    /** Save one changed cell; put it back if the host fails. */
    async commit(this: AccessGrantsState, key: string) {
      const level = this.cells[key]!;
      const before = this.saved[key] ?? "none";
      const [agentId, resourceId] = key.split(":") as [string, string];
      this.pending[key] = true;
      this.notice = null;
      try {
        const r = await this.ask("change-grant", { agentId, resourceId, level });
        if (r && typeof r === "object" && r.error) throw new Error(r.error);
        this.saved[key] = level;
      } catch (e) {
        if (this.alive) {
          this.cells[key] = before;
          this.say("danger", e instanceof Error && e.message && e.message !== "no listener" ? e.message : this.config.labels.grantFailed!);
        }
      } finally {
        this.pending[key] = false;
      }
    },
  }));
};
