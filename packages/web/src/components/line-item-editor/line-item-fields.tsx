"use client";

import { Ellipsis } from "lucide-react";
import { type ComponentProps, type ElementType, isValidElement, useState } from "react";
import { cn } from "../../lib/cn";
import { Button } from "../button";
import { minorToMajor, plainToMinor, toPlainDecimal } from "../currency-input/currency-input-logic";
import { type ContextMenuAction, groupActions } from "../context-menu";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../dropdown-menu";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "../input-group";
import { Num } from "../numeric";

/* Small pieces shared by the commerce and finance components (line-item editor, POS, ledgers). */

export interface LineItemMoneyProps extends Omit<ComponentProps<typeof Num>, "value" | "format"> {
  /** Amount in minor units. */
  minor: number;
  currency: string;
  /** "always" prefixes + on positive amounts. Default "auto" (a minus only for negatives). */
  sign?: "auto" | "always";
}

/** An amount in minor units, formatted for the locale with tabular digits and bidi isolation. */
export function LineItemMoney({ minor, currency, sign = "auto", ...props }: LineItemMoneyProps) {
  return <Num value={minorToMajor(minor, currency)} format={{ style: "currency", currency, signDisplay: sign === "always" ? "exceptZero" : "auto" }} {...props} />;
}

export interface LineItemDecimalFieldProps {
  /** The value scaled to an integer: 1500 with `scale` 3 is 1.5. `null` is empty. */
  value: number | null;
  /** Decimals kept: 3 for quantities, 2 for percentages held in basis points. */
  scale: number;
  onValueChange: (value: number | null) => void;
  /** Text for a value while the field is not focused ("1.5", "15"). */
  format: (value: number) => string;
  min?: number;
  max?: number;
  suffix?: string;
  invalid?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  "aria-label": string;
  id?: string;
  className?: string;
}

/** A number field that keeps an integer at a fixed scale, reads any digit set, and never shows a float. */
export function LineItemDecimalField({ value, scale, onValueChange, format, min, max, suffix, invalid, disabled, readOnly, id, className, ...rest }: LineItemDecimalFieldProps) {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState("");
  const outOfRange = value !== null && ((min !== undefined && value < min) || (max !== undefined && value > max));
  const input = (
    <InputGroupInput
      id={id}
      ltr
      inputMode="decimal"
      autoComplete="off"
      spellCheck={false}
      value={focused ? text : value === null ? "" : format(value)}
      disabled={disabled}
      readOnly={readOnly}
      aria-invalid={invalid || outOfRange || undefined}
      aria-label={rest["aria-label"]}
      className="text-end tabular-nums"
      onFocus={(e) => {
        setText(value === null ? "" : format(value));
        setFocused(true);
        e.currentTarget.select();
      }}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        const plain = toPlainDecimal(e.target.value);
        if (plain === null) {
          setText("");
          onValueChange(null);
          return;
        }
        const [whole = "0", fraction] = plain.replace("-", "").split(".");
        const clean = fraction === undefined ? whole : `${whole}.${fraction.slice(0, scale)}`;
        const scaled = plainToMinor(clean, scale, "truncate");
        if (scaled === null) return;
        setText(clean);
        if (scaled !== value) onValueChange(scaled);
      }}
    />
  );
  return (
    <InputGroup data-invalid={invalid || outOfRange || undefined} className={cn("min-w-0", className)}>
      {input}
      {suffix ? (
        <InputGroupAddon align="end">
          <InputGroupText>{suffix}</InputGroupText>
        </InputGroupAddon>
      ) : null}
    </InputGroup>
  );
}

export interface LineItemActionsMenuProps {
  actions: readonly ContextMenuAction[];
  /** Accessible name of the ⋯ button. Localise it. */
  label: string;
  className?: string;
}

/** The ⋯ menu that mirrors a row's context menu, for people who cannot context-click. */
export function LineItemActionsMenu({ actions, label, className }: LineItemActionsMenuProps) {
  if (!actions.length) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={label} className={cn("text-muted-foreground", className)} />}>
        <Ellipsis aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        {groupActions(actions).map((items, i) => (
          <DropdownMenuGroup key={i}>
            {i > 0 ? <DropdownMenuSeparator /> : null}
            {items.map((a) => {
              const Icon = a.icon as ElementType | undefined;
              return (
                <DropdownMenuItem key={a.id} variant={a.danger ? "danger" : "default"} disabled={a.disabled} onClick={a.onSelect}>
                  {isValidElement(a.icon) ? a.icon : Icon ? <Icon aria-hidden /> : null}
                  {a.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
