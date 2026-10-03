// nqStoreOrderTimeline: the note composer of the activity variant. The markup is the React StoreOrderTimeline's, the state lives here.
//
//   <form x-data="nqStoreOrderTimeline" x-on:submit.prevent="submit()">
//     <textarea x-model="note"></textarea>
//     <button type="submit" x-bind:disabled="! canSubmit">Add note</button>
//   </form>
//
// submit() trims the text, dispatches a bubbling "nq-add-note" event with { note } and clears the field. A blank note is ignored.

import type { Magics, Register } from "./types";

interface NoteState extends Magics {
  note: string;
  readonly canSubmit: boolean;
  submit(): void;
}

export const storeOrderTimeline: Register = (Alpine) => {
  Alpine.data("nqStoreOrderTimeline", () => ({
    note: "",
    get canSubmit() {
      return this.note.trim().length > 0;
    },
    submit(this: NoteState) {
      const text = this.note.trim();
      if (!text) return;
      this.$dispatch("nq-add-note", { note: text });
      this.note = "";
    },
  }));
};
