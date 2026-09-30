"use client";
import { ChevronRight } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Icon } from "../icon";

export function Breadcrumb({ "aria-label": label, ...props }: ComponentProps<"nav">) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  return <nav data-slot="breadcrumb" aria-label={label ?? (ar ? "مسار التنقل" : "Breadcrumb")} {...props} />;
}

export function BreadcrumbList({ className, ...props }: ComponentProps<"ol">) {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={cn("flex min-w-0 flex-wrap items-center gap-1.5 text-body-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export function BreadcrumbItem({ className, ...props }: ComponentProps<"li">) {
  return <li data-slot="breadcrumb-item" className={cn("inline-flex min-w-0 items-center gap-1.5", className)} {...props} />;
}

export function BreadcrumbLink({ className, ...props }: ComponentProps<"a">) {
  return (
    <a
      data-slot="breadcrumb-link"
      className={cn("truncate rounded-[3px] transition-colors duration-150 ease-nq outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus", className)}
      {...props}
    />
  );
}

/** The current page: not a link, announced as the current location. */
export function BreadcrumbPage({ className, ...props }: ComponentProps<"span">) {
  return <span data-slot="breadcrumb-page" aria-current="page" className={cn("truncate text-foreground", className)} {...props} />;
}

export function BreadcrumbSeparator({ className, children, ...props }: ComponentProps<"li">) {
  return (
    <li data-slot="breadcrumb-separator" role="presentation" aria-hidden="true" className={cn("[&_svg]:size-3.5", className)} {...props}>
      {children ? <span className="inline-flex rtl:-scale-x-100">{children}</span> : <Icon icon={ChevronRight} directional />}
    </li>
  );
}
