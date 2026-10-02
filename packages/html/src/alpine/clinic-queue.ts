// nqClinicQueue: the doctor's live patient queue. The markup is the React ClinicQueue's, rendered by <x-nq::clinic-queue>; the order,
// the cards and each row's moves come from the server's entries, so a Livewire or htmx re-render refreshes them. This module owns what
// the buttons and menus do: every move is a bubbling `nq-clinic-queue-action` event with { action, id }.
//
//   <div data-slot="clinic-queue" x-data="nqClinicQueue({ failed: 'That did not work. Try again.' })">
//     <button type="button" x-on:click="act('call-next')" x-bind:disabled="busy ? '' : null">Call next</button>
//     <button type="button" x-on:click="act('start', 'q2')">Start visit</button>
//     <p x-show="error" x-text="error"></p>
//   </div>
//
// action is "call-next" (no id), "call", "recall", "skip", "start", "finish" or "no-show". A listener may set `event.detail.promise` to a
// Promise (or one resolving to { error }); until it settles every move is blocked, and an error shows in the panel's danger alert.

import type { Magics, Register } from "./types";

export interface ClinicQueueConfig {
  /** The message shown when a listener's promise rejects. */
  failed?: string;
}

interface QueueState extends Magics {
  busy: boolean;
  error: string | null;
  failed: string;
  root: HTMLElement;
  rowKey(e: KeyboardEvent): void;
  act(action: string, id?: string): Promise<void>;
}

export const clinicQueue: Register = (Alpine) => {
  Alpine.data("nqClinicQueue", (config: ClinicQueueConfig = {}) => ({
    busy: false,
    error: null as string | null,
    failed: config.failed ?? "That did not work. Try again.",
    root: null as unknown as HTMLElement,
    init(this: QueueState) {
      this.root = this.$el;
    },
    // ArrowUp/ArrowDown/Home/End move focus between the table rows (roving tabindex).
    rowKey(this: QueueState, e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (!target.matches("[data-row]")) return;
      const rows = Array.from(this.root.querySelectorAll<HTMLElement>("[data-row]"));
      const at = rows.indexOf(target);
      const next = e.key === "ArrowDown" ? at + 1 : e.key === "ArrowUp" ? at - 1 : e.key === "Home" ? 0 : e.key === "End" ? rows.length - 1 : -1;
      const to = rows[next];
      if (!to) return;
      e.preventDefault();
      rows.forEach((r) => r.setAttribute("tabindex", r === to ? "0" : "-1"));
      to.focus();
    },
    async act(this: QueueState, action: string, id?: string) {
      if (this.busy) return;
      this.busy = true;
      this.error = null;
      const detail: { action: string; id?: string; promise?: Promise<unknown> } = { action, id };
      try {
        this.root.dispatchEvent(new CustomEvent("nq-clinic-queue-action", { bubbles: true, detail }));
        const result = (await detail.promise) as { error?: string } | void;
        if (result && result.error) this.error = result.error;
      } catch {
        this.error = this.failed;
      } finally {
        this.busy = false;
      }
    },
  }));
};
