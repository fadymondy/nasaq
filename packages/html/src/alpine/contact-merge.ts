// nqContactMerge: the survivor, the per-field choices and the confirm step of the contact merge. The markup is the React
// ContactMerge's, rendered by <x-nq::contact-merge>; the logic is contact-merge-logic.ts, copied from the React component.
//
//   <section x-data="nqContactMerge({ fields, records, survivor, choices, title: 'Merge into {name}?', failed })"> … </section>
//
// Nothing is stored: confirming fires a waitable event on the root and the host does the merge.
//   nq-merge   { survivorId, mergedIds, values, choices, waitUntil }   resolve with { error } (or reject) to keep the dialog open and show the message
//   nq-cancel  {}
// e.g. x-on:nq-merge="$event.detail.waitUntil(fetch('/contacts/merge', { method: 'POST', body: JSON.stringify($event.detail) }).then((r) => r.ok ? undefined : { error: 'Locked.' }))".
// Without a listener nothing is merged and the dialog just closes.

import { isEmptyMergeValue, rebaseContactMergeChoices, resolveContactMerge, type ContactMergeChoices, type ContactMergeField, type ContactMergeValue } from "./contact-merge-logic";
import type { Magics, Register } from "./types";

interface MergeField extends ContactMergeField {
  ltr: boolean;
  multi: boolean;
}

interface MergeConfig {
  fields: MergeField[];
  records: { id: string; name: string; values: Record<string, ContactMergeValue> }[];
  survivor: string;
  choices: ContactMergeChoices;
  /** "Merge into {name}?" */
  title: string;
  failed: string;
}

interface Row {
  id: string;
  label: string;
  ltr: boolean;
  tags: boolean;
  items: string[];
  text: string;
}

interface MergeState extends Magics {
  config: MergeConfig;
  root: HTMLElement | null;
  alive: boolean;
  survivor: string;
  choices: ContactMergeChoices;
  confirming: boolean;
  busy: boolean;
  error: string | null;
  readonly rows: Row[];
  readonly confirmTitle: string;
}

/** Dispatches a waitable event on the root; returns whatever promise a listener handed to waitUntil. */
function dispatch(root: HTMLElement, name: string, detail: Record<string, unknown>) {
  let pending: Promise<unknown> | undefined;
  const hold = (p: unknown) => {
    if (p && typeof (p as Promise<unknown>).then === "function") pending = Promise.resolve(p);
  };
  root.dispatchEvent(new CustomEvent(name, { bubbles: true, detail: { ...detail, waitUntil: hold, wait: hold } }));
  return pending;
}

export const contactMerge: Register = (Alpine) => {
  Alpine.data("nqContactMerge", (config: MergeConfig) => ({
    config,
    root: null as HTMLElement | null,
    alive: true,
    survivor: config.survivor,
    choices: { ...config.choices } as ContactMergeChoices,
    confirming: false,
    busy: false,
    error: null as string | null,
    init(this: MergeState) {
      this.root = this.$el;
      // Switching the survivor moves every field that still holds the old default to the new survivor.
      this.$watch("survivor", (next: string, previous: string) => {
        this.choices = rebaseContactMergeChoices(this.config.fields, this.config.records, { ...this.choices }, previous, next);
      });
      // The dialog cannot be dismissed while the merge runs.
      this.$watch("confirming", (open: boolean) => {
        if (!open && this.busy) this.confirming = true;
      });
    },
    destroy(this: MergeState) {
      this.alive = false;
    },
    /** The "After the merge" rows: every field that ends up with a value. */
    get rows(): Row[] {
      const self = this as unknown as MergeState;
      const outcome = resolveContactMerge(self.config.fields, self.config.records.map((r) => ({ id: r.id, values: r.values })), self.survivor, { ...self.choices });
      const rows: Row[] = [];
      for (const f of self.config.fields) {
        const v = outcome.values[f.id];
        if (isEmptyMergeValue(v)) continue;
        const items = typeof v === "string" ? [v] : [...(v ?? [])];
        rows.push({ id: f.id, label: f.label, ltr: f.ltr, tags: f.multi && Array.isArray(v), items, text: typeof v === "string" ? v : items.join(", ") });
      }
      return rows;
    },
    get confirmTitle(): string {
      const self = this as unknown as MergeState;
      const name = self.config.records.find((r) => r.id === self.survivor)?.name ?? "";
      return self.config.title.replace("{name}", name);
    },
    ask(this: MergeState) {
      this.error = null;
      this.confirming = true;
    },
    cancel(this: MergeState) {
      (this.root ?? this.$el).dispatchEvent(new CustomEvent("nq-cancel", { bubbles: true, detail: {} }));
    },
    async submit(this: MergeState) {
      if (this.busy) return;
      this.busy = true;
      this.error = null;
      try {
        const outcome = resolveContactMerge(this.config.fields, this.config.records.map((r) => ({ id: r.id, values: r.values })), this.survivor, { ...this.choices });
        const pending = dispatch(this.root ?? this.$el, "nq-merge", { ...outcome, values: { ...outcome.values }, choices: { ...outcome.choices } });
        const result = pending ? ((await pending) as { error?: string } | void) : undefined;
        if (!this.alive) return;
        if (result && result.error) this.error = result.error;
        else {
          this.busy = false;
          this.confirming = false;
        }
      } catch {
        if (this.alive) this.error = this.config.failed;
      } finally {
        if (this.alive) this.busy = false;
      }
    },
  }));
};
