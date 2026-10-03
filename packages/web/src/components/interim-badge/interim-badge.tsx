"use client";

import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge } from "../badge";
import { Spinner } from "../spinner";

export interface InterimBadgeProps extends Omit<ComponentProps<"span">, "children"> {
  /** Default "Interim" / "مبدئي" by locale. */
  label?: ReactNode;
  /** Stop the spinner once nothing more is coming, keeping the badge. Default `true`. */
  pending?: boolean;
}

/**
 * Marks content that is partial and still arriving: a streamed answer, a total before every source reported,
 * a draft figure. A small outlined badge with a spinner and a word, so it never relies on motion alone.
 */
export function InterimBadge({ label, pending = true, className, ...props }: InterimBadgeProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  return (
    <Badge
      data-slot="interim-badge"
      data-pending={pending || undefined}
      variant="outline"
      className={cn("border-nq-brand/40 text-foreground", className)}
      {...props}
    >
      {pending ? <Spinner aria-hidden className="size-3" /> : null}
      {label ?? (ar ? "مبدئي" : "Interim")}
    </Badge>
  );
}
