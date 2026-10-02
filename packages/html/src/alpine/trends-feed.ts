// nqTrendsFeed and nqSourcesCatalogue: the actions of the trends feed and of the sources catalogue. The markup is the
// React TrendsFeed's and SourcesCatalogue's, rendered by <x-nq::trends-feed> and <x-nq::trends-feed.sources-catalogue>.
//
//   <section x-data="nqTrendsFeed({ topics: [{ id, state, extras }], tab: 'new', failed: { save: '…' } })"> … </section>
//
// They store nothing: every action fires a waitable event on the root and the host does the work.
//   nq-trend-action   { id, action: "save" | "review" | "dismiss" | "restore", waitUntil }   the buttons wait on it; a rejection shows an error on the topic
//   nq-trend-menu     { id, action }                                                         an item of a topic's extra actions
//   nq-trend-state    { state }                                                              the tab changed
//   nq-retry          {}                                                                     "Retry now" in the error state
//   nq-source-toggle  { id, enabled, waitUntil }                                             a rejection puts the switch back and shows an error
//   nq-source-retry   { id, waitUntil }
// e.g. x-on:nq-trend-action="$event.detail.waitUntil(fetch('/topics/' + $event.detail.id, { method: 'POST', body: JSON.stringify($event.detail) }))".
// Without a listener the action does nothing. After a change the host re-renders the lists.

import type { Magics, Register } from "./types";

interface TopicConfig {
  id: string;
  state: string;
  extras: string[];
}

interface FeedConfig {
  topics: TopicConfig[];
  tab: string;
  /** The error text per action ("Could not save. Try again."). */
  failed: Record<string, string>;
}

interface SourceConfig {
  id: string;
  enabled: boolean;
  url: string | null;
}

interface CatalogueConfig {
  sources: SourceConfig[];
  failed: string;
}

interface Waitable {
  root: HTMLElement | null;
  alive: boolean;
  $el: HTMLElement;
  ask(name: string, detail: Record<string, unknown>): { sent: boolean; pending: Promise<unknown> | undefined };
}

/** Dispatches a waitable event on the root; the pending promise is whatever a listener handed to waitUntil. */
function dispatch(root: HTMLElement, name: string, detail: Record<string, unknown>) {
  let pending: Promise<unknown> | undefined;
  const hold = (p: unknown) => {
    if (p && typeof (p as Promise<unknown>).then === "function") pending = Promise.resolve(p);
  };
  root.dispatchEvent(new CustomEvent(name, { bubbles: true, detail: { ...detail, waitUntil: hold, wait: hold } }));
  return pending;
}

/** Opens the context menu of the region around `from` as if context-clicked at its inline start (Shift+F10 / Menu key). */
function openMenuAt(from: HTMLElement) {
  const region = from.closest<HTMLElement>('[data-slot="context-menu-trigger"]');
  if (!region) return;
  const rect = region.getBoundingClientRect();
  const rtl = getComputedStyle(region).direction === "rtl";
  const x = rtl ? rect.right - 24 : rect.left + 24;
  const y = rect.top + rect.height / 2;
  region.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 2, view: window }));
}

interface FeedState extends Magics, Pick<Waitable, "root" | "alive"> {
  config: FeedConfig;
  tab: string;
  busy: Record<number, boolean>;
  failed: Record<number, string>;
}

interface CatalogueState extends Magics, Pick<Waitable, "root" | "alive"> {
  config: CatalogueConfig;
  enabled: boolean[];
  last: boolean[];
  busy: Record<number, boolean>;
  failed: Record<number, string>;
  changed(): Promise<void>;
  start(index: number): void;
  finish(index: number): void;
  send(index: number, name: string, extra: Record<string, unknown>, done: () => void): Promise<void>;
}

