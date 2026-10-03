// nqIssueBoard: the filter, votes and drop remapping of x-nq::issue-board. Blade renders the toolbar and a kanban board
// (a nested nqKanbanBoard fed the visible cards); this module owns the issues, the search / assignee / reporter filter,
// and turns a drop among visible cards into an index among all of the column's issues.
//
//   <section data-slot="issue-board" x-data="nqIssueBoard({ cards: [...], columns: [...], text: {...} })">…</section>
//
// cards: [{ id, columnId, statusId, key, title, labelNames, assigneeId, reporterId, votes, voted, … }] in column order.
// Events (bubbling, from the root): "move" { cardId, toColumn, toIndex } (index among ALL the column's issues),
// "nq-open" { id }, "nq-vote" { id, voted }, "nq-create", "nq-filter-change" { query, assigneeId, reporterId }.

import { boardIndex, EMPTY_FILTER, filterIssues, isFilterActive, type BoardFilter, type BoardIssue } from "./issue-board-logic";
import type { Register } from "./types";

export interface IssueBoardCard extends BoardIssue {
  columnId: string;
  votes?: number | null;
  voted?: boolean;
  [extra: string]: unknown;
}

interface Config {
  cards: IssueBoardCard[];
  columns: { id: string; title: string }[];
  filter?: Partial<BoardFilter>;
  text?: { count?: string; countOf?: string };
}

interface Detail {
  cardId: string;
  toColumn: string;
  toIndex: number;
}

export const issueBoard: Register = (Alpine) => {
  Alpine.data("nqIssueBoard", (config: Config) => {
    // Kept outside the reactive state: Alpine would wrap an element in a proxy.
    let host: HTMLElement | null = null;
    const emit = (name: string, detail?: unknown) => host?.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
    return {
      // Named `issues`, not `cards`: the nested kanban scope has its own `cards`, and a getter here would read that one.
      issues: (config.cards ?? []).map((c) => ({ ...c, statusId: c.columnId })) as IssueBoardCard[],
      columns: config.columns ?? [],
      filter: { ...EMPTY_FILTER, ...config.filter } as BoardFilter,
      text: config.text ?? {},

      init(this: { $el: HTMLElement }) {
        host = this.$el;
      },

      /** The cards that pass the filter, in column order. */
      get visible(): IssueBoardCard[] {
        const self = this as unknown as { issues: IssueBoardCard[]; filter: BoardFilter };
        return filterIssues(self.issues, self.filter);
      },
      get active(): boolean {
        return isFilterActive((this as unknown as { filter: BoardFilter }).filter);
      },
      num(this: { $nq: { locale: string } }, n: number) {
        return new Intl.NumberFormat(`${this.$nq.locale}-u-nu-latn`).format(n);
      },
      /** "4 issues" or "1 of 4 issues". */
      countText(this: { visible: IssueBoardCard[]; issues: IssueBoardCard[]; text: Config["text"]; num(n: number): string }) {
        const shown = this.visible.length;
        const total = this.issues.length;
        if (shown === total) return (this.text?.count ?? "{total}").replace("{total}", this.num(total));
        return (this.text?.countOf ?? "{shown} of {total}").replace("{shown}", this.num(shown)).replace("{total}", this.num(total));
      },
      changed(this: { filter: BoardFilter }) {
        emit("nq-filter-change", { query: this.filter.query, assigneeId: this.filter.assigneeId, reporterId: this.filter.reporterId });
      },
      /** The select value: "" is everyone. */
      pick(this: { filter: BoardFilter; changed(): void }, which: "assigneeId" | "reporterId", value: string) {
        this.filter[which] = value === "" ? null : value;
        this.changed();
      },
      clear(this: { filter: BoardFilter; changed(): void }) {
        this.filter = { ...EMPTY_FILTER };
        this.changed();
      },
      searchKey(this: { filter: BoardFilter; changed(): void }, e: KeyboardEvent) {
        if (e.key === "Escape" && this.filter.query) {
          e.preventDefault();
          this.filter.query = "";
          this.changed();
        }
      },

      /** A drop inside the nested kanban: remap among visible cards to the full column and report it. */
      onMove(this: { issues: IssueBoardCard[]; visible: IssueBoardCard[] }, e: CustomEvent<Detail>) {
        const { cardId, toColumn, toIndex } = e.detail;
        const ids = new Set(this.visible.map((c) => c.id));
        const index = boardIndex(this.issues, ids, cardId, toColumn, toIndex);
        const moved = this.issues.find((c) => c.id === cardId);
        if (!moved) return;
        const rest = this.issues.filter((c) => c.id !== cardId);
        const column = rest.filter((c) => c.columnId === toColumn);
        const before = column[index];
        const at = before ? rest.indexOf(before) : rest.length;
        this.issues = [...rest.slice(0, at), { ...moved, columnId: toColumn, statusId: toColumn }, ...rest.slice(at)];
        emit("move", { cardId, toColumn, toIndex: index });
      },
      openIssue(id: string) {
        emit("nq-open", { id });
      },
      voteIssue(this: { issues: IssueBoardCard[] }, id: string) {
        const card = this.issues.find((c) => c.id === id);
        if (!card) return;
        const voted = !card.voted;
        card.voted = voted;
        card.votes = (card.votes ?? 0) + (voted ? 1 : -1);
        emit("nq-vote", { id, voted });
      },
      create() {
        emit("nq-create");
      },
      copyKey(key: string) {
        void navigator.clipboard?.writeText(key);
      },
    };
  });
};
