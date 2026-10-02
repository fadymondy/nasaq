// nqFeatureFlagDetail: the state and the host events of the one-flag page (<x-nq::feature-flag-detail>): per-environment switches and
// rollout sliders, an ordered list of targeting rules (each a rule builder), the variants with their weights, and the kill switch.
//
//   <div x-data="nqFeatureFlagDetail({ flag, envs, fields, t })" x-on:toggle="$event.detail.wait(…)" x-on:kill="…"> … </div>
//
// It is presentational: the host does the work. Events fire on the root (all bubble); resolve the promise given to `wait`, or resolve
// { error } to show it, or reject for the generic error. Nobody listening shows the generic error and rolls the change back.
//   toggle    { environment, enabled, wait }      a switch flipped: until it settles the switch is locked, an error rolls it back
//   rollout   { environment, percent, wait }     the slider was released on a new value (an error rolls it back)
//   rules     { rules, wait }                    "Save targeting"
//   variants  { variants, wait }                 "Save variants"
//   kill      { reason, wait }                   the kill dialog was confirmed; on success the flag shows as killed
//   restore   { wait }                           "Restore" on the killed banner; on success the flag is live again
// State names are prefixed ff* where a child component (slider, switch, rule builder, field) has a state of the same name.
// The targeting rule builders are static markup: their "serve variant" choices are the variants at render, not live edits.

import { emptyRule, validateRule, type RuleActionType, type RuleDefinition, type RuleField } from "./rule-builder-logic";
import type { Magics, Register } from "./types";

interface Variant {
  key: string;
  label?: string;
  weight: number;
}

interface FlagData {
  key: string;
  killed?: boolean;
  environments: Record<string, { enabled: boolean; rollout: number }>;
  variants: Variant[];
  rules: RuleDefinition[];
}

interface Config {
  flag: FlagData;
  /** Environment ids in display order; the last one decides the headline state. */
  envs: string[];
  fields: RuleField[];
  t: Record<string, string>;
}

type Outcome = { error?: string } | void | undefined;

const EVENT_ID = "evaluate";
const KEY = /^[a-z0-9][a-z0-9._-]*$/;

const clampRollout = (v: number) => (Number.isFinite(v) ? Math.round(Math.min(100, Math.max(0, v)) * 100) / 100 : 0);

/** Whole-number shares that add up to exactly 100 (largest remainder), as the React flag model does. */
function normalizeWeights(weights: number[]): number[] {
  if (weights.length === 0) return [];
  const w = weights.map((x) => (Number.isFinite(x) && x > 0 ? x : 0));
  const sum = w.reduce((a, b) => a + b, 0);
  const raw = sum === 0 ? w.map(() => 100 / w.length) : w.map((x) => (x / sum) * 100);
  const floors = raw.map(Math.floor);
  let left = 100 - floors.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, rem: r - Math.floor(r) })).sort((a, b) => b.rem - a.rem || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    floors[i]! += 1;
    left -= 1;
  }
  return floors;
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

interface State extends Magics {
  cfg: Config;
  killed: boolean;
  ffOn: Record<string, boolean>;
  ffRollout: Record<string, number>;
  ffRules: RuleDefinition[];
  ffVariants: Variant[];
  committedOn: Record<string, boolean>;
  committedRollout: Record<string, number>;
  savedRules: string;
  savedVariants: string;
  busy: string | null;
  note: { tone: "success" | "danger"; text: string } | null;
  killing: boolean;
  ffReason: string;
  alive: boolean;
  root: HTMLElement | null;
  run(id: string, event: string, detail: Record<string, unknown>, success?: boolean): Promise<boolean>;
  actionTypes(): RuleActionType[];
  keyError(i: number): string | null;
  shares(): number[];
  rulesDirty(): boolean;
  rulesValid(): boolean;
  variantsDirty(): boolean;
  variantsValid(): boolean;
}

