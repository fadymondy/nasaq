// nqAttention: the "Show more" expander and row dismissal of the Attention list. The markup is the React Attention's.
//
//   <section x-data="nqAttention(5, 8)">
//     <ul>
//       <li data-slot="attention-item" data-id="a">… <button x-on:click="dismiss($el.closest('li'))" aria-label="Dismiss">×</button></li>
//       <li data-slot="attention-item" style="display: none">…</li>   <!-- rows past max start hidden -->
//     </ul>
//     <button aria-expanded="false" :aria-expanded="expanded" x-on:click="toggle()" data-more="Show {n} more" data-less="Show less"
//             x-text="expanded ? $el.dataset.less : $el.dataset.more.replace('{n}', hidden)">Show 3 more</button>
//   </section>
//
// Dismissing removes the row, lowers the count, brings the next hidden row up when collapsed, and fires a bubbling
// `nq:dismiss` event ({ id }) so the host can persist it.

import type { Magics, Register } from "./types";

export interface AttentionState extends Magics {
  max: number;
  total: number;
  expanded: boolean;
  root: HTMLElement;
  readonly hidden: number;
  toggle(): void;
  dismiss(row: HTMLElement): void;
  sync(): void;
}

export const attention: Register = (Alpine) => {
  Alpine.data("nqAttention", (max = 5, total = 0) => ({
    max: Number(max),
    total: Number(total),
    expanded: false,
    root: undefined as unknown as HTMLElement,
    init(this: AttentionState) {
      this.root = this.$el; // $el is the clicked button inside handlers, and that button is removed with its row
      this.$watch("expanded", () => this.sync());
    },
    /** Rows past `max` are hidden while collapsed. */
    get hidden(): number {
      return Math.max(0, (this as unknown as AttentionState).total - (this as unknown as AttentionState).max);
    },
    toggle(this: AttentionState) {
      this.expanded = !this.expanded;
    },
    dismiss(this: AttentionState, row: HTMLElement) {
      const id = row.dataset.id ?? "";
      row.remove();
      this.total = Math.max(0, this.total - 1);
      this.sync();
      this.root.dispatchEvent(new CustomEvent("nq:dismiss", { detail: { id }, bubbles: true }));
    },
    sync(this: AttentionState) {
      const rows = this.root.querySelectorAll<HTMLElement>('[data-slot="attention-item"]');
      rows.forEach((row, index) => {
        row.style.display = this.expanded || index < this.max ? "" : "none";
      });
    },
  }));
};
