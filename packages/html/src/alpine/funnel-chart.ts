// nqFunnelList: the rows, the create button and the row menu of the saved-funnels card (<x-nq::funnel-chart.list>).
// The funnel chart itself is static markup and needs no module.
//
//   <div x-data="nqFunnelList({ rows: [...], labels: { failed } })"
//        @open="…" @create="…" @edit="…" @duplicate="$event.detail.wait(…)" @delete="$event.detail.wait(…)"> … </div>
//
// It is presentational: the host does the work. Events fire on the root:
//   open, edit   { id }            nothing to wait for
//   create       {}                nothing to wait for
//   duplicate    { id, wait }      resolve, or resolve { error } (shown above the table)
//   delete       { id, wait }      resolve, or resolve { error }; on success the row goes
// A rejected promise, or nobody listening, shows the generic error.

import type { Magics, Register } from "./types";

interface FunnelRow {
  id: string;
  [key: string]: unknown;
}

interface FunnelListConfig {
  rows: FunnelRow[];
  labels: { failed: string };
}

type Outcome = { error?: string } | void | undefined;

interface FunnelListState extends Magics {
  config: FunnelListConfig;
  tableRows: FunnelRow[];
  notice: string | null;
  alive: boolean;
  root: HTMLElement | null;
  ask(name: string, detail: Record<string, unknown>): Promise<Outcome>;
  fire(name: string, detail: Record<string, unknown>): void;
  run(name: string, id: string, onOk: () => void): Promise<void>;
}

export const funnelChart: Register = (Alpine) => {
  Alpine.data("nqFunnelList", (config: FunnelListConfig) => ({
    config,
    tableRows: config.rows.map((r) => ({ ...r })),
    notice: null as string | null,
    alive: true,
    root: null as HTMLElement | null,
    init(this: FunnelListState) {
      this.root = this.$el;
    },
    destroy(this: FunnelListState) {
      this.alive = false;
    },
    /** Fire an event on the root and wait for the promise the host hands to `wait`. */
    async ask(this: FunnelListState, name: string, detail: Record<string, unknown>): Promise<Outcome> {
      let pending: Promise<Outcome> | undefined;
      const event = new CustomEvent(name, { bubbles: true, detail: { ...detail, wait: (p: Promise<Outcome>) => (pending = Promise.resolve(p)) } });
      (this.root ?? this.$el).dispatchEvent(event);
      if (!pending) throw new Error("no listener");
      return pending;
    },
    async run(this: FunnelListState, name: string, id: string, onOk: () => void) {
      this.notice = null;
      try {
        const result = await this.ask(name, { id });
        if (!this.alive) return;
        if (result && result.error !== undefined) this.notice = result.error;
        else onOk();
      } catch {
        if (this.alive) this.notice = this.config.labels.failed;
      }
    },
    fire(this: FunnelListState, name: string, detail: Record<string, unknown>) {
      (this.root ?? this.$el).dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
    },
    onRow(this: FunnelListState, event: CustomEvent<{ row: FunnelRow }>) {
      this.fire("open", { id: event.detail.row.id });
    },
    onAction(this: FunnelListState, event: CustomEvent<{ action: string; row: FunnelRow }>) {
      const { action, row } = event.detail;
      if (action === "edit") this.fire("edit", { id: row.id });
      else if (action === "duplicate") void this.run("duplicate", row.id, () => undefined);
      else if (action === "delete") void this.run("delete", row.id, () => (this.tableRows = this.tableRows.filter((r) => r.id !== row.id)));
    },
  }));
};
