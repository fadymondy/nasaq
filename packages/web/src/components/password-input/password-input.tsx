"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Button } from "../button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../input-group";
import { Meter, type ProgressTone } from "../progress";
import { estimatePasswordStrength, type PasswordScore } from "./strength";

export { estimatePasswordStrength, type PasswordScore } from "./strength";

const STRINGS = {
  en: {
    toggle: "Show password",
    strength: "Password strength",
    levels: ["Very weak", "Weak", "Fair", "Good", "Strong"],
  },
  ar: {
    toggle: "إظهار كلمة المرور",
    strength: "قوة كلمة المرور",
    levels: ["ضعيفة جدًا", "ضعيفة", "مقبولة", "جيدة", "قوية"],
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
    </div>
  );
}
