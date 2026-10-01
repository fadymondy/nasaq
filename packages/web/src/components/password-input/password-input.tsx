"use client";

import { Check, Eye, EyeOff, Minus } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Button } from "../button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../input-group";
import { Meter, type ProgressTone } from "../progress";
import { computePasswordRules, estimatePasswordStrength, type PasswordPolicy, type PasswordRule, type PasswordScore } from "./strength";

export {
  computePasswordRules,
  computeRuleScore,
  estimatePasswordStrength,
  passwordMeetsPolicy,
  type PasswordPolicy,
  type PasswordRule,
  type PasswordScore,
} from "./strength";

const STRINGS = {
  en: {
    toggle: "Show password",
    strength: "Password strength",
    levels: ["Very weak", "Weak", "Fair", "Good", "Strong"],
    requirements: "Password requirements",
    met: "met",
    notMet: "not met",
    rules: {
      length: (n: number) => `At least ${n} characters`,
      upper: "An uppercase letter",
      lower: "A lowercase letter",
      digit: "A number",
      symbol: "A symbol",
    } as Record<string, string | ((n: number) => string)>,
  },
  ar: {
    toggle: "إظهار كلمة المرور",
    strength: "قوة كلمة المرور",
    levels: ["ضعيفة جدًا", "ضعيفة", "مقبولة", "جيدة", "قوية"],
    requirements: "متطلبات كلمة المرور",
    met: "مستوفى",
    notMet: "غير مستوفى",
    rules: {
      length: (n: number) => `${n} حرفًا على الأقل`,
      upper: "حرف كبير",
      lower: "حرف صغير",
      digit: "رقم",
      symbol: "رمز",
    } as Record<string, string | ((n: number) => string)>,
  },
};

const TONES: ProgressTone[] = ["danger", "danger", "warning", "info", "success"];

export interface PasswordInputProps extends Omit<ComponentProps<typeof InputGroupInput>, "type"> {
  /** Whether the password is shown as text. Controlled. */
  visible?: boolean;
  /** Initial visibility when uncontrolled. Default false. */
  defaultVisible?: boolean;
  onVisibleChange?: (visible: boolean) => void;
  /** Accessible name of the toggle. Default "Show password" / "إظهار كلمة المرور". It stays constant; `aria-pressed` carries the state. */
  toggleLabel?: string;
  /** Show the strength meter under the input. Default false. */
  showStrength?: boolean;
  /** Strength from 0 to 4. Omit to use the built-in estimator (`estimatePasswordStrength`). */
  score?: number;
  /** Name of the meter. Default "Password strength" / "قوة كلمة المرور". */
  strengthLabel?: string;
  /** Five words for scores 0 to 4. Default English or Arabic by the Nasaq locale. */
  strengthLevels?: readonly [string, string, string, string, string];
  /**
   * Show a checklist of requirements under the input. `true` uses the default policy (12 characters, upper, lower,
   * digit, symbol); pass a `PasswordPolicy` to change it, or your own `PasswordRule[]` with `ruleLabels`.
   */
  rules?: boolean | PasswordPolicy | readonly PasswordRule[];
  /** Text for each rule id. Overrides the built-in English and Arabic words; add one for every custom rule. */
  ruleLabels?: Record<string, string>;
  /** Class for the outer wrapper. `className` on the input itself goes through `inputClassName`. */
  inputClassName?: string;
}

/**
 * A password field with a show/hide toggle and an optional strength meter. It is an `InputGroup`, so it
 * lines up with every other field and works inside `Field`. Set `autoComplete` to `new-password` when
 * creating a password and `current-password` when signing in.
 */
export function PasswordInput({
  visible: visibleProp,
  defaultVisible = false,
  onVisibleChange,
  toggleLabel,
  showStrength = false,
  score,
  strengthLabel,
  strengthLevels,
  rules,
  ruleLabels,
  className,
  inputClassName,
  value,
  defaultValue,
  onChange,
  disabled,
  ...props
}: PasswordInputProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t = STRINGS[locale.startsWith("ar") ? "ar" : "en"];
  const [visibleState, setVisibleState] = useState(defaultVisible);
  const visible = visibleProp ?? visibleState;
  const [typed, setTyped] = useState(() => (defaultValue === undefined ? "" : String(defaultValue)));
  const current = value === undefined ? typed : String(value);

  const toggle = () => {
    const next = !visible;
    if (visibleProp === undefined) setVisibleState(next);
    onVisibleChange?.(next);
  };
  const handleChange: NonNullable<PasswordInputProps["onChange"]> = (event) => {
    setTyped(event.target.value);
    onChange?.(event);
  };

  const shown = Math.min(4, Math.max(0, Math.round(score ?? estimatePasswordStrength(current)))) as PasswordScore;
  const levels = strengthLevels ?? t.levels;
  const hasValue = current.length > 0;
  const checklist: readonly PasswordRule[] | null = !rules
    ? null
    : Array.isArray(rules)
      ? (rules as readonly PasswordRule[])
      : computePasswordRules(current, rules === true ? {} : (rules as PasswordPolicy));
  const ruleText = (r: PasswordRule) => {
    if (ruleLabels?.[r.id]) return ruleLabels[r.id];
    const label = t.rules[r.id];
    return typeof label === "function" ? label(r.min ?? 12) : (label ?? r.id);
  };

  return (
    <div data-slot="password-input" className={cn("flex w-full flex-col gap-2", className)}>
      <InputGroup>
        <InputGroupInput
          {...props}
          type={visible ? "text" : "password"}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          disabled={disabled}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className={inputClassName}
        />
        <InputGroupAddon align="end" className="pe-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            data-slot="password-input-toggle"
            aria-label={toggleLabel ?? t.toggle}
            aria-pressed={visible}
            disabled={disabled}
            onClick={toggle}
          >
            {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </Button>
        </InputGroupAddon>
      </InputGroup>
      {showStrength ? (
        <div data-slot="password-input-strength" data-score={shown} className={cn("flex flex-col gap-1", !hasValue && score === undefined && "opacity-60")}>
          <Meter
            value={hasValue || score !== undefined ? shown : 0}
            min={0}
            max={4}
            size="sm"
            tone={TONES[shown]}
            aria-label={strengthLabel ?? t.strength}
            format={{ style: "decimal" }}
          />
          <div className="flex items-baseline justify-between gap-3 text-caption text-muted-foreground">
            <span>{strengthLabel ?? t.strength}</span>
            <span aria-live="polite" className="text-foreground">
              {hasValue || score !== undefined ? levels[shown] : ""}
            </span>
          </div>
        </div>
      ) : null}
      {checklist ? (
        <ul data-slot="password-input-rules" aria-label={t.requirements} className="grid gap-1 sm:grid-cols-2">
          {checklist.map((r) => (
            <li
              key={r.id}
              data-met={r.met || undefined}
              className={cn("flex items-center gap-1.5 text-caption transition-colors duration-150 ease-nq", r.met ? "text-nq-success-text" : "text-muted-foreground")}
            >
              {r.met ? <Check aria-hidden className="size-3.5 shrink-0" /> : <Minus aria-hidden className="size-3.5 shrink-0" />}
              <span>{ruleText(r)}</span>
              <span className="sr-only">, {r.met ? t.met : t.notMet}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
