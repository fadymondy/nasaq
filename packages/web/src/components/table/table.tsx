"use client";

import { type ComponentProps, createContext, use } from "react";
import { cn } from "../../lib/cn";

export type TableDensity = "compact" | "default" | "comfortable";

export interface TableProps extends ComponentProps<"table"> {
  /** Accessible name of the scroll region (keyboard users can focus and scroll it). Localise it. */
  label?: string;
  /** Cell padding. `default` leaves room to read a row at a glance; `compact` fits more rows. Default `default`. */
  density?: TableDensity;
  /** A rounded border around the table, with a tinted header. */
  frame?: boolean;
  /** Lines between columns as well as rows. */
  bordered?: boolean;
  /** Every other body row tinted, to follow a row across a wide table. */
  striped?: boolean;
  /** Highlight the row under the pointer. Default true. */
  hover?: boolean;
}

type TableStyle = { density: TableDensity; hover: boolean; striped: boolean };

const TableContext = createContext<TableStyle>({ density: "default", hover: true, striped: false });

// Cell padding per density. Row heights still follow the global --nq-row density; this is the room around the text.
const PAD: Record<TableDensity, string> = {
  compact: "px-2 py-1",
  default: "px-4 py-3",
  comfortable: "px-5 py-4",
};

/** Scrolls horizontally inside its own box so wide tables never break the page. */
export function Table({ className, label, density = "default", frame, bordered, striped = false, hover = true, ...props }: TableProps) {
  return (
    <TableContext value={{ density, hover, striped }}>
      <div
        data-slot="table-container"
        role="region"
        tabIndex={0}
        aria-label={label}
        className={cn(
          "relative w-full overflow-x-auto outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus",
          frame && "rounded-card border border-border bg-card",
        )}
      >
        <table
          data-slot="table"
          data-density={density}
          data-frame={frame || undefined}
          data-bordered={bordered || undefined}
          data-striped={striped || undefined}
          className={cn(
            "w-full caption-bottom border-collapse text-body-sm",
            frame && "[&_thead]:bg-secondary/50",
            bordered && "[&_td:not(:last-child)]:border-e [&_td]:border-border [&_th:not(:last-child)]:border-e [&_th]:border-border",
            className,
          )}
          {...props}
        />
      </div>
    </TableContext>
  );
}

export function TableHeader({ className, ...props }: ComponentProps<"thead">) {
  return <thead data-slot="table-header" className={cn("[&_tr]:border-b [&_tr]:hover:bg-transparent [&_tr]:even:bg-transparent", className)} {...props} />;
}

export function TableBody({ className, ...props }: ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

export function TableFooter({ className, ...props }: ComponentProps<"tfoot">) {
  return <tfoot data-slot="table-footer" className={cn("border-t bg-secondary/50 font-medium [&_tr]:even:bg-transparent", className)} {...props} />;
}

export function TableRow({ className, ...props }: ComponentProps<"tr">) {
  const { hover, striped } = use(TableContext);
  const selected = (props as { "data-state"?: string })["data-state"] === "selected";
  return (
    <tr
      data-slot="table-row"
      aria-selected={selected || undefined}
      className={cn(
        "border-b border-border transition-colors duration-150 ease-nq",
        striped && "even:bg-secondary/40",
        hover && "hover:bg-nq-hover",
        "data-[state=selected]:bg-nq-selected",
        className,
      )}
      {...props}
    />
  );
}

export function TableHead({ className, scope = "col", ...props }: ComponentProps<"th">) {
  const { density } = use(TableContext);
  return (
    <th
      data-slot="table-head"
      scope={scope}
      className={cn("h-row text-start align-middle text-caption font-medium whitespace-nowrap text-muted-foreground", PAD[density], className)}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: ComponentProps<"td">) {
  const { density } = use(TableContext);
  return <td data-slot="table-cell" className={cn("h-row align-middle whitespace-nowrap", PAD[density], className)} {...props} />;
}

export function TableCaption({ className, ...props }: ComponentProps<"caption">) {
  return <caption data-slot="table-caption" className={cn("mt-3 text-caption text-muted-foreground", className)} {...props} />;
}
