// nqAnalyticsPage: the actions of the analytics page frame (refresh, disconnect, retry). The markup is the React
// AnalyticsPageFrame's, rendered by <x-nq::analytics-connect.page-frame>; the state lives here.
//
//   <div x-data="nqAnalyticsPage({ id: 'ga', refreshing: false })" x-on:nq-refresh="$event.detail.wait(reload())"> … </div>
//
// It stores nothing: every action fires a waitable event on the root and the host does the work.
//   nq-refresh     {}          the Refresh button shows a spinner until the promise settles
//   nq-retry       {}          the error state's "Try again"
//   nq-disconnect  { id }      after the confirm dialog; the host re-renders the page as the connect screen
// Handlers receive detail.wait(promise) (also detail.waitUntil). Without a listener the action does nothing.

import type { Magics, Register } from "./types";

interface Config {
  id: string;
  refreshing: boolean;
}

interface PageState extends Magics {
  root: HTMLElement | null;
  id: string;
  refreshing: boolean;
  alive: boolean;
  ask(name: string, detail: Record<string, unknown>): Promise<unknown>;
}

export const analyticsConnect: Register = (Alpine) => {
  Alpine.data("nqAnalyticsPage", (config: Config) => ({
    root: null as HTMLElement | null,
    id: config.id,
    refreshing: Boolean(config.refreshing),
    alive: true,
    init(this: PageState) {
      this.root = this.$el;
    },
    destroy(this: PageState) {
      this.alive = false;
    },
    async ask(this: PageState, name: string, detail: Record<string, unknown>): Promise<unknown> {
      let pending: Promise<unknown> | undefined;
      const wait = (p: unknown) => {
        if (p && typeof (p as Promise<unknown>).then === "function") pending = p as Promise<unknown>;
      };
      (this.root ?? this.$el).dispatchEvent(new CustomEvent(name, { bubbles: true, detail: { ...detail, wait, waitUntil: wait } }));
      try {
        return await pending;
      } catch {
        return undefined;
      }
    },
    async refresh(this: PageState) {
      if (this.refreshing) return;
      this.refreshing = true;
      try {
        await this.ask("nq-refresh", {});
      } finally {
        if (this.alive) this.refreshing = false;
      }
    },
    retry(this: PageState) {
      void this.ask("nq-retry", {});
    },
    disconnect(this: PageState) {
      void this.ask("nq-disconnect", { id: this.id });
    },
  }));
};
