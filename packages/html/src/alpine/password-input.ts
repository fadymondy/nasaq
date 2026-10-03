// nqPasswordInput: show/hide toggle, strength meter and requirements checklist for a password field. The markup is the
// React PasswordInput's (the Blade component renders it), the state lives here.
//
//   <div x-data="nqPasswordInput('', { rules: { minLength: 12 } })" x-modelable="value" data-slot="password-input">
//     <input x-model="value" x-bind:type="shown ? 'text' : 'password'">
//     <button x-bind="toggle" aria-label="Show password">…</button>
//     <li x-bind="rule('upper')">An uppercase letter</li>
//   </div>
//
// value is x-modelable (x-model / wire:model). The estimator and rules are those of strength.ts in @fadymondy/nasaq.
// It is a hint for the person typing, not a security check: validate on the server.

import type { Register } from "./types";

type Score = 0 | 1 | 2 | 3 | 4;
type RuleId = "length" | "upper" | "lower" | "digit" | "symbol";

const CLASS_TESTS: Record<Exclude<RuleId, "length">, RegExp> = { upper: /\p{Lu}/u, lower: /\p{Ll}/u, digit: /\p{Nd}/u, symbol: /[^\p{L}\p{Nd}]/u };
const TONES = ["danger", "danger", "warning", "info", "success"] as const;
const FILL = ["bg-nq-danger", "bg-nq-danger", "bg-nq-warning", "bg-nq-info", "bg-nq-success"];

function estimate(password: string): Score {
  const chars = Array.from(password);
  const length = chars.length;
  if (length < 6 || new Set(chars).size <= 3) return 0;
  const classes = [/\p{Ll}/u, /\p{Lu}/u, /\p{Nd}/u, /[^\p{L}\p{Nd}]/u].filter((re) => re.test(password)).length;
  const variety = classes + (/[\p{Lo}]/u.test(password) ? 1 : 0);
  if (length >= 16 && variety >= 3) return 4;
  if (length >= 12 && variety >= 4) return 4;
  if (length >= 10 && variety >= 3) return 3;
  if (length >= 8 && variety >= 2) return 2;
  return 1;
}

interface PasswordInit {
  visible?: boolean;
  /** Fixed 0 to 4 score. Omit to estimate from the value. */
  score?: number | null;
  rules?: { minLength?: number; require?: RuleId[] } | null;
  /** Five words for scores 0 to 4. */
  levels?: string[];
}

interface PasswordScope {
  value: string;
  shown: boolean;
  fixedScore: number | null;
  policy: { minLength: number; require: Exclude<RuleId, "length">[] } | null;
  levels: string[];
  score(): Score;
  met(id: string): boolean;
  hasStrength(): boolean;
}

export const passwordInput: Register = (Alpine) => {
  Alpine.data("nqPasswordInput", (initial: string = "", init: PasswordInit = {}) => ({
    value: initial ?? "",
    shown: Boolean(init.visible),
    fixedScore: init.score ?? null,
    policy: init.rules ? { minLength: init.rules.minLength ?? 12, require: init.rules.require ?? ["upper", "lower", "digit", "symbol"] } : null,
    levels: init.levels ?? [],

    score(this: PasswordScope): Score {
      return Math.min(4, Math.max(0, Math.round(this.fixedScore ?? estimate(this.value)))) as Score;
    },
    hasStrength(this: PasswordScope) {
      return this.value.length > 0 || this.fixedScore !== null;
    },
    levelText(this: PasswordScope) {
      return this.hasStrength() ? (this.levels[this.score()] ?? "") : "";
    },
    /** Whether one requirement of the policy passes. */
    met(this: PasswordScope, id: string) {
      if (!this.policy) return false;
      if (id === "length") return Array.from(this.value).length >= this.policy.minLength;
      return CLASS_TESTS[id as Exclude<RuleId, "length">]?.test(this.value) ?? false;
    },
    /** Bind on the show/hide button. */
    toggle: {
      type: "button",
      ":aria-pressed"(this: PasswordScope) {
        return String(this.shown);
      },
      "x-on:click"(this: PasswordScope) {
        this.shown = !this.shown;
      },
    },
    /** Bind on the strength wrapper. */
    strengthBox: {
      ":data-score"(this: PasswordScope) {
        return String(this.score());
      },
      ":class"(this: PasswordScope) {
        return this.hasStrength() ? "" : "opacity-60";
      },
    },
    /** Bind on the meter element. */
    meter: {
      ":aria-valuenow"(this: PasswordScope) {
        return String(this.hasStrength() ? this.score() : 0);
      },
      ":data-tone"(this: PasswordScope) {
        return TONES[this.score()];
      },
    },
    /** Bind on the meter fill. */
    meterFill: {
      ":style"(this: PasswordScope) {
        return `inset-inline-start:0;width:${this.hasStrength() ? this.score() * 25 : 0}%`;
      },
      ":class"(this: PasswordScope) {
        return FILL[this.score()];
      },
    },
    /** Bind on one checklist row: `x-bind="rule('upper')"`. */
    rule(this: PasswordScope, id: string) {
      return {
        ":data-met": () => (this.met(id) ? "" : undefined),
        ":class": () => (this.met(id) ? "text-nq-success-text" : "text-muted-foreground"),
      };
    },
  }));
};