export const trendsFeed: Register = (Alpine) => {
  Alpine.data("nqTrendsFeed", (config: FeedConfig) => ({
    config,
    root: null as HTMLElement | null,
    alive: true,
    tab: config.tab,
    busy: {} as Record<number, boolean>,
    failed: {} as Record<number, string>,
    init(this: FeedState) {
      this.root = this.$el;
      this.$watch("tab", (value: string) => {
        (this.root ?? this.$el).dispatchEvent(new CustomEvent("nq-trend-state", { bubbles: true, detail: { state: value } }));
      });
    },
    destroy(this: FeedState) {
      this.alive = false;
    },
    isBusy(this: FeedState, index: number) {
      return !!this.busy[index];
    },
    /** One topic action by the topic's position: "save", "review", "dismiss" or "restore". */
    async act(this: FeedState, index: number, action: string) {
      const topic = this.config.topics[index];
      if (!topic || this.busy[index]) return;
      this.busy = { ...this.busy, [index]: true };
      const { [index]: _drop, ...rest } = this.failed;
      this.failed = rest;
      try {
        const pending = dispatch(this.root ?? this.$el, "nq-trend-action", { id: topic.id, action });
        if (pending) await pending;
      } catch {
        if (this.alive) this.failed = { ...this.failed, [index]: this.config.failed[action] ?? "" };
      } finally {
        if (this.alive) {
          const { [index]: _done, ...left } = this.busy;
          this.busy = left;
        }
      }
    },
    /** An extra menu item by its position in the topic's extraActions. */
    extra(this: FeedState, index: number, at: number) {
      const topic = this.config.topics[index];
      const id = topic?.extras[at];
      if (topic && id !== undefined) dispatch(this.root ?? this.$el, "nq-trend-menu", { id: topic.id, action: id });
    },
    menuAt(this: FeedState, from: HTMLElement) {
      openMenuAt(from);
    },
    retry(this: FeedState) {
      dispatch(this.root ?? this.$el, "nq-retry", {});
    },
  }));

  Alpine.data("nqSourcesCatalogue", (config: CatalogueConfig) => ({
    config,
    root: null as HTMLElement | null,
    alive: true,
    enabled: config.sources.map((s) => s.enabled),
    last: config.sources.map((s) => s.enabled),
    busy: {} as Record<number, boolean>,
    failed: {} as Record<number, string>,
    init(this: CatalogueState) {
      this.root = this.$el;
      // The switches are x-modelable, so watching `enabled` sees every click.
      this.$watch("enabled", () => void this.changed());
    },
    destroy(this: CatalogueState) {
      this.alive = false;
    },
    isBusy(this: CatalogueState, index: number) {
      return !!this.busy[index];
    },
    start(this: CatalogueState, index: number) {
      this.busy = { ...this.busy, [index]: true };
      const { [index]: _drop, ...rest } = this.failed;
      this.failed = rest;
    },
    finish(this: CatalogueState, index: number) {
      if (!this.alive) return;
      const { [index]: _done, ...left } = this.busy;
      this.busy = left;
    },
    /** A switch moved: ask the host, and put it back when the host says no. */
    async changed(this: CatalogueState) {
      const index = this.enabled.findIndex((on, i) => !!on !== !!this.last[i]);
      if (index < 0) return;
      const next = !!this.enabled[index];
      if (this.busy[index]) {
        this.enabled = this.enabled.map((on, i) => (i === index ? !!this.last[i] : on));
        return;
      }
      await this.send(index, "nq-source-toggle", { enabled: next }, () => {
        this.last = this.last.map((on, i) => (i === index ? next : on));
      });
    },
    /** The menu's Enable / Disable: moves the switch, which asks the host. */
    toggle(this: CatalogueState, index: number) {
      if (this.busy[index]) return;
      this.enabled = this.enabled.map((on, i) => (i === index ? !on : on));
    },
    retry(this: CatalogueState, index: number) {
      if (this.busy[index]) return;
      void this.send(index, "nq-source-retry", {}, () => undefined);
    },
    visit(this: CatalogueState, index: number) {
      const url = this.config.sources[index]?.url;
      if (url) window.open(url, "_blank", "noreferrer");
    },
    menuAt(this: CatalogueState, from: HTMLElement) {
      openMenuAt(from);
    },
    async send(this: CatalogueState, index: number, name: string, extra: Record<string, unknown>, done: () => void) {
      const source = this.config.sources[index];
      if (!source) return;
      this.start(index);
      try {
        const pending = dispatch(this.root ?? this.$el, name, { id: source.id, ...extra });
        if (!pending) {
          // Nobody is listening: the switch goes back.
          this.enabled = this.enabled.map((on, i) => (i === index ? !!this.last[i] : on));
          return;
        }
        await pending;
        done();
      } catch {
        if (this.alive) {
          this.failed = { ...this.failed, [index]: this.config.failed };
          this.enabled = this.enabled.map((on, i) => (i === index ? !!this.last[i] : on));
        }
      } finally {
        this.finish(index);
      }
    },
  }));
};
