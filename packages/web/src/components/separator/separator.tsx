"use client";

import { Separator as BaseSeparator } from "@base-ui/react/separator";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

export function Separator({ className, orientation = "horizontal", ...props }: ComponentProps<typeof BaseSeparator>) {
  return (
    <BaseSeparator
      data-slot="separator"
      orientation={orientation}
      className={cn("shrink-0 bg-border", orientation === "vertical" ? "h-4 w-px self-center" : "h-px w-full", className as string)}
      {...props}
    />
  );
}
