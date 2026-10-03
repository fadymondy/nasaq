import { BellOff, Brain, Circle, Coffee, type LucideIcon } from "lucide-vue-next";
import type { FocusState } from "./focus-math";

/** Each state has its own glyph, so it reads without colour. */
export const focusStateIcon: Record<FocusState, LucideIcon> = { available: Circle, focus: Brain, break: Coffee, dnd: BellOff };

export const focusChipTone: Record<FocusState, string> = {
  available: "border-border bg-secondary text-muted-foreground",
  focus: "border-primary/40 bg-[color-mix(in_oklab,var(--nq-action)_12%,transparent)] text-foreground",
  break: "border-nq-success/40 bg-nq-success-soft text-nq-success-text",
  dnd: "border-nq-warning/40 bg-nq-warning-soft text-nq-warning-text",
};

export const focusIconTone: Record<FocusState, string> = {
  available: "text-nq-success-text",
  focus: "text-primary",
  break: "text-nq-success-text",
  dnd: "text-nq-warning-text",
};

export const focusDotTone: Record<FocusState, string> = {
  available: "bg-nq-success text-nq-success-text",
  focus: "bg-primary text-primary-foreground",
  break: "bg-nq-success-soft text-nq-success-text",
  dnd: "bg-nq-warning text-background",
};
