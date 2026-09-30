import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn("flex flex-col gap-4 rounded-card border border-border bg-card py-4 text-card-foreground", className)}
      {...props}
    />
  );
}

/** Title + description on the inline start, an optional CardAction on the inline end. */
export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("grid auto-rows-min items-start gap-1 px-4 has-data-[slot=card-action]:grid-cols-[1fr_auto]", className)}
      {...props}
    />
  );
}

export interface CardTitleProps extends ComponentProps<"div"> {
  /** Element to render. Default "div"; pass a heading ("h2", "h3", …) so the card is a navigable section. */
  as?: "div" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}

export function CardTitle({ className, as: Comp = "div", ...props }: CardTitleProps) {
  return <Comp data-slot="card-title" className={cn("text-label text-foreground", className)} {...(props as object)} />;
}

export function CardDescription({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="card-description" className={cn("text-body-sm text-muted-foreground", className)} {...props} />;
}

export function CardAction({ className, ...props }: ComponentProps<"div">) {
  return (
    <div data-slot="card-action" className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)} {...props} />
  );
}

export function CardContent({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("px-4", className)} {...props} />;
}

export function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="card-footer" className={cn("flex items-center gap-2 px-4", className)} {...props} />;
}
