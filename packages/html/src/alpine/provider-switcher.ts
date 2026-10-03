// nqProviderSwitcher: the state behind a list of swappable capabilities, each with a select (the Nasaq Select) to switch its backend.
// The markup is the React ProviderSwitcher's (see the Blade component); each row's select is x-model-bound to rows[capability].active.
//
//   <div x-data="nqProviderSwitcher({ data: { active: 'postgres', isDefault: true } })" @select="save($event.detail)">
//     <li :aria-busy="busy === 'data' ? 'true' : undefined"> <div x-data="nqSelect('postgres')" x-model="rows['data'].active"> … </div> </li>
//   </div>
//
// Picking a backend dispatches a bubbling "select" event with { capability, backend, wait(promise) }. Pass a promise to
// detail.wait() and the row stays busy until it settles; if it rejects the previous backend is put back. A switched row
// that had an isDefault flag becomes "overridden" (isDefault false).

import type { Magics, Register } from "./types";

interface Row {
  active: string;
  isDefault: boolean | null;
}

interface SwitcherState extends Magics {
  rows: Record<string, Row>;
  busy: string | null;
  committed: Record<string, string>;
  change(capability: string, backend: string): Promise<void>;
}

export const providerSwitcher: Register = (Alpine) => {
  Alpine.data("nqProviderSwitcher", (initial: Record<string, Partial<Row>> = {}) => ({
    rows: Object.fromEntries(Object.entries(initial).map(([k, v]) => [k, { active: String(v.active ?? ""), isDefault: v.isDefault ?? null }])) as Record<string, Row>,
    busy: null as string | null,
    committed: Object.fromEntries(Object.entries(initial).map(([k, v]) => [k, String(v.active ?? "")])) as Record<string, string>,
    init(this: SwitcherState) {
      this.$watch("rows", () => {
        if (this.busy !== null) return;
        for (const [capability, row] of Object.entries(this.rows)) {
          if (row.active !== this.committed[capability]) {
            void this.change(capability, row.active);
            return;
          }
        }
      });
    },
    async change(this: SwitcherState, capability: string, backend: string) {
      const previous = this.committed[capability] as string;
      const waits: Promise<unknown>[] = [];
      this.busy = capability;
      try {
        this.$dispatch("select", { capability, backend, wait: (p: Promise<unknown>) => void waits.push(Promise.resolve(p)) });
        await Promise.all(waits);
        this.committed[capability] = backend;
        const row = this.rows[capability];
        if (row && row.isDefault !== null) row.isDefault = false;
      } catch {
        const row = this.rows[capability];
        if (row) row.active = previous;
      } finally {
        this.busy = null;
      }
    },
  }));
};
