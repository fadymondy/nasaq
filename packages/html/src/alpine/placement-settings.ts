// nqPlacementSettings: where a plugin or module appears in the app shell. The markup is the React PlacementSettings' (see the
// Blade component), the state lives here.
//
//   <section data-slot="placement-settings" x-data="nqPlacementSettings({ mode: 'sidebar', order: 3 }, { allowDefaultPage: true, labels })"
//            x-modelable="saved" x-id="['nq-placement']" :data-dirty="dirty() ? 'true' : null">
//     <div role="radiogroup" x-model="mode"> <button role="radio" x-bind="radio('sidebar')"> … </div>
//     <input x-bind:value="orderText" x-on:input="setOrder($event.target.value)">
//     <button x-bind:disabled="switchOff()" x-model="startOn" role="switch"> …
//     <span role="status" x-text="dirty() ? labels.unsaved : labels.saved"></span>
//     <button x-on:click="reset()" x-bind:disabled="resetOff()">…</button> <button x-on:click="save()" x-bind:disabled="saveOff()">…</button>
//   </section>
//
// The draft (mode, order, defaultPage) starts from `saved` and starts over whenever `saved` changes; `saved` is x-modelable
// (x-model="$wire.placement"). Saving fires "placement-save" ({ changes, done }) from the section with only the changed fields:
// handle it synchronously and the component treats it as saved (and folds the changes into `saved`); call event.preventDefault()
// to answer later, then done() on success or done("message") / done({ error }) on failure. Options: allowDefaultPage, labels, failure.

import {
  canBeDefaultPage,
  parseOrder,
  placementChanges,
  withMode,
  type PlacementMode,
  type PlacementValue,
} from "./placement-settings-logic";
import type { Magics, Register } from "./types";

interface Labels {
  unsaved: string;
  saved: string;
  orderHint: string;
  orderInvalid: string;
  defaultPageHint: string;
  defaultPageBlocked: string;
  saveFailed: string;
}

interface Options {
  allowDefaultPage?: boolean;
  labels?: Partial<Labels>;
  /** A save error to show from the start: a message, or `true` for the heading alone. */
  failure?: string | boolean | null;
}

interface PlacementState extends Magics {
  saved: PlacementValue;
  draft: PlacementValue;
  orderText: string;
  busy: boolean;
  failed: boolean;
  failure: string;
  allowDefaultPage: boolean;
  labels: Labels;
  root: HTMLElement | null;
  lastKey: string;
  mode: PlacementMode;
  startOn: boolean;
  uid(part: string): string;
  orderValid(): boolean;
  changes(): Partial<PlacementValue>;
  dirty(): boolean;
  startAllowed(): boolean;
  reset(): void;
  finish(changes: Partial<PlacementValue>, error?: string | boolean): void;
}

const keyOf = (v: PlacementValue) => `${v.mode}|${v.order}|${Boolean(v.defaultPage)}`;

export const placementSettings: Register = (Alpine) => {
  Alpine.data("nqPlacementSettings", (initial: PlacementValue, options: Options = {}) => ({
    saved: { ...initial } as PlacementValue,
    draft: { ...initial } as PlacementValue,
    orderText: String(initial.order),
    busy: false,
    failed: Boolean(options.failure),
    failure: typeof options.failure === "string" ? options.failure : "",
    allowDefaultPage: options.allowDefaultPage ?? false,
    labels: (options.labels ?? {}) as Labels,
    root: null as HTMLElement | null,
    lastKey: keyOf(initial),
    init(this: PlacementState) {
      this.root = this.$el;
      // Start over from the saved value whenever it changes.
      this.$watch("saved", () => {
        const k = keyOf(this.saved);
        if (k === this.lastKey) return;
        this.lastKey = k;
        this.reset();
      });
    },
    /** The picked mode. Setting it also switches the start page off when the new mode cannot have one. */
    get mode() {
      return (this as unknown as PlacementState).draft.mode;
    },
    set mode(next: PlacementMode) {
      const self = this as unknown as PlacementState;
      if (next === self.draft.mode) return;
      self.draft = withMode(self.draft, next);
    },
    get startOn() {
      const self = this as unknown as PlacementState;
      return Boolean(self.draft.defaultPage) && canBeDefaultPage(self.draft.mode);
    },
    set startOn(on: boolean) {
      const self = this as unknown as PlacementState;
      self.draft = { ...self.draft, defaultPage: Boolean(on) };
    },
    /** A generated id for a part, so attributes passed to other components need no quotes. */
    uid(this: PlacementState, part: string) {
      return this.$id("nq-placement", part);
    },
    orderValid(this: PlacementState) {
      return parseOrder(this.orderText) !== null;
    },
    changes(this: PlacementState) {
      return placementChanges(this.saved, this.draft, this.allowDefaultPage);
    },
    dirty(this: PlacementState) {
      return Object.keys(this.changes()).length > 0 || !this.orderValid();
    },
    startAllowed(this: PlacementState) {
      return canBeDefaultPage(this.draft.mode);
    },
    switchOff(this: PlacementState) {
      return !this.startAllowed() || this.busy;
    },
    resetOff(this: PlacementState) {
      return !this.dirty() || this.busy;
    },
    saveOff(this: PlacementState) {
      return !this.dirty() || !this.orderValid() || this.busy;
    },
    setOrder(this: PlacementState, text: string) {
      this.orderText = text;
      const n = parseOrder(text);
      if (n !== null) this.draft = { ...this.draft, order: n };
    },
    reset(this: PlacementState) {
      this.draft = { ...this.saved };
      this.orderText = String(this.saved.order);
    },
    finish(this: PlacementState, changes: Partial<PlacementValue>, error?: string | boolean) {
      this.busy = false;
      if (error) {
        this.failed = true;
        this.failure = typeof error === "string" ? error : "";
        return;
      }
      this.failed = false;
      this.failure = "";
      this.saved = { ...this.saved, ...changes };
    },
    save(this: PlacementState) {
      const changes = this.changes();
      if (!this.orderValid() || !Object.keys(changes).length || this.busy) return;
      let answered = false;
      const done = (result?: string | { error?: string | boolean } | void) => {
        if (answered) return;
        answered = true;
        const error = typeof result === "string" ? result || true : (result && typeof result === "object" && result.error) || undefined;
        this.finish(changes, error);
      };
      const event = new CustomEvent("placement-save", { bubbles: true, cancelable: true, detail: { changes, done } });
      this.busy = true;
      this.root?.dispatchEvent(event);
      // A handler that does not take over (preventDefault) has already finished its work.
      if (!event.defaultPrevented) done();
    },
  }));
};
