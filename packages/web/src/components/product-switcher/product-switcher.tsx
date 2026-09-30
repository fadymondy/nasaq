"use client";

import { Popover } from "@base-ui/react/popover";
import { resolveBrand } from "@nasaq/brands";
import { ArrowUpRight, LayoutGrid } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useMemo } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { SidebarGroup, SidebarItem, useSidebarCollapsed } from "../app-shell";
import { type Command, useRegisterCommands } from "../commands";
import { Icon } from "../icon";
import { ProductMark } from "../product-mark";
import { SidebarSortable, SidebarSortableItem } from "../sidebar-layout";
import { Tooltip } from "../tooltip";

/**
 * One installed product or app. Nasaq never fetches these: pass them from wherever the host knows
 * them (a static list, CircleXO's installed apps, a feature flag service…).
 */
export interface Product {
  id: string;
  /** Already localised by the host. */
  name: string;
  /** A Nasaq brand key: draws the official mark and uses its manifest accent. */
  brand?: string;
  /** Or the product's own official logo (an <img> of the supplied file). Never a generic icon. */
  logo?: ReactNode;
  /** Brand accent when `brand` is not a Nasaq brand. Used only as a small marker, never on the logo. */
  accent?: string;
  description?: string;
  href?: string;
  /** Shown in the sidebar products group. */
  pinned?: boolean;
  /** E.g. an unread count. */
  badge?: ReactNode;
  keywords?: string[];
}

const accentOf = (p: Product) => p.accent ?? (p.brand ? resolveBrand(p.brand)?.color.accent : undefined);

/** The official mark at `size`, untouched. Hosts without a Nasaq brand pass `logo`. */
export function ProductIcon({ product, size = 20 }: { product: Product; size?: number }) {
  if (product.brand && resolveBrand(product.brand)) return <ProductMark brand={product.brand} size={size} title="" />;
  if (product.logo) {
    return (
      <span className="inline-flex shrink-0 items-center justify-center overflow-hidden" style={{ width: size, height: size }}>
        {product.logo}
      </span>
    );
  }
  // No official asset supplied: initials, never a stand-in pictogram.
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-[4px] bg-secondary font-medium text-muted-foreground"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.45) }}
    >
      {product.name.slice(0, 1)}
    </span>
  );
}

/** Registers "Switch to <product>" in the palette's products section. */
export function useProductCommands(products: Product[], onSelect: (product: Product) => void, current?: string) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const commands = useMemo<Command[]>(
    () =>
      products
        .filter((p) => p.id !== current)
        .map((p) => ({
          id: `nasaq.product.${p.id}`,
          section: "products",
          label: p.name,
          icon: <ProductIcon product={p} size={16} />,
          hint: ar ? "تطبيق" : "App",
          keywords: [...(p.keywords ?? []), p.brand ?? "", ar ? "انتقل إلى" : "switch to", ar ? "تطبيق" : "app"],
          priority: p.pinned ? 1 : 0,
          perform: () => onSelect(p),
        })),
    [products, onSelect, current, ar],
  );
  useRegisterCommands(commands);
}

export interface ProductSwitcherProps {
  products: Product[];
  /** The product the user is in. */
  current?: string;
  /** Called on select. Products with `href` also navigate as links. */
  onSelect?: (product: Product) => void;
  /** Adds an "All apps" footer link (e.g. to an app store). */
  allHref?: string;
  onViewAll?: () => void;
  /** Registers "Switch to…" commands in the CommandPalette. Default true. */
  registerCommands?: boolean;
  labels?: { trigger?: string; heading?: string; all?: string };
  /** The trigger. Defaults to a grid icon button for the header. */
  children?: ReactNode;
  className?: string;
}

const COLUMNS = 3;

/** Arrow keys move through the grid; the inline axis follows dir. */
function onGridKey(event: KeyboardEvent<HTMLDivElement>) {
  const tiles = [...event.currentTarget.querySelectorAll<HTMLElement>("[data-slot=product-tile]")];
  const i = tiles.indexOf(document.activeElement as HTMLElement);
  if (i < 0) return;
  const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
  const step: Record<string, number> = {
    ArrowRight: rtl ? -1 : 1,
    ArrowLeft: rtl ? 1 : -1,
    ArrowDown: COLUMNS,
    ArrowUp: -COLUMNS,
    Home: -i,
    End: tiles.length - 1 - i,
  };
  const d = step[event.key];
  if (d === undefined) return;
  event.preventDefault();
  tiles[Math.min(tiles.length - 1, Math.max(0, i + d))]?.focus();
}

/**
 * The app launcher (Google apps grid, Linear/Atlassian product switcher). Each product shows its
 * official mark, never recoloured; its accent appears only as the "current" marker.
 */
