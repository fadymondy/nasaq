"use client";
import type { LucideIcon } from "lucide-react";
import { type ComponentProps, isValidElement, type ReactNode } from "react";
import { cn } from "../../lib/cn";

export type SourceBadgeSize = "sm" | "md";

export interface SourceBadgeProps extends Omit<ComponentProps<"span">, "children"> {
  /** The source's name, already localised: "GitHub", "Google Drive", "RSS". */
  label: string;
  /** A lucide icon, or any node (a brand mark `<svg>` or an `<img>`). */
  icon?: LucideIcon | ReactNode;
  /** Brand colour for the icon only; the label stays in text colour. */
  color?: string;
  /** Icon only. The label becomes the accessible name and the tooltip. */
  compact?: boolean;
  size?: SourceBadgeSize;
  /** Makes the badge an external link. */
  href?: string;
}

function renderIcon(icon: SourceBadgeProps["icon"]) {
  if (!icon || isValidElement(icon)) return icon as ReactNode;
  // lucide icons are forwardRef objects; plain function components work too.
  if (typeof icon === "function" || (typeof icon === "object" && "$$typeof" in icon)) {
    const Glyph = icon as LucideIcon;
    return <Glyph aria-hidden />;
  }
  return icon as ReactNode;
}

/**
 * Where a record came from: a plugin, an integration or a feed, as an icon and a name. Use it on rows,
 * search results and imported items. For statuses use `Badge` or `Status`.
 */
export function SourceBadge({ label, icon, color, compact = false, size = "sm", href, className, ...props }: SourceBadgeProps) {
  const classes = cn(
    "inline-flex shrink-0 items-center gap-1.5 rounded-control border border-border bg-secondary text-foreground",
    size === "sm" ? "h-6 px-2 text-caption [&_svg]:size-3.5" : "h-7 px-2.5 text-label [&_svg]:size-4",
    compact && (size === "sm" ? "w-6 justify-center px-0" : "w-7 justify-center px-0"),
    href &&
      "transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
    className,
  );
  const inner = (
    <>
      {icon ? (
        <span data-slot="source-badge-icon" className="inline-flex items-center [&_img]:size-3.5" style={color ? { color } : undefined}>
          {renderIcon(icon)}
        </span>
      ) : null}
      {compact ? null : <span className="truncate">{label}</span>}
    </>
  );
  const a11y = compact ? { "aria-label": label, title: label } : {};
  if (href) {
    return (
      <a data-slot="source-badge" href={href} target="_blank" rel="noopener noreferrer" className={classes} {...a11y} {...(props as ComponentProps<"a">)}>
        {inner}
      </a>
    );
  }
  return (
    <span data-slot="source-badge" role={compact ? "img" : undefined} className={classes} {...a11y} {...props}>
      {inner}
    </span>
  );
}
