import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

export interface TableProps extends ComponentProps<"table"> {
  /** Accessible name of the scroll region (keyboard users can focus and scroll it). Localise it. */
  label?: string;
}

/** Scrolls horizontally inside its own box so wide tables never break the page. */
export function Table({ className, label, ...props }: TableProps) {
  return (
    <div
      data-slot="table-container"
      role="region"
      tabIndex={0}
      aria-label={label}
      className="relative w-full overflow-x-auto outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus"
    >
      <table data-slot="table" className={cn("w-full caption-bottom border-collapse text-body-sm", className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }: ComponentProps<"thead">) {
  return <thead data-slot="table-header" className={cn("[&_tr]:border-b [&_tr]:hover:bg-transparent", className)} {...props} />;
}

export function TableBody({ className, ...props }: ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

export function TableFooter({ className, ...props }: ComponentProps<"tfoot">) {
  return <tfoot data-slot="table-footer" className={cn("border-t bg-secondary/50 font-medium", className)} {...props} />;
}

export function TableRow({ className, ...props }: ComponentProps<"tr">) {
  const selected = (props as { "data-state"?: string })["data-state"] === "selected";
  return (
    <tr
      data-slot="table-row"
      aria-selected={selected || undefined}
      className={cn("border-b border-border transition-colors duration-150 ease-nq hover:bg-nq-hover data-[state=selected]:bg-nq-selected", className)}
      {...props}
    />
  );
}

export function TableHead({ className, scope = "col", ...props }: ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      scope={scope}
      className={cn("h-row px-3 text-start align-middle text-caption font-medium whitespace-nowrap text-muted-foreground", className)}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: ComponentProps<"td">) {
  return <td data-slot="table-cell" className={cn("h-row px-3 align-middle whitespace-nowrap", className)} {...props} />;
}

export function TableCaption({ className, ...props }: ComponentProps<"caption">) {
  return <caption data-slot="table-caption" className={cn("mt-3 text-caption text-muted-foreground", className)} {...props} />;
}
