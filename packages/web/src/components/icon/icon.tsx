import type { LucideIcon, LucideProps } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

/**
 * lucide icons whose meaning follows reading direction. These mirror in RTL; everything else
 * (clocks, checks, media play, brand marks, digits) never does.
 */
export const DIRECTIONAL_ICONS = new Set([
  "ArrowLeft", "ArrowRight", "ArrowUpLeft", "ArrowUpRight", "ArrowDownLeft", "ArrowDownRight",
  "ChevronLeft", "ChevronRight", "ChevronsLeft", "ChevronsRight", "ChevronFirst", "ChevronLast",
  "CornerDownLeft", "CornerDownRight", "CornerUpLeft", "CornerUpRight",
  "Undo", "Undo2", "Redo", "Redo2", "Reply", "ReplyAll", "Forward", "Send", "SendHorizontal",
  "LogIn", "LogOut", "ExternalLink", "SquareArrowOutUpRight", "PanelLeft", "PanelRight",
  "PanelLeftClose", "PanelLeftOpen", "PanelRightClose", "PanelRightOpen", "TextAlignStart", "TextAlignEnd", "ListIndentIncrease", "ListIndentDecrease",
  "ArrowLeftToLine", "ArrowRightToLine", "ArrowLeftFromLine", "ArrowRightFromLine", "ArrowBigLeft", "ArrowBigRight",
  "MoveLeft", "MoveRight", "Indent", "IndentIncrease", "IndentDecrease", "Outdent", "ListStart", "ListEnd",
  "Sidebar", "SidebarOpen", "SidebarClose", "SquareArrowLeft", "SquareArrowRight", "CircleArrowLeft", "CircleArrowRight",
]);

export interface IconProps extends LucideProps {
  icon: LucideIcon;
  /** Force mirroring on/off. Defaults to the DIRECTIONAL_ICONS list. */
  directional?: boolean;
  /** Accessible name for a meaningful icon. When set the icon is `role="img"` instead of `aria-hidden`. */
  label?: string;
}

/** Mirrors via the rtl: variant, so it follows the nearest dir attribute with no JS. */
export function Icon({ icon: Glyph, directional, label, className, ...props }: IconProps) {
  const name = Glyph.displayName ?? "";
  const mirror = directional ?? DIRECTIONAL_ICONS.has(name);
  const a11y = label ? { role: "img" as const, "aria-label": label } : { "aria-hidden": true as const };
  return <Glyph {...a11y} data-slot="icon" className={cn(mirror && "rtl:-scale-x-100", className)} {...props} />;
}

/** Isolates left-to-right content (codes, emails, URLs, numbers with units) inside RTL text. */
export function Ltr({ className, ...props }: ComponentProps<"span">) {
  return <span data-slot="ltr" dir="ltr" className={cn("[unicode-bidi:isolate]", className)} {...props} />;
}

/** Isolates user-provided text of unknown direction (names, titles). */
export function Bdi(props: ComponentProps<"bdi">) {
  return <bdi data-slot="bdi" {...props} />;
}

const OPEN = { ltr: "\u2066", rtl: "\u2067", auto: "\u2068" } as const;

/**
 * The plain-text `Ltr` / `Bdi`: wraps `text` in Unicode isolate marks (LRI/RLI/FSI … PDI) for places that
 * take a string, not markup: `title`, `aria-label`, toasts, `document.title`, `<option>`, notifications.
 * `isolate(sku, "ltr")` for codes and keys, `isolate(name)` (first-strong) for user text.
 */
export function isolate(text: string, dir: "ltr" | "rtl" | "auto" = "auto"): string {
  return `${OPEN[dir]}${text}\u2069`;
}

/** A block of user text whose direction follows its own first strong character. */
export function BidiText({ className, ...props }: ComponentProps<"p">) {
  return <p data-slot="bidi-text" dir="auto" className={cn("[unicode-bidi:plaintext] text-start", className)} {...props} />;
}
