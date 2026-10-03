// nqFunnelBuilder: the state of the funnel builder card (<x-nq::funnel-builder>): name, ordered steps, the add-a-step pickers and the window.
//
//   <div x-data="nqFunnelBuilder({ sources, value: { name, steps, window }, labels })"
//        @save="$event.detail.wait(…)" @funnel-change="…"> … </div>
//
// It is presentational: the host saves. Events fire on the root:
//   save           { value, wait }   resolve, or resolve { error } to show that message; a rejection, or nobody listening, shows labels.failed
//   funnel-change  { value }         after every edit (named so it never collides with the native change event)
// Save needs a name and two steps; the messages show after the first attempt.

import type { Magics, Register } from "./types";

interface Step {
  id: string;
  sourceId: string;
  kind: "event" | "page";
  label: string;
  detail?: string;
}

interface Source {
  id: string;
  kind: "event" | "page";
  label: string;
  detail?: string;
}

type Unit = "hour" | "day" | "week";

interface Funnel {
  name: string;
  steps: Step[];
  window: { amount: number; unit: Unit };
}

interface Config {
  sources: Source[];
  value: Funnel;
  labels: { saved: string; failed: string; moveUp: string; moveDown: string; remove: string };
}

type Outcome = { error?: string } | void | undefined;

interface State extends Magics {
  config: Config;
  name: string;
  steps: Step[];
  amount: number;
  unit: Unit | null;
  kindValue: string[];
  pickEvent: string | null;
  pickPage: string | null;
  counter: number;
  submitted: boolean;
  pending: boolean;
  message: { tone: "success" | "danger"; text: string } | null;
  alive: boolean;
  root: HTMLElement | null;
  readonly kind: "event" | "page";
  readonly pick: string | null;
  nameInvalid: boolean;
  readonly stepsInvalid: boolean;
  snapshot(): Funnel;
  edited(): void;
  emit(): void;
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export const funnelBuilder: Register = (Alpine) => {
  Alpine.data("nqFunnelBuilder", (config: Config) => ({
    config,
    name: config.value.name ?? "",
    steps: clone(config.value.steps ?? []) as Step[],
    amount: config.value.window?.amount ?? 7,
    unit: (config.value.window?.unit ?? "day") as Unit | null,
    kindValue: ["event"] as string[],
    pickEvent: null as string | null,
    pickPage: null as string | null,
    counter: 0,
    submitted: false,
    pending: false,
    message: null as { tone: "success" | "danger"; text: string } | null,
    alive: true,
    root: null as HTMLElement | null,
    init(this: State) {
      this.root = this.$el;
    },
    destroy(this: State) {
      this.alive = false;
    },
    get kind() {
      const self = this as unknown as State;
      return self.kindValue[0] === "page" ? "page" : "event";
    },
    get pick() {
      const self = this as unknown as State;
      return (self.kind === "page" ? self.pickPage : self.pickEvent) || null;
    },
    nameInvalid: false,
    get stepsInvalid() {
      const self = this as unknown as State;
      return self.submitted && self.steps.length < 2;
    },
    snapshot(this: State): Funnel {
      return clone({ name: this.name, steps: this.steps, window: { amount: this.amount, unit: this.unit ?? "day" } });
    },
    /** The key for URLs and API params: 7d, 24h, 2w. */
    windowKey(this: State) {
      const n = Math.max(1, Math.floor(Number(this.amount)) || 1);
      return `${n}${this.unit === "hour" ? "h" : this.unit === "week" ? "w" : "d"}`;
    },
    /** A label template with a {label} placeholder. */
    say(this: State, key: "moveUp" | "moveDown" | "remove", label: string) {
      return this.config.labels[key].replace("{label}", label);
    },
    emit(this: State) {
      this.nameInvalid = this.submitted && this.name.trim() === "";
      this.message = null;
      (this.root ?? this.$el).dispatchEvent(new CustomEvent("funnel-change", { bubbles: true, detail: { value: this.snapshot() } }));
    },
    edited(this: State) {
      this.emit();
    },
    setAmount(this: State) {
      this.amount = Math.max(1, Math.floor(Number(this.amount)) || 1);
      this.emit();
    },
    addStep(this: State) {
      const src = this.config.sources.find((s) => s.id === this.pick);
      if (!src) return;
      this.counter += 1;
      this.steps = [...this.steps, { id: `${src.id}#${this.counter}`, sourceId: src.id, kind: src.kind, label: src.label, detail: src.detail }];
      if (src.kind === "page") this.pickPage = null;
      else this.pickEvent = null;
      this.emit();
    },
    move(this: State, from: number, by: number) {
      const to = from + by;
      if (to < 0 || to >= this.steps.length) return;
      const next = [...this.steps];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item!);
      this.steps = next;
      this.emit();
    },
    removeAt(this: State, index: number) {
      this.steps = this.steps.filter((_, i) => i !== index);
      this.emit();
    },
    reset(this: State) {
      this.submitted = false;
      this.name = this.config.value.name ?? "";
      this.steps = clone(this.config.value.steps ?? []) as Step[];
      this.amount = this.config.value.window?.amount ?? 7;
      this.unit = (this.config.value.window?.unit ?? "day") as Unit;
      this.emit();
    },
    async submit(this: State) {
      this.submitted = true;
      this.nameInvalid = this.name.trim() === "";
      if (this.name.trim() === "" || this.steps.length < 2) return;
      this.pending = true;
      this.message = null;
      try {
        let pending: Promise<Outcome> | undefined;
        const value = { ...this.snapshot(), name: this.name.trim() };
        (this.root ?? this.$el).dispatchEvent(new CustomEvent("save", { bubbles: true, detail: { value, wait: (p: Promise<Outcome>) => (pending = Promise.resolve(p)) } }));
        if (!pending) throw new Error("no listener");
        const out = await pending;
        if (!this.alive) return;
        this.message = out && out.error ? { tone: "danger", text: out.error } : { tone: "success", text: this.config.labels.saved };
      } catch {
        if (this.alive) this.message = { tone: "danger", text: this.config.labels.failed };
      } finally {
        if (this.alive) this.pending = false;
      }
    },
  }));
};
