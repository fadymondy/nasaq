"use client";

import { Check, X } from "lucide-react";
import { Children, type ComponentProps, createContext, isValidElement, type ReactNode, use } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Num } from "../numeric";

export type StepperOrientation = "horizontal" | "vertical";
export type StepStatus = "complete" | "current" | "upcoming" | "error";

const STRINGS = {
  en: { complete: "Completed", current: "Current step", upcoming: "Upcoming", error: "Error" },
  ar: { complete: "مكتملة", current: "الخطوة الحالية", upcoming: "قادمة", error: "خطأ" },
};

interface StepperContextValue {
  current: number;
  orientation: StepperOrientation;
}
const StepperContext = createContext<StepperContextValue>({ current: 0, orientation: "horizontal" });

interface ItemContextValue {
  index: number;
  last: boolean;
}
const ItemContext = createContext<ItemContextValue>({ index: 0, last: true });

export interface StepperProps extends Omit<ComponentProps<"ol">, "children"> {
  /** Zero-based index of the current step. Earlier steps are complete, later ones upcoming. */
  current: number;
  /** "horizontal" (default) runs along the inline axis, so it reads right to left in RTL. "vertical" stacks the steps. */
  orientation?: StepperOrientation;
  /** `StepperItem` elements, in order. */
  children: ReactNode;
}

/** A row (or column) of steps with connectors. State is derived from `current`; an item can add `error`. */
export function Stepper({ current, orientation = "horizontal", className, children, ...props }: StepperProps) {
  const items = Children.toArray(children).filter(isValidElement);
  return (
    <StepperContext value={{ current, orientation }}>
      <ol
        data-slot="stepper"
        data-orientation={orientation}
        className={cn("m-0 flex list-none p-0", orientation === "horizontal" ? "flex-row items-start" : "flex-col", className)}
        {...props}
      >
        {items.map((child, index) => (
          <ItemContext key={child.key ?? index} value={{ index, last: index === items.length - 1 }}>
            {child}
          </ItemContext>
        ))}
      </ol>
    </StepperContext>
  );
}

export interface StepperItemProps extends Omit<ComponentProps<"li">, "title" | "onClick"> {
  title: ReactNode;
  description?: ReactNode;
  /** Marks this step as failed: red marker with an X, and "Error" for screen readers. */
  error?: boolean;
  /** Makes the step a button (go back to a finished step). Omit for a read-only step. */
  onClick?: () => void;
  disabled?: boolean;
  /** Overrides the localised screen-reader status ("Completed", "Current step", "Upcoming", "Error"). */
  statusLabel?: string;
}

const markerBase =
  "relative z-10 inline-flex size-7 shrink-0 items-center justify-center rounded-full border text-caption font-medium transition-colors duration-150 ease-nq [&_svg]:size-3.5";
const markerByStatus: Record<StepStatus, string> = {
  complete: "border-transparent bg-primary text-primary-foreground",
  current: "border-nq-focus bg-background text-foreground ring-2 ring-nq-focus/30",
  upcoming: "border-border bg-background text-muted-foreground",
  error: "border-nq-danger/40 bg-nq-danger-soft text-nq-danger-text",
};

export function StepperItem({ title, description, error = false, onClick, disabled, statusLabel, className, ...props }: StepperItemProps) {
  const { current, orientation } = use(StepperContext);
  const { index, last } = use(ItemContext);
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const t = STRINGS[ar ? "ar" : "en"];
  const status: StepStatus = error ? "error" : index < current ? "complete" : index === current ? "current" : "upcoming";
  const vertical = orientation === "vertical";
  const interactive = onClick !== undefined;
  const Root = interactive ? "button" : "div";
  const rootProps = (interactive ? { type: "button", onClick, disabled } : {}) as Record<string, unknown>;

  const marker = (
    <span data-slot="stepper-marker" className={cn(markerBase, markerByStatus[status])}>
      {status === "complete" ? <Check aria-hidden /> : status === "error" ? <X aria-hidden /> : <Num value={index + 1} />}
    </span>
  );
  const text = (
    <span data-slot="stepper-text" className="flex min-w-0 flex-col text-start">
      <span className={cn("text-label", status === "upcoming" ? "text-muted-foreground" : "text-foreground", status === "error" && "text-nq-danger-text")}>
        {title}
        <span className="sr-only"> ({statusLabel ?? t[status]})</span>
      </span>
      {description ? <span className="text-caption text-muted-foreground">{description}</span> : null}
    </span>
  );
  const connector = (
    <span
      aria-hidden
      data-slot="stepper-connector"
      data-complete={status === "complete" || undefined}
      className={cn(
        "rounded-full transition-colors duration-150 ease-nq",
        status === "complete" ? "bg-primary" : "bg-border",
        vertical ? "col-start-1 row-start-2 my-1 min-h-6 w-px justify-self-center" : "mx-3 mt-3.5 h-px min-w-6 flex-1",
      )}
    />
  );

  return (
    <li
      data-slot="stepper-item"
      data-status={status}
      className={cn(vertical ? "grid grid-cols-[1.75rem_1fr] gap-x-3" : cn("flex items-start", !last && "flex-1"), className)}
      {...props}
    >
      <Root
        {...rootProps}
        data-slot="stepper-step"
        aria-current={status === "current" || (error && index === current) ? "step" : undefined}
        className={cn(
          "items-start gap-3 rounded-control text-start outline-none",
          vertical ? "col-span-2 grid grid-cols-subgrid" : "flex shrink-0",
          interactive &&
            "cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        {marker}
        {text}
      </Root>
      {last ? null : connector}
    </li>
  );
}
