// nqLimitsEditor: a per-resource limits table as a form. The markup is the React LimitsEditor's (see the Blade component),
// the state lives here.
//
//   <form data-slot="limits-editor" x-data="nqLimitsEditor({ seats: { mode: 'limit', value: 25 } }, { keys: ['seats'], fields: ['value'], inherited: { seats: 10 } })"
//         x-modelable="rules" x-id="['nq-limits']" novalidate x-on:submit.prevent="submit()">
//     <li data-slot="limits-editor-row" :data-mode="rule('seats').mode" :data-changed="changed('seats') ? '' : null">
//       <button x-bind="modeButton('seats', 'limit')">Limit</button> …
//       <input x-bind="numberField('seats', 'value')">  <div x-show="err('seats', 'value')" x-text="err('seats', 'value')"></div>
//     </li>
//     <div role="status" x-text="status()"></div> <button x-on:click="discard()">…</button> <button type="submit">…</button>
//   </form>
//
// Each resource is Limit (a number), Unlimited or Inherit, with optional price, overage price, and per-key rate and spend limits.
// Nothing is validated until the first save attempt; then a missing or negative number shows its error under the field. `rules` is
// x-modelable (x-model="$wire.limits"). "limits-change" ({ rules }) fires on every edit. Saving fires "limits-save"
// ({ rules, done }) from the form: handle it synchronously and the editor treats it as saved; call event.preventDefault() to answer
// later, then done() on success or done("message") / done({ error }) on failure. Options: keys, fields, inherited, units, currency, saveable.

import {
  changedKeys,
  effectiveLimit,
  hasErrors,
  parseNumberInput,
  ruleOf,
  validateRules,
  type LimitErrors,
  type LimitField,
  type LimitMode,
  type LimitRule,
  type LimitRules,
} from "./limits-editor-logic";
import type { Magics, Register } from "./types";

const STRINGS = {
  en: {
    inheritedValue: (v: string) => `Inherits ${v}`,
    inheritedUnlimited: "Inherits unlimited",
    inheritedNone: "Inherits the default",
    required: "Enter a limit, or choose Unlimited or Inherit.",
    invalid: "Enter zero or a positive number.",
    dirty: (n: string) => (n === "1" ? "1 unsaved change" : `${n} unsaved changes`),
    saved: "Saved",
    failed: "The limits could not be saved. Try again.",
    fixErrors: "Fix the highlighted fields to save.",
  },
  ar: {
    inheritedValue: (v: string) => `يرث ${v}`,
    inheritedUnlimited: "يرث غير محدود",
    inheritedNone: "يرث القيمة الافتراضية",
    required: "أدخل حدًا، أو اختر غير محدود أو وراثة.",
    invalid: "أدخل صفرًا أو رقمًا موجبًا.",
    dirty: (n: string) => (n === "1" ? "تغيير واحد غير محفوظ" : `${n} تغييرات غير محفوظة`),
    saved: "تم الحفظ",
    failed: "تعذّر حفظ الحدود. حاول مرة أخرى.",
    fixErrors: "صحّح الحقول المظلّلة لتتمكن من الحفظ.",
  },
} as const;

interface Options {
  keys?: string[];
  fields?: LimitField[];
  inherited?: Record<string, number | null>;
  units?: Record<string, string>;
}

interface LimitsState extends Magics {
  $nq: { locale: string };
  rules: LimitRules;
  baseline: LimitRules;
  submitted: boolean;
  busy: boolean;
  failure: string | null;
  justSaved: boolean;
  keys: string[];
  fields: LimitField[];
  inherited: Record<string, number | null>;
  units: Record<string, string>;
  root: HTMLElement | null;
  t(): (typeof STRINGS)["en"];
  rule(key: string): LimitRule;
  errors(): LimitErrors;
  dirty(): string[];
  set(key: string, patch: Partial<LimitRule>): void;
  fmt(n: number): string;
  setMode(key: string, mode: LimitMode): void;
  setField(key: string, field: LimitField, text: string): void;
  shown(key: string, field: LimitField): string;
  err(key: string, field: LimitField): string;
  changed(key: string): boolean;
  finish(error?: string): void;
}

