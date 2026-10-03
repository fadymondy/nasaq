// nqTrashBin: the trash of an app. The markup is the React TrashBin's (see the Blade component, built on x-nq::entity-list); the state lives here.
// There is no backend: restore, delete and empty dispatch a bubbling event and update the list at once. The event detail carries
// `fail(message)`: call it to put the items back and show the message.
//
//   <div data-slot="trash-bin" x-data="nqTrashBin([{ id: 'a', name: 'Budget' }], { strings: { … } })">…</div>
//
// Events: "trash-restore" { ids, fail }, "trash-delete" { ids, fail }, "trash-empty" { fail }, "trash-notify" { message }.
// State: entries (the rows; the entity list binds to them), confirmOpen, confirmKind ("delete" | "empty"), confirmIds, failure.
// Strings are templates with {n} and {name}; the Blade component fills them in English or Arabic.

import type { Magics, Register } from "./types";

type Row = { id: string; name?: string } & Record<string, unknown>;

export interface TrashBinOptions {
  strings?: Record<string, string>;
}

interface TrashState extends Magics {
  entries: Row[];
  strings: Record<string, string>;
  confirmOpen: boolean;
  confirmKind: "delete" | "empty";
  confirmIds: string[];
  failure: string | null;
  root: HTMLElement;
  fill(key: string, vars?: Record<string, string | number>): string;
  count(one: string, many: string, n: number): string;
  take(ids: string[]): Row[];
  run(event: string, ids: string[] | null, done: string): void;
}

export const trashBin: Register = (Alpine) => {
  Alpine.data("nqTrashBin", (items: Row[] = [], options: TrashBinOptions = {}) => ({
    entries: items,
    strings: options.strings ?? {},
    confirmOpen: false,
    confirmKind: "delete" as "delete" | "empty",
    confirmIds: [] as string[],
    failure: null as string | null,
    root: null as unknown as HTMLElement,
    init(this: TrashState) {
      this.root = this.$el;
    },
    fill(this: TrashState, key: string, vars: Record<string, string | number> = {}) {
      return Object.entries(vars).reduce((s, [k, v]) => s.split(`{${k}}`).join(String(v)), this.strings[key] ?? key);
    },
    count(this: TrashState, one: string, many: string, n: number) {
      return n === 1 ? this.fill(one) : this.fill(many, { n });
    },
    onAction(this: TrashState & { restore(ids: string[]): void; askDelete(ids: string[]): void }, detail: { action: string; row: Row }) {
      if (detail.action === "restore") this.restore([detail.row.id]);
      else if (detail.action === "delete") this.askDelete([detail.row.id]);
    },
    askDelete(this: TrashState, ids: string[]) {
      this.confirmKind = "delete";
      this.confirmIds = ids;
      this.confirmOpen = true;
    },
    askEmpty(this: TrashState) {
      this.confirmKind = "empty";
      this.confirmIds = [];
      this.confirmOpen = true;
    },
    dialogTitle(this: TrashState) {
      if (this.confirmKind === "empty") return this.fill("emptyDialogTitle");
      const only = this.confirmIds.length === 1 ? this.entries.find((r) => r.id === this.confirmIds[0]) : undefined;
      return only ? this.fill("deleteTitle", { name: String(only.name ?? "") }) : this.fill("deleteTitleMany", { n: this.confirmIds.length });
    },
    dialogBody(this: TrashState) {
      return this.confirmKind === "empty" ? this.count("emptyDialogBodyOne", "emptyDialogBodyMany", this.entries.length) : this.fill("deleteBody");
    },
    take(this: TrashState, ids: string[]) {
      const gone = this.entries.filter((r) => ids.includes(r.id));
      this.entries = this.entries.filter((r) => !ids.includes(r.id));
      return gone;
    },
    restore(this: TrashState, ids: string[]) {
      this.run("trash-restore", ids, this.count("restoredOne", "restoredMany", ids.length));
    },
    bulkRestore(this: TrashState & { restore(ids: string[]): void }, ids: string[]) {
      this.restore(ids);
    },
    confirmed(this: TrashState) {
      if (this.confirmKind === "empty") this.run("trash-empty", null, this.fill("trashEmptied"));
      else this.run("trash-delete", this.confirmIds, this.count("deletedOne", "deletedMany", this.confirmIds.length));
    },
    run(this: TrashState, event: string, ids: string[] | null, done: string) {
      const before = this.entries;
      this.failure = null;
      this.entries = ids ? before.filter((r) => !ids.includes(r.id)) : [];
      const fail = (message?: string) => {
        this.entries = before;
        this.failure = message || this.fill("error");
      };
      this.root.dispatchEvent(new CustomEvent(event, { bubbles: true, detail: { ids: ids ?? before.map((r) => r.id), fail } }));
      this.root.dispatchEvent(new CustomEvent("trash-notify", { bubbles: true, detail: { message: done } }));
    },
  }));
};
