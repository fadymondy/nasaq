"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Button, type ButtonProps } from "../button";
import { Icon } from "../icon";
import { formatNumber } from "../numeric";

const STRINGS = {
  en: {
    nav: "Pagination",
    previous: "Previous",
    next: "Next",
    page: (n: string) => `Page ${n}`,
    more: "More pages",
    showing: (from: string, to: string, total?: string) => (total ? `Showing ${from}–${to} of ${total}` : `Showing ${from}–${to}`),
    loadMore: "Load more",
  },
  ar: {
    nav: "ترقيم الصفحات",
    previous: "السابق",
    next: "التالي",
    page: (n: string) => `الصفحة ${n}`,
    more: "المزيد من الصفحات",
    showing: (from: string, to: string, total?: string) => (total ? `عرض ${from}–${to} من ${total}` : `عرض ${from}–${to}`),
    loadMore: "تحميل المزيد",
  },
};

function useStrings() {
  const locale = useOptionalNasaq()?.locale ?? "en";
  return { t: STRINGS[locale.startsWith("ar") ? "ar" : "en"], locale };
}

export type PaginationItem = number | "start-ellipsis" | "end-ellipsis";

const range = (from: number, to: number) => Array.from({ length: Math.max(to - from + 1, 0) }, (_, i) => from + i);

/**
 * The page numbers to show: `boundaries` pages at each end, `siblings` pages around the current one, and an
 * ellipsis where pages are skipped. Always the same number of slots, so the control does not jump as you page.
 */
export function getPaginationItems(page: number, pageCount: number, siblings = 1, boundaries = 1): PaginationItem[] {
  const startPages = range(1, Math.min(boundaries, pageCount));
  const endPages = range(Math.max(pageCount - boundaries + 1, boundaries + 1), pageCount);
  const siblingsStart = Math.max(Math.min(page - siblings, pageCount - boundaries - siblings * 2 - 1), boundaries + 2);
  const siblingsEnd = Math.min(Math.max(page + siblings, boundaries + siblings * 2 + 2), endPages.length > 0 ? (endPages[0] as number) - 2 : pageCount - 1);
  const before: PaginationItem[] =
    siblingsStart > boundaries + 2 ? ["start-ellipsis"] : boundaries + 1 < pageCount - boundaries ? [boundaries + 1] : [];
  const after: PaginationItem[] =
    siblingsEnd < pageCount - boundaries - 1 ? ["end-ellipsis"] : pageCount - boundaries > boundaries ? [pageCount - boundaries] : [];
  return [...startPages, ...before, ...range(siblingsStart, siblingsEnd), ...after, ...endPages];
}

export interface PaginationProps extends Omit<ComponentProps<"nav">, "onChange"> {
  /** Current page, 1-based. */
  page: number;
  /** Total number of pages. */
  pageCount: number;
  onPageChange: (page: number) => void;
  /** Pages shown each side of the current one. Default 1. */
  siblings?: number;
  /** Pages always shown at each end. Default 1. */
  boundaries?: number;
  /** Landmark name. Default "Pagination" / "ترقيم الصفحات" by the Nasaq locale. */
  label?: string;
  /** Accessible name of the previous button. Default "Previous" / "السابق". */
  previousLabel?: string;
  /** Accessible name of the next button. Default "Next" / "التالي". */
  nextLabel?: string;
  /** Accessible name of a page button. Receives the formatted number. Default "Page 3" / "الصفحة 3". */
  pageLabel?: (formatted: string) => string;
}