export const limitsEditor: Register = (Alpine) => {
  Alpine.data("nqLimitsEditor", (initial: LimitRules = {}, options: Options = {}) => ({
    rules: { ...(initial ?? {}) } as LimitRules,
    baseline: { ...(initial ?? {}) } as LimitRules,
    submitted: false,
    busy: false,
    failure: null as string | null,
    justSaved: false,
    keys: options.keys ?? [],
    fields: options.fields ?? (["value"] as LimitField[]),
    inherited: options.inherited ?? {},
    units: options.units ?? {},
    root: null as HTMLElement | null,
    init(this: LimitsState) {
      this.root = this.$el;
    },
    t(this: LimitsState) {
      return STRINGS[String(this.$nq.locale).startsWith("ar") ? "ar" : "en"];
    },
    fmt(this: LimitsState, n: number) {
      return new Intl.NumberFormat(this.$nq.locale).format(n);
    },
    rule(this: LimitsState, key: string): LimitRule {
      return ruleOf(this.rules, key);
    },
    errors(this: LimitsState): LimitErrors {
      return validateRules(this.rules, this.keys, this.fields);
    },
    dirty(this: LimitsState): string[] {
      return changedKeys(this.baseline, this.rules, this.keys);
    },
    changed(this: LimitsState, key: string) {
      return this.dirty().includes(key);
    },
    set(this: LimitsState, key: string, patch: Partial<LimitRule>) {
      this.rules = { ...this.rules, [key]: { ...ruleOf(this.rules, key), ...patch } };
      this.justSaved = false;
      this.failure = null;
      this.root?.dispatchEvent(new CustomEvent("limits-change", { bubbles: true, detail: { rules: this.rules } }));
    },
    setMode(this: LimitsState, key: string, mode: LimitMode) {
      this.set(key, { mode });
    },
    setField(this: LimitsState, key: string, field: LimitField, text: string) {
      this.set(key, { [field]: parseNumberInput(text) });
    },
    /** The text for a number field: "" when empty. */
    shown(this: LimitsState, key: string, field: LimitField) {
      const v = ruleOf(this.rules, key)[field];
      return v === undefined || Number.isNaN(v) ? "" : String(v);
    },
    /** The error text under a field, once a save was attempted; "" when fine. */
    err(this: LimitsState, key: string, field: LimitField) {
      if (!this.submitted) return "";
      const code = this.errors()[key]?.[field];
      return code === "required" ? this.t().required : code === "invalid" ? this.t().invalid : "";
    },
    /** What Inherit resolves to, as a sentence; "" for the other modes. */
    inheritText(this: LimitsState, key: string) {
      const rule = ruleOf(this.rules, key);
      if (rule.mode !== "inherit") return "";
      const effective = effectiveLimit(rule, this.inherited[key]);
      const t = this.t();
      if (effective === undefined) return t.inheritedNone;
      if (effective === null) return t.inheritedUnlimited;
      const unit = this.units[key];
      return t.inheritedValue(unit ? `${this.fmt(effective)} ${unit}` : this.fmt(effective));
    },
    /** The footer status line: unsaved count, "Saved", or "". */
    status(this: LimitsState) {
      const n = this.dirty().length;
      return n > 0 ? this.t().dirty(this.fmt(n)) : this.justSaved ? this.t().saved : "";
    },
    blocked(this: LimitsState) {
      return this.submitted && hasErrors(this.errors());
    },
    finish(this: LimitsState, error?: string) {
      this.busy = false;
      if (error) {
        this.failure = error;
        return;
      }
      this.baseline = this.rules;
      this.submitted = false;
      this.justSaved = true;
    },
    submit(this: LimitsState) {
      this.submitted = true;
      if (hasErrors(this.errors()) || this.busy) return;
      this.failure = null;
      let answered = false;
      const done = (result?: string | { error?: string } | void) => {
        if (answered) return;
        answered = true;
        const error = typeof result === "string" ? result : (result && typeof result === "object" && result.error) || undefined;
        this.finish(error ? error || this.t().failed : undefined);
      };
      const event = new CustomEvent("limits-save", { bubbles: true, cancelable: true, detail: { rules: this.rules, done } });
      this.busy = true;
      this.root?.dispatchEvent(event);
      // A handler that does not take over (preventDefault) has already finished its work.
      if (!event.defaultPrevented) done();
    },
    discard(this: LimitsState) {
      this.rules = this.baseline;
      this.submitted = false;
      this.failure = null;
      this.root?.dispatchEvent(new CustomEvent("limits-change", { bubbles: true, detail: { rules: this.rules } }));
    },
    /** Bind on a Limit / Unlimited / Inherit button. */
    modeButton(this: LimitsState, key: string, mode: LimitMode) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const state = this;
      return {
        ":aria-pressed"() {
          return String(state.rule(key).mode === mode);
        },
        ":data-pressed"() {
          return state.rule(key).mode === mode ? "" : null;
        },
        "x-on:click"() {
          state.setMode(key, mode);
        },
      };
    },
    /** Bind on a number input. */
    numberField(this: LimitsState, key: string, field: LimitField) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const state = this;
      return {
        ":value"() {
          return state.shown(key, field);
        },
        ":aria-invalid"() {
          return state.err(key, field) ? "true" : null;
        },
        ":data-invalid"() {
          return state.err(key, field) ? "" : null;
        },
        "x-on:input"(event: Event) {
          state.setField(key, field, (event.target as HTMLInputElement).value);
        },
      };
    },
  }));
};
