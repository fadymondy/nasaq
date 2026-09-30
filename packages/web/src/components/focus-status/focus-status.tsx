"use client";

import { BellOff, Brain, Circle, Coffee, type LucideIcon } from "lucide-react";
import { type ComponentProps, useId } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Avatar, type AvatarProps } from "../avatar";
import { formatTimer } from "../countdown/countdown-math";
import { Switch } from "../switch";
import { type FocusState, focusStateOf } from "./focus-math";

const STRINGS = {
  en: {
    available: "Available",
    focus: "In focus",
    break: "On a break",
    dnd: "Do not disturb",
    left: "{time} left",
    dndLabel: "Do not disturb",
    dndHint: "Silences notifications and shows you as busy to your team.",
    dndUntil: "Until {time}",
  },
  ar: {
    available: "متاح",
    focus: "في تركيز",
    break: "في استراحة",
    dnd: "عدم الإزعاج",
    left: "متبقٍ {time}",
    dndLabel: "عدم الإزعاج",
    dndHint: "يكتم الإشعارات ويُظهرك مشغولًا لفريقك.",
    dndUntil: "حتى {time}",
  },
};

export type FocusStatusLabels = Partial<(typeof STRINGS)["en"]>;

function useStrings(labels?: FocusStatusLabels) {
  const ar = useOptionalNasaq()?.locale?.startsWith("ar") ?? false;
  return { t: { ...STRINGS[ar ? "ar" : "en"], ...labels } };
}

const fill = (template: string, values: Record<string, string>) => template.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? "");

/** Each state has its own glyph, so it reads without colour. */
const stateIcon: Record<FocusState, LucideIcon> = { available: Circle, focus: Brain, break: Coffee, dnd: BellOff };

const chipTone: Record<FocusState, string> = {
  available: "border-border bg-secondary text-muted-foreground",
  focus: "border-primary/40 bg-[color-mix(in_oklab,var(--nq-action)_12%,transparent)] text-foreground",
  break: "border-nq-success/40 bg-nq-success-soft text-nq-success-text",
  dnd: "border-nq-warning/40 bg-nq-warning-soft text-nq-warning-text",
};

const iconTone: Record<FocusState, string> = {
  available: "text-nq-success-text",
  focus: "text-primary",
  break: "text-nq-success-text",
  dnd: "text-nq-warning-text",
};

const dotTone: Record<FocusState, string> = {
  available: "bg-nq-success text-nq-success-text",
  focus: "bg-primary text-primary-foreground",
  break: "bg-nq-success-soft text-nq-success-text",
  dnd: "bg-nq-warning text-background",
};

export interface FocusStatusChipProps extends Omit<ComponentProps<"span">, "children"> {
  state: FocusState;
  /** Seconds left in the focus or break. Shown as mm:ss next to the label. */
  seconds?: number;
  /** Overrides the built-in word for the state, for example the task name. */
  text?: string;
  /** Renders a button (for example to open the pomodoro popover). */
  onClick?: () => void;
  labels?: FocusStatusLabels;
}

/** A compact header chip: the state's icon and word, and the time left while focusing or resting. */
export function FocusStatusChip({ state, seconds, text, onClick, labels, className, ...props }: FocusStatusChipProps) {
  const { t } = useStrings(labels);
  const Icon = stateIcon[state];
  const shown = seconds !== undefined && (state === "focus" || state === "break");
  const body = (
    <>
      <Icon aria-hidden="true" className={cn("size-3.5 shrink-0", iconTone[state], state === "available" && "fill-current")} />
      <span className="truncate">{text ?? t[state]}</span>
      {shown ? (
        <span dir="ltr" className="tabular-nums text-muted-foreground" aria-label={fill(t.left, { time: formatTimer(seconds as number) })}>
          {formatTimer(seconds as number)}
        </span>
      ) : null}
    </>
  );
  const classes = cn(
    "inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border px-2.5 text-caption font-medium",
    chipTone[state],
    onClick && "cursor-pointer outline-none transition-colors duration-150 ease-nq hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
    className,
  );
  if (onClick) {
    return (
      <button type="button" data-slot="focus-status" data-state={state} onClick={onClick} className={classes} {...(props as ComponentProps<"button">)}>
        {body}
      </button>
    );
  }
  return (
    <span data-slot="focus-status" data-state={state} className={classes} {...props}>
      {body}
    </span>
  );
}

export interface FocusAvatarProps extends AvatarProps {
  /** The person's presence. `available` shows the plain green dot. */
  state: FocusState;
  /** Hide the dot when the person is simply available. Default false. */
  hideAvailable?: boolean;
  labels?: FocusStatusLabels;
}

/** An avatar with an in-focus presence dot at its inline end. The dot carries an icon and a screen-reader label. */
export function FocusAvatar({ state, hideAvailable = false, labels, size = "md", className, ...avatar }: FocusAvatarProps) {
  const { t } = useStrings(labels);
  const Icon = stateIcon[state];
  const show = !(hideAvailable && state === "available");
  const big = size === "lg" || size === "md";
  return (
    <span data-slot="focus-avatar" data-state={state} className={cn("relative inline-flex shrink-0", className)}>
      <Avatar size={size} {...avatar} />
      {show ? (
        <span
          role="img"
          aria-label={t[state]}
          title={t[state]}
          className={cn("absolute -bottom-0.5 -end-0.5 grid place-items-center rounded-full border-2 border-background", big ? "size-4" : "size-3", dotTone[state])}
        >
          {big && state !== "available" ? <Icon aria-hidden="true" className="size-2.5" /> : null}
        </span>
      ) : null}
    </span>
  );
}

export interface DoNotDisturbToggleProps extends Omit<ComponentProps<"div">, "onChange"> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Text after "Until", for example "6:00 PM". Shown while on. */
  until?: string;
  disabled?: boolean;
  labels?: FocusStatusLabels;
}

/** A switch row for "Do not disturb", with a one-line description. */
export function DoNotDisturbToggle({ checked, onCheckedChange, until, disabled, labels, className, ...props }: DoNotDisturbToggleProps) {
  const { t } = useStrings(labels);
  const id = useId();
  return (
    <div data-slot="do-not-disturb" data-state={checked ? "on" : "off"} className={cn("flex items-center justify-between gap-4", className)} {...props}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <label htmlFor={id} className="inline-flex items-center gap-2 text-label text-foreground">
          <BellOff aria-hidden="true" className="size-4 text-muted-foreground" />
          {t.dndLabel}
        </label>
        <p className="text-body-sm text-muted-foreground">
          {t.dndHint}
          {checked && until ? <span className="ms-1 text-nq-warning-text">{fill(t.dndUntil, { time: `⁦${until}⁩` })}</span> : null}
        </p>
      </div>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  );
}
