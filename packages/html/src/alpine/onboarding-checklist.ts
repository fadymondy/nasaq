// nqOnboardingChecklist: the live state of the "Get started" card (<x-nq::onboarding-checklist>): which items are done, the next one, progress, pending actions.
//
//   <section x-data="nqOnboardingChecklist(items, { title, allDone, progress })" x-modelable="items"
//            @action="$event.detail.wait(…)" @dismiss="…" @complete="…"> … </section>
//
// Items are [{ id, done? }]; the markup of each item is server-rendered and this binds its state by id. items is x-modelable: the host
// marks an item done by writing it back. Events fire on the root:
//   action    { id, wait }   the item's button was pressed; wait(promise) keeps the button busy until it settles (optional)
//   dismiss   { wait }       the close button; wait(promise) is optional
//   complete  {}             once, when the last item becomes done

import type { Magics, Register } from "./types";

interface Item {
  id: string;
  done?: boolean;
}

interface Labels {
  title: string;
  allDone: string;
  /** "{done} of {total} done" */
  progress: string;
}

interface State extends Magics {
  items: Item[];
  labels: Labels;
  pending: string | null;
  notified: boolean;
  alive: boolean;
  root: HTMLElement | null;
  fire(name: string, detail: Record<string, unknown>): Promise<unknown>;
  summary(): { done: number; total: number; percent: number; complete: boolean; nextIndex: number };
}

export const onboardingChecklist: Register = (Alpine) => {
  Alpine.data("nqOnboardingChecklist", (items: Item[], labels: Labels) => ({
    items: items.map((i) => ({ ...i })),
    labels,
    pending: null as string | null,
    notified: false,
    alive: true,
    root: null as HTMLElement | null,
    init(this: State) {
      this.root = this.$el;
      this.notified = this.summary().complete;
      this.$watch("items", () => {
        const complete = this.summary().complete;
        if (complete && !this.notified) {
          this.notified = true;
          (this.root ?? this.$el).dispatchEvent(new CustomEvent("complete", { bubbles: true, detail: {} }));
        }
        if (!complete) this.notified = false;
      });
    },
    destroy(this: State) {
      this.alive = false;
    },
    summary(this: State) {
      const total = this.items.length;
      const done = this.items.filter((i) => i.done).length;
      return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100), complete: total > 0 && done === total, nextIndex: this.items.findIndex((i) => !i.done) };
    },
    isDone(this: State, id: string) {
      return Boolean(this.items.find((i) => i.id === id)?.done);
    },
    isNext(this: State, id: string) {
      const s = this.summary();
      return s.nextIndex >= 0 && this.items[s.nextIndex]?.id === id;
    },
    progressText(this: State) {
      const s = this.summary();
      return this.labels.progress.replace("{done}", String(s.done)).replace("{total}", String(s.total));
    },
    heading(this: State) {
      return this.summary().complete ? this.labels.allDone : this.labels.title;
    },
    /** Fire an event, hand the host a wait() and resolve once its promise settles (at once when it gives none). */
    fire(this: State, name: string, detail: Record<string, unknown>) {
      let pending: Promise<unknown> | undefined;
      (this.root ?? this.$el).dispatchEvent(new CustomEvent(name, { bubbles: true, detail: { ...detail, wait: (p: Promise<unknown>) => (pending = Promise.resolve(p)) } }));
      return pending ?? Promise.resolve();
    },
    async run(this: State, id: string) {
      this.pending = id;
      try {
        await this.fire("action", { id });
      } catch {
        /* the host owns its errors */
      } finally {
        if (this.alive) this.pending = null;
      }
    },
    async dismiss(this: State) {
      try {
        await this.fire("dismiss", {});
      } catch {
        /* the host owns its errors */
      }
    },
  }));
};