export const featureFlagDetail: Register = (Alpine) => {
  Alpine.data("nqFeatureFlagDetail", (cfg: Config) => {
    const envs = cfg.envs;
    const on: Record<string, boolean> = {};
    const rollout: Record<string, number> = {};
    for (const id of envs) {
      on[id] = Boolean(cfg.flag.environments[id]?.enabled);
      rollout[id] = cfg.flag.environments[id]?.rollout ?? 0;
    }
    return {
      cfg,
      killed: Boolean(cfg.flag.killed),
      ffOn: { ...on },
      ffRollout: { ...rollout },
      committedOn: { ...on },
      committedRollout: { ...rollout },
      ffRules: clone(cfg.flag.rules ?? []),
      ffVariants: clone(cfg.flag.variants ?? []),
      savedRules: JSON.stringify(cfg.flag.rules ?? []),
      savedVariants: JSON.stringify(cfg.flag.variants ?? []),
      busy: null as string | null,
      note: null as { tone: "success" | "danger"; text: string } | null,
      killing: false,
      ffReason: "",
      alive: true,
      root: null as HTMLElement | null,
      init(this: State) {
        this.root = this.$el;
        // A switch flipped by the user: tell the host. Our own rollbacks set the value back to the committed one, so they are ignored.
        this.$watch("ffOn", () => {
          for (const id of envs) {
            if (this.ffOn[id] === this.committedOn[id] || this.busy !== null) continue;
            const next = Boolean(this.ffOn[id]);
            void this.run(`toggle-${id}`, "toggle", { environment: id, enabled: next }).then((ok) => {
              if (ok) this.committedOn[id] = next;
              else setTimeout(() => (this.ffOn[id] = this.committedOn[id]!), 0);
            });
          }
        });
      },
      destroy(this: State) {
        this.alive = false;
      },

      /** Fire an event and wait for the promise the host hands to `wait`. Resolves true when it succeeded. */
      async run(this: State, id: string, event: string, detail: Record<string, unknown>, success = false): Promise<boolean> {
        this.busy = id;
        this.note = null;
        try {
          let pending: Promise<Outcome> | undefined;
          (this.root ?? this.$el).dispatchEvent(new CustomEvent(event, { bubbles: true, detail: { ...detail, wait: (p: Promise<Outcome>) => (pending = Promise.resolve(p)) } }));
          if (!pending) throw new Error("no listener");
          const out = await pending;
          if (out && out.error) {
            if (this.alive) this.note = { tone: "danger", text: out.error };
            return false;
          }
          if (success && this.alive) this.note = { tone: "success", text: this.cfg.t.saved! };
          return true;
        } catch {
          if (this.alive) this.note = { tone: "danger", text: this.cfg.t.failed! };
          return false;
        } finally {
          if (this.alive) this.busy = null;
        }
      },

      // State
      isState(this: State, name: string): boolean {
        const last = envs[envs.length - 1] ?? "";
        const enabled = Boolean(this.committedOn[last]);
        const pct = this.committedRollout[last] ?? 0;
        const state = this.killed ? "killed" : !enabled || pct <= 0 ? "off" : pct < 100 ? "partial" : "on";
        return state === name;
      },
      /** The switch is locked while the flag is killed or while its request runs. */
      locked(this: State, i: number): boolean {
        return this.killed || this.busy === `toggle-${envs[i]}`;
      },
      sliderLocked(this: State, id: string): boolean {
        return this.killed || !this.ffOn[id] || this.busy === `rollout-${id}`;
      },
      commitRollout(this: State, id: string) {
        const pct = clampRollout(Number(this.ffRollout[id]));
        if (this.busy !== null || pct === this.committedRollout[id]) return;
        void this.run(`rollout-${id}`, "rollout", { environment: id, percent: pct }).then((ok) => {
          if (ok) this.committedRollout[id] = pct;
          else setTimeout(() => (this.ffRollout[id] = this.committedRollout[id]!), 0);
        });
      },

      // Targeting
      actionTypes(this: State): RuleActionType[] {
        return [
          this.ffVariants.length > 0
            ? {
                id: "serve",
                label: this.cfg.t.serve!,
                fields: [{ name: "variant", label: this.cfg.t.variantField!, kind: "select", required: true, options: this.ffVariants.map((v) => ({ value: v.key, label: v.label ?? v.key })) }],
                defaults: { variant: this.ffVariants[0]!.key },
              }
            : { id: "serve", label: this.cfg.t.serveOn! },
        ];
      },
      rulesValid(this: State): boolean {
        return this.ffRules.every((r) => validateRule(r, this.cfg.fields, this.actionTypes()).length === 0);
      },
      rulesLocked(this: State): boolean {
        const dirty = this.rulesDirty();
        const valid = this.rulesValid();
        return !dirty || !valid || this.busy !== null;
      },
      rulesDirty(this: State): boolean {
        return JSON.stringify(this.ffRules) !== this.savedRules;
      },
      addRule(this: State) {
        const base = emptyRule();
        this.ffRules = [
          ...this.ffRules,
          { ...base, event: EVENT_ID, actions: [{ id: `a-${Date.now().toString(36)}`, type: "serve", config: this.ffVariants[0] ? { variant: this.ffVariants[0].key } : {} }] },
        ];
      },
      removeRule(this: State, i: number) {
        this.ffRules = this.ffRules.filter((_, j) => j !== i);
      },
      moveRule(this: State, i: number, to: number) {
        if (to < 0 || to >= this.ffRules.length) return;
        const next = [...this.ffRules];
        const [r] = next.splice(i, 1);
        next.splice(to, 0, r!);
        this.ffRules = next;
      },
      async saveRules(this: State) {
        const sent = clone(this.ffRules);
        if (await this.run("rules", "rules", { rules: sent }, true)) this.savedRules = JSON.stringify(sent);
      },

      // Variants
      shares(this: State): number[] {
        return normalizeWeights(this.ffVariants.map((v) => Number(v.weight)));
      },
      shareText(this: State, i: number): string {
        const lang = (document.documentElement.lang || "en").split("-")[0] + "-u-nu-latn";
        const v = (this.shares()[i] ?? 0) / 100;
        try {
          return new Intl.NumberFormat(lang, { style: "percent", maximumFractionDigits: 0 }).format(v);
        } catch {
          return `${Math.round(v * 100)}%`;
        }
      },
      keyError(this: State, i: number): string | null {
        const key = this.ffVariants[i]?.key ?? "";
        if (!KEY.test(key)) return this.cfg.t.keyInvalid!;
        return this.ffVariants.findIndex((x) => x.key === key) !== i ? this.cfg.t.keyDuplicate! : null;
      },
      variantsValid(this: State): boolean {
        return this.ffVariants.every((_, i) => this.keyError(i) === null);
      },
      variantsLocked(this: State): boolean {
        const dirty = this.variantsDirty();
        const valid = this.variantsValid();
        return !dirty || !valid || this.busy !== null;
      },
      variantsDirty(this: State): boolean {
        return JSON.stringify(this.ffVariants) !== this.savedVariants;
      },
      addVariant(this: State) {
        this.ffVariants = [...this.ffVariants, { key: `variant-${this.ffVariants.length + 1}`, weight: 1 }];
      },
      removeVariant(this: State, i: number) {
        this.ffVariants = this.ffVariants.filter((_, j) => j !== i);
      },
      async saveVariants(this: State) {
        const sent = this.ffVariants.map((v) => ({ ...v, weight: Math.max(0, Number(v.weight) || 0) }));
        if (await this.run("variants", "variants", { variants: sent }, true)) this.savedVariants = JSON.stringify(this.ffVariants);
      },

      // Kill switch
      async confirmKill(this: State) {
        const reason = this.ffReason.trim();
        this.killing = false;
        this.ffReason = "";
        if (await this.run("kill", "kill", { reason })) this.killed = true;
      },
      async restore(this: State) {
        if (await this.run("restore", "restore", {})) this.killed = false;
      },
      /** Whether the note shown above the tabs has this tone. A method, so Blade attributes need no double ampersand. */
      noteIs(this: State, tone: string): boolean {
        return this.note !== null && this.note.tone === tone;
      },
      /** A label template with {n} or {k} filled in. */
      fmt(this: State, key: string, value: string | number): string {
        return (this.cfg.t[key] ?? "").replace(/\{[nk]\}/, String(value));
      },
    };
  });
};
