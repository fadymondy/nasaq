// nqFeatureFlagList: the rows, the create button, the environment switches and the row menu of the flag-list card (<x-nq::feature-flags>).
//
//   <div x-data="nqFeatureFlagList({ rows: [...], envs: ['dev', 'prod'], labels: { failed, killed } })"
//        @toggle="$event.detail.wait(…)" @open="…" @create="…" @delete="$event.detail.wait(…)"> … </div>
//
// It is presentational: the host does the work. Events fire on the root:
//   toggle       { key, environment, enabled, wait }   resolve, or resolve { error }; until then the switch is pending, an error rolls it back
//   delete       { key, wait }                         resolve, or resolve { error } (shown above the table); on success the row goes
//   open         { key }                               nothing to wait for
//   create       {}                                    nothing to wait for
// The row menu's "Copy key" writes the key to the clipboard. A rejected promise, or nobody listening, shows the generic error.
// A killed flag's switches stay clickable (the table cannot disable one row's switch); flipping one fails with the "killed" message.

import type { Magics, Register } from "./types";

interface FlagRow {
  id: string;
  key: string;
  killed?: boolean;
  [key: string]: unknown;
}

interface FeatureFlagListConfig {
  rows: FlagRow[];
  /** The environment ids, in column order: column `env_<i>` is `envs[i]`. */
  envs: string[];
  labels: { failed: string; killed: string };
}

type Outcome = { error?: string } | void | undefined;

interface FeatureFlagListState extends Magics {
  config: FeatureFlagListConfig;
  tableRows: FlagRow[];
  notice: string | null;
  alive: boolean;
  root: HTMLElement | null;
  ask(name: string, detail: Record<string, unknown>): Promise<Outcome>;
  fire(name: string, detail: Record<string, unknown>): void;
}

export const featureFlags: Register = (Alpine) => {
  Alpine.data("nqFeatureFlagList", (config: FeatureFlagListConfig) => ({
    config,
    tableRows: config.rows.map((r) => ({ ...r })),
    notice: null as string | null,
    alive: true,
    root: null as HTMLElement | null,
    init(this: FeatureFlagListState) {
      this.root = this.$el;
    },
    destroy(this: FeatureFlagListState) {
      this.alive = false;
    },
    /** Fire an event on the root and wait for the promise the host hands to `wait`. */
    async ask(this: FeatureFlagListState, name: string, detail: Record<string, unknown>): Promise<Outcome> {
      let pending: Promise<Outcome> | undefined;
      const event = new CustomEvent(name, { bubbles: true, detail: { ...detail, wait: (p: Promise<Outcome>) => (pending = Promise.resolve(p)) } });
      (this.root ?? this.$el).dispatchEvent(event);
      if (!pending) throw new Error("no listener");
      return pending;
    },
    fire(this: FeatureFlagListState, name: string, detail: Record<string, unknown>) {
      (this.root ?? this.$el).dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
    },
    onRow(this: FeatureFlagListState, event: CustomEvent<{ row: FlagRow }>) {
      this.fire("open", { key: event.detail.row.key });
    },
    /** A switch flipped: hand the table a promise so it shows the cell pending and rolls back on an error. */
    onEdit(this: FeatureFlagListState, event: CustomEvent<{ row: FlagRow; column: string; value: unknown; promise?: Promise<unknown> }>) {
      const detail = event.detail;
      const environment = this.config.envs[Number(detail.column.replace(/^env_/, ""))];
      if (environment === undefined) return;
      if (detail.row.killed) {
        detail.promise = Promise.resolve({ error: this.config.labels.killed });
        return;
      }
      detail.promise = this.ask("toggle", { key: detail.row.key, environment, enabled: Boolean(detail.value) }).catch(() => ({ error: this.config.labels.failed }));
    },
    async onAction(this: FeatureFlagListState, event: CustomEvent<{ action: string; row: FlagRow }>) {
      const { action, row } = event.detail;
      if (action === "open") {
        this.fire("open", { key: row.key });
      } else if (action === "copy") {
        try {
          await navigator.clipboard?.writeText(row.key);
        } catch {
          /* clipboard blocked: nothing to do */
        }
      } else if (action === "delete") {
        this.notice = null;
        try {
          const result = await this.ask("delete", { key: row.key });
          if (!this.alive) return;
          if (result && result.error !== undefined) this.notice = result.error;
          else this.tableRows = this.tableRows.filter((r) => r.id !== row.id);
        } catch {
          if (this.alive) this.notice = this.config.labels.failed;
        }
      }
    },
  }));
};
