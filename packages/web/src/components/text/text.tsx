import type { ComponentProps, ElementType } from "react";
import { cn } from "../../lib/cn";

export type TextRole = "display" | "h1" | "h2" | "h3" | "body" | "body-sm" | "label" | "caption" | "eyebrow" | "code";

const roleClass: Record<TextRole, string> = {
  display: "text-display text-foreground",
  h1: "text-h1 text-foreground",
  h2: "text-h2 text-foreground",
  h3: "text-h3 text-foreground",
  body: "text-body text-nq-fg-body",
  "body-sm": "text-body-sm text-nq-fg-body",
  label: "text-label text-foreground",
  caption: "text-caption text-muted-foreground",
  eyebrow: "eyebrow",
  code: "font-mono text-code",
};

const defaultElement: Record<TextRole, ElementType> = {
  display: "h1",
  h1: "h1",
  h2: "h2",
  h3: "h3",
  body: "p",
  "body-sm": "p",
  label: "span",
  caption: "span",
  eyebrow: "span",
  code: "code",
};

export type TextProps<E extends ElementType = "span"> = {
  /** Typography role (docs/ARCHITECTURE.md §9). Latin/Arabic metrics resolve from the nearest lang. */
  variant?: TextRole;
  as?: E;
} & Omit<ComponentProps<E>, "as">;

export function Text<E extends ElementType = "span">({ variant = "body", as, className, ...props }: TextProps<E>) {
  const Comp = (as ?? defaultElement[variant]) as ElementType;
  return <Comp data-slot="text" className={cn(roleClass[variant], className)} {...props} />;
}

/** Keyboard key. Pass `aria-label` for glyph keys ("⌘" → "Command") so screen readers say the key name. */
export function Kbd({ className, ...props }: ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      role={props["aria-label"] ? "img" : undefined}
      dir="ltr"
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-[4px] border border-border bg-card px-1 font-mono text-[11px] text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}