export function ProductSwitcher({
  products,
  current,
  onSelect,
  allHref,
  onViewAll,
  registerCommands = true,
  labels,
  children,
  className,
}: ProductSwitcherProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const select = onSelect ?? (() => {});
  useProductCommands(registerCommands ? products : [], select, current);
  const triggerLabel = labels?.trigger ?? (ar ? "التطبيقات" : "Apps");

  return (
    <Popover.Root>
      <Tooltip content={triggerLabel}>
        <Popover.Trigger
          data-slot="product-switcher-trigger"
          aria-label={triggerLabel}
          className={cn(
            "inline-flex size-control-sm items-center justify-center rounded-control text-muted-foreground outline-none",
            "transition-colors duration-150 ease-nq hover:bg-nq-hover hover:text-foreground data-popup-open:bg-nq-selected data-popup-open:text-foreground",
            "focus-visible:outline-2 focus-visible:outline-nq-focus [&_svg]:size-4",
            className,
          )}
        >
          {children ?? <LayoutGrid aria-hidden />}
        </Popover.Trigger>
      </Tooltip>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={6} className="z-50 outline-none">
          <Popover.Popup
            data-slot="product-switcher"
            className={cn(
              "w-[19rem] rounded-floating border border-border bg-popover p-1.5 text-popover-foreground shadow-floating outline-none",
              "transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0",
            )}
          >
            <Popover.Title className="px-2 pt-1.5 pb-2 text-caption font-medium text-muted-foreground">{labels?.heading ?? triggerLabel}</Popover.Title>
            <div role="group" className="grid grid-cols-3 gap-1" onKeyDown={onGridKey}>
              {products.map((p) => {
                const isCurrent = p.id === current;
                const Tile = p.href ? "a" : "button";
                return (
                  <Popover.Close
                    key={p.id}
                    nativeButton={!p.href}
                    render={<Tile {...(p.href ? { href: p.href } : { type: "button" as const })} />}
                    data-slot="product-tile"
                    aria-current={isCurrent ? "page" : undefined}
                    title={p.description}
                    onClick={() => select(p)}
                    style={{ "--product-accent": accentOf(p) ?? "var(--nq-accent)" } as React.CSSProperties}
                    className={cn(
                      "group relative flex flex-col items-center gap-1.5 rounded-control px-1 pt-3 pb-2 text-center outline-none",
                      "transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus",
                      "aria-[current]:bg-nq-selected",
                    )}
                  >
                    <span className="relative inline-flex size-10 items-center justify-center rounded-control border border-border bg-card">
                      <ProductIcon product={p} size={24} />
                      {p.badge ? (
                        <span className="absolute -end-1.5 -top-1.5 min-w-4 rounded-full bg-nq-danger-solid px-1 text-center text-[10px] leading-4 font-medium text-nq-on-danger tabular-nums">
                          {p.badge}
                        </span>
                      ) : null}
                    </span>
                    <span className="w-full truncate text-caption text-foreground">{p.name}</span>
                    {/* The brand accent marks the current product; the logo itself is never tinted. */}
                    <span aria-hidden className="absolute inset-x-5 bottom-0.5 h-0.5 rounded-full bg-(--product-accent) opacity-0 group-aria-[current]:opacity-100" />
                  </Popover.Close>
                );
              })}
            </div>
            {allHref || onViewAll ? (
              <Popover.Close
                nativeButton={!allHref}
                render={allHref ? <a href={allHref} /> : <button type="button" />}
                onClick={onViewAll}
                className="mt-1.5 flex h-9 w-full items-center justify-center gap-1.5 rounded-control border-t border-border text-body-sm text-muted-foreground outline-none hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus"
              >
                {labels?.all ?? (ar ? "كل التطبيقات" : "All apps")}
                <Icon icon={ArrowUpRight} directional className="size-3.5" />
              </Popover.Close>
            ) : null}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

export interface SidebarProductsProps {
  products: Product[];
  current?: string;
  onSelect?: (product: Product) => void;
  label?: string;
  /** Header action, e.g. a ProductSwitcher opening the full grid. */
  action?: ReactNode;
  /** Shows only pinned products (default true); falls back to all when none are pinned. */
  pinnedOnly?: boolean;
  /**
   * The user's order and choice of products, by id (e.g. `useSidebarLayout(…).visible`). Overrides
   * `pinned`. With `onMove`, the items can be dragged like the rest of the sidebar.
   */
  order?: string[];
  onMove?: (activeId: string, overId: string) => void;
}

/** The sidebar's products group: official marks, the current product selected, badges at the end. */
export function SidebarProducts({ products, current, onSelect, label, action, pinnedOnly = true, order, onMove }: SidebarProductsProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const collapsed = useSidebarCollapsed();
  const byId = new Map(products.map((p) => [p.id, p]));
  const pinned = products.filter((p) => p.pinned);
  const shown = order
    ? order.flatMap((id) => byId.get(id) ?? [])
    : pinnedOnly && pinned.length
      ? pinned
      : products;
  if (!shown.length) return null;
  const items = shown.map((p) => {
    const item = (
      <SidebarItem
        key={p.id}
        href={p.href ?? "#"}
        active={p.id === current}
        icon={<ProductIcon product={p} size={16} />}
        tooltip={collapsed ? p.name : undefined}
        trailing={p.badge ? <span className="text-caption text-muted-foreground tabular-nums">{p.badge}</span> : undefined}
        onClick={(e) => {
          if (!p.href) e.preventDefault();
          onSelect?.(p);
        }}
      >
        {p.name}
      </SidebarItem>
    );
    return onMove ? (
      <SidebarSortableItem key={p.id} id={p.id}>
        {item}
      </SidebarSortableItem>
    ) : (
      item
    );
  });
  return (
    <SidebarGroup label={label ?? (ar ? "التطبيقات" : "Apps")} action={action} collapsible>
      {onMove ? (
        <SidebarSortable ids={shown.map((p) => p.id)} onMove={onMove}>
          {items}
        </SidebarSortable>
      ) : (
        items
      )}
    </SidebarGroup>
  );
}
