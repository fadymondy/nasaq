// nqGithubActivity: the filter box, and the Refresh / Deploy / Re-run actions of the GitHub activity card. The markup is the React GithubActivity's (see the Blade component).
//
//   <div x-data="nqGithubActivity({ search: { commits: ["…"], pulls, runs, deployments, activity }, runIds: ["r1"], genericError })"
//        @refresh="$event.detail.wait(…)" @deploy="$event.detail.wait(…)" @rerun="$event.detail.wait(…)"> … </div>
//
// `search` holds one lower-cased haystack per row of each list; the filter box (x-model="query") hides the rows that do not match.
// Events on the root, detail `{ …, wait(promise) }`; resolve, or resolve { error }:
//   refresh  {}      deploy  {}      rerun  { runId }

import type { Magics, Register } from "./types";

type Outcome = { error?: string } | void | undefined;
type Feed = "activity" | "commits" | "pulls" | "runs" | "deployments";

interface GithubState extends Magics {
  config: { search: Partial<Record<Feed, string[]>>; runIds: string[]; genericError: string };
  query: string;
  error: string | null;
  busy: string | null;
  rerunning: Record<string, boolean>;
  alive: boolean;
  root: HTMLElement | null;
  match(feed: Feed, i: number): boolean;
  filtered(): boolean;
  firstVisible(feed: Feed, i: number): boolean;
  show(feed: Feed, i: number): boolean;
  showActivity(i: number): boolean;
  any(feed: Feed): boolean;
  none(feed: Feed): boolean;
  isBusy(name: string): boolean;
  anyBusy(): boolean;
  isRerunning(i: number): boolean;
  ask(name: string, detail: Record<string, unknown>): Promise<Outcome>;
  act(name: "refresh" | "deploy"): Promise<void>;
  rerun(i: number): Promise<void>;
}

export const githubActivity: Register = (Alpine) => {
  Alpine.data("nqGithubActivity", (config: GithubState["config"]) => ({
    config,
    query: "",
    error: null as string | null,
    busy: null as string | null,
    rerunning: {} as Record<string, boolean>,
    alive: true,
    root: null as HTMLElement | null,
    init(this: GithubState) {
      this.root = this.$el;
    },
    destroy(this: GithubState) {
      this.alive = false;
    },
    /** Whether row i of a list matches the filter (an empty filter matches everything). */
    match(this: GithubState, feed: Feed, i: number) {
      const q = this.query.trim().toLowerCase();
      if (!q) return true;
      return (this.config.search[feed]?.[i] ?? "").includes(q);
    },
    /** A filter is typed (React's `filtered`): an empty list then reads "No matches". */
    filtered(this: GithubState) {
      return this.query.trim() !== "";
    },
    /** Row i is the first one still shown: it drops its top rule (the CSS `first:` rule follows the original order). */
    firstVisible(this: GithubState, feed: Feed, i: number) {
      if (!this.match(feed, i)) return false;
      for (let k = 0; k < i; k++) if (this.match(feed, k)) return false;
      return true;
    },
    show(this: GithubState, feed: Feed, i: number) {
      return this.match(feed, i);
    },
    showActivity(this: GithubState, i: number) {
      return this.match("activity", i);
    },
    any(this: GithubState, feed: Feed) {
      return (this.config.search[feed] ?? []).some((_, i) => this.match(feed, i));
    },
    none(this: GithubState, feed: Feed) {
      return !this.any(feed);
    },
    isBusy(this: GithubState, name: string) {
      return this.busy === name;
    },
    anyBusy(this: GithubState) {
      return this.busy !== null;
    },
    isRerunning(this: GithubState, i: number) {
      return !!this.rerunning[this.config.runIds[i] ?? ""];
    },
    async ask(this: GithubState, name: string, detail: Record<string, unknown>): Promise<Outcome> {
      let pending: Promise<Outcome> | undefined;
      const event = new CustomEvent(name, { bubbles: true, cancelable: true, detail: { ...detail, wait: (p: Promise<Outcome>) => (pending = Promise.resolve(p)) } });
      (this.root ?? this.$el).dispatchEvent(event);
      if (!pending) throw new Error("no listener");
      return pending;
    },
    async act(this: GithubState, name: "refresh" | "deploy") {
      if (this.busy) return;
      this.busy = name;
      this.error = null;
      try {
        const result = await this.ask(name, {});
        if (this.alive && result && result.error) this.error = result.error;
      } catch {
        if (this.alive) this.error = this.config.genericError;
      } finally {
        if (this.alive) this.busy = null;
      }
    },
    async rerun(this: GithubState, i: number) {
      const id = this.config.runIds[i];
      if (id === undefined || this.rerunning[id]) return;
      this.rerunning = { ...this.rerunning, [id]: true };
      this.error = null;
      try {
        const result = await this.ask("rerun", { runId: id });
        if (this.alive && result && result.error) this.error = result.error;
      } catch {
        if (this.alive) this.error = this.config.genericError;
      } finally {
        if (this.alive) this.rerunning = { ...this.rerunning, [id]: false };
      }
    },
  }));
};
