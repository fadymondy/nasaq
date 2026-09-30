"use client";

import { Clock, Heart, MapPin, Package, Undo2, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { Num } from "../numeric";
import { type StoreAccountLabels, useStoreAccountStrings } from "./account-strings";

export type StoreAccountSection = "orders" | "returns" | "wishlist" | "addresses" | "recent";

const ICON: Record<StoreAccountSection, LucideIcon> = { orders: Package, returns: Undo2, wishlist: Heart, addresses: MapPin, recent: Clock };
const SECTIONS: StoreAccountSection[] = ["orders", "returns", "wishlist", "addresses", "recent"];

export interface StoreAccountNavProps {
  active: StoreAccountSection;
  onNavigate?: (section: StoreAccountSection) => void;
  /** Small counts next to a section, for example the wishlist size. */
  counts?: Partial<Record<StoreAccountSection, number>>;
  /** Which sections to list, in order. Default: all five. */
  sections?: readonly StoreAccountSection[];
  labels?: StoreAccountLabels;
  className?: string;
}

/**
 * Account section navigation. A vertical list on wide screens and a scrolling row on narrow ones.
 * Every item is a button that reports the section, so it works with any router.
 */
export function StoreAccountNav({ active, onNavigate, counts, sections = SECTIONS, labels, className }: StoreAccountNavProps) {
  const { t } = useStoreAccountStrings(labels);
  const name: Record<StoreAccountSection, string> = { orders: t.navOrders, returns: t.navReturns, wishlist: t.navWishlist, addresses: t.navAddresses, recent: t.navRecent };
  return (
    <nav data-slot="store-account-nav" aria-label={t.account} className={cn("min-w-0", className)}>
      <ul className="m-0 flex list-none gap-1 overflow-x-auto p-0 pb-1 md:flex-col md:overflow-visible md:pb-0">
        {sections.map((section) => {
          const Icon = ICON[section];
          const current = section === active;
          return (
            <li key={section} className="shrink-0">
              <button
                type="button"
                aria-current={current ? "page" : undefined}
                onClick={() => onNavigate?.(section)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-control px-3 py-2 text-start text-body-sm font-medium outline-none",
                  "transition-colors duration-150 ease-nq focus-visible:outline-2 focus-visible:outline-nq-focus",
                  current ? "bg-nq-selected text-foreground" : "text-muted-foreground hover:bg-nq-hover hover:text-foreground",
                )}
              >
                <Icon aria-hidden className="size-4" />
                <span className="whitespace-nowrap">{name[section]}</span>
                {counts?.[section] ? <Num value={counts[section]!} className="ms-auto text-caption text-muted-foreground" /> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** A two-column account layout: navigation beside the content, stacked on narrow screens. */
export function StoreAccountLayout({ nav, title, children, className }: { nav: ReactNode; title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div data-slot="store-account-layout" className={cn("mx-auto grid w-full max-w-5xl grid-cols-[minmax(0,1fr)] gap-6 px-4 py-6 md:grid-cols-[14rem_minmax(0,1fr)]", className)}>
      {title ? <h1 className="m-0 text-h2 font-semibold md:col-span-2">{title}</h1> : null}
      <aside className="min-w-0">{nav}</aside>
      <main className="min-w-0">{children}</main>
    </div>
  );
}