/** Numbered pages with ellipsis, previous/next chevrons (mirrored in RTL) and `aria-current="page"` on the current page. */
export function Pagination({
  page,
  pageCount,
  onPageChange,
  siblings = 1,
  boundaries = 1,
  label,
  previousLabel,
  nextLabel,
  pageLabel,
  className,
  ...props
}: PaginationProps) {
  const { t, locale } = useStrings();
  const current = Math.min(Math.max(page, 1), Math.max(pageCount, 1));
  const items = getPaginationItems(current, pageCount, siblings, boundaries);
  const go = (n: number) => {
    if (n !== current && n >= 1 && n <= pageCount) onPageChange(n);
  };
  return (
    <nav data-slot="pagination" aria-label={label ?? t.nav} className={cn("w-fit max-w-full", className)} {...props}>
      <ul className="flex flex-wrap items-center gap-1">
        <li>
          <Button variant="ghost" size="icon-sm" aria-label={previousLabel ?? t.previous} disabled={current <= 1} onClick={() => go(current - 1)}>
            <Icon icon={ChevronLeft} />
          </Button>
        </li>
        {items.map((item) =>
          typeof item === "number" ? (
            <li key={item}>
              <Button
                variant={item === current ? "secondary" : "ghost"}
                size="icon-sm"
                aria-label={(pageLabel ?? t.page)(formatNumber(item, locale))}
                aria-current={item === current ? "page" : undefined}
                className={cn("tabular-nums", item === current && "border-primary bg-nq-selected")}
                onClick={() => go(item)}
              >
                {formatNumber(item, locale)}
              </Button>
            </li>
          ) : (
            <li key={item} data-slot="pagination-ellipsis" className="flex size-control-sm items-center justify-center text-muted-foreground">
              <span aria-hidden="true">…</span>
              <span className="sr-only">{t.more}</span>
            </li>
          ),
        )}
        <li>
          <Button variant="ghost" size="icon-sm" aria-label={nextLabel ?? t.next} disabled={current >= pageCount} onClick={() => go(current + 1)}>
            <Icon icon={ChevronRight} />
          </Button>
        </li>
      </ul>
    </nav>
  );
}

export interface CursorPagerProps extends Omit<ComponentProps<"nav">, "children"> {
  /** 1-based index of the first item on this page. */
  from: number;
  /** 1-based index of the last item on this page. */
  to: number;
  /** Total number of items, when known. Cursor APIs often cannot say. */
  total?: number;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  /** Disables both buttons while a page is being fetched. */
  loading?: boolean;
  /** Landmark name. Default "Pagination" / "ترقيم الصفحات". */
  label?: string;
  previousLabel?: ReactNode;
  nextLabel?: ReactNode;
  /** Replaces the "Showing X–Y" text. */
  summary?: ReactNode;
}

/** Previous/next only, for cursor-based lists that cannot jump to a page number, with a "Showing X–Y" label. */
export function CursorPager({
  from,
  to,
  total,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  loading = false,
  label,
  previousLabel,
  nextLabel,
  summary,
  className,
  ...props
}: CursorPagerProps) {
  const { t, locale } = useStrings();
  const n = (v: number) => formatNumber(v, locale);
  return (
    <nav data-slot="cursor-pager" aria-label={label ?? t.nav} className={cn("flex w-full items-center justify-between gap-3", className)} {...props}>
      <p className="text-body-sm text-muted-foreground tabular-nums">
        {summary ?? <bdi>{t.showing(n(from), n(to), total === undefined ? undefined : n(total))}</bdi>}
      </p>
      <div className="flex items-center gap-2">
        <Button size="sm" disabled={!hasPrevious || loading} onClick={onPrevious}>
          <Icon icon={ChevronLeft} />
          {previousLabel ?? t.previous}
        </Button>
        <Button size="sm" disabled={!hasNext || loading} onClick={onNext}>
          {nextLabel ?? t.next}
          <Icon icon={ChevronRight} />
        </Button>
      </div>
    </nav>
  );
}

/** A button that appends the next batch. `loading` shows a spinner and blocks repeat presses. */
export function LoadMore({ children, variant = "secondary", ...props }: ButtonProps) {
  const { t } = useStrings();
  return (
    <Button data-slot="load-more" variant={variant} {...props}>
      {children ?? t.loadMore}
    </Button>
  );
}
