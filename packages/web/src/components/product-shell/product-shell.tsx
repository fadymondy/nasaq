"use client";

import { Menu } from "lucide-react";
import { type ElementType, type MouseEvent, type ReactNode, createElement, useMemo } from "react";
import { cn } from "../../lib/cn";
import { useAuthLocale } from "../auth-layout/auth-utils";
import { AppHeader, AppMain, AppShell, Sidebar, SidebarBrand, SidebarContent, SidebarFooter, SidebarGroup, SidebarHeader, SidebarItem, SidebarTrigger, useAppShell } from "../app-shell";
import { CommandPalette, SearchTrigger } from "../command-palette";
import { type Command, useRegisterCommands } from "../commands";
import { BottomTabBar } from "../mobile-nav-kit";
import { type ProductNavInput, type ResolvedNavGroup, activeNavId, pickMobileTabs, productNavGroups } from "./product-nav";

const STRINGS = {
  en: { reports: "Reports", integrations: "Integrations", settings: "Settings", search: "Search…", more: "More", menu: "Main menu" },
  ar: { reports: "التقارير", integrations: "التكاملات", settings: "الإعدادات", search: "بحث…", more: "المزيد", menu: "القائمة الرئيسية" },
};

export type ProductShellLabels = (typeof STRINGS)["en"];

export interface ProductShellBrand {
  /** The product name, used as the accessible name of the home link. */
  label: string;
  href: string;
  /** The full lockup, shown in the open sidebar. */
  logo?: ReactNode;
  /** The square mark, shown in the collapsed rail. */
  mark?: ReactNode;
}

export interface ProductShellProps {
  brand: ProductShellBrand;
  /** The menu, in sections. The shell puts them in the standard order. */
  nav: ProductNavInput;
  /** The current path, from your router (`usePathname()`). */
  pathname: string;
  /** Your router's link (`next/link`). Menu items render through it, so navigation stays client-side. Default `<a>`. */
  linkComponent?: ElementType;
  /** Client-side navigation for tabs and ⌘K (`router.push`). Default a full page load. */
  onNavigate?: (href: string) => void;
  /** Under the brand: the `WorkspaceSwitcher`. */
  workspace?: ReactNode;
  /** The sidebar footer: the account menu. */
  account?: ReactNode;
  /** Header start: breadcrumbs or the page title. */
  headerStart?: ReactNode;
  /** Header end, before the Connect pill: a product action such as "View store". */
  headerEnd?: ReactNode;
  /** The Connect pill (`McpConnectSheet`). Always last in the header. */
  connect?: ReactNode;
  /** A strip above the page, such as a trial or impersonation banner. */
  banner?: ReactNode;
  /** More ⌘K commands next to the menu ones (other workspaces, the console). */
  commands?: Command[];
  /** Item ids for the phone tab bar, at most 4. Default the first four. More opens the menu. */
  mobileTabs?: string[];
  /** Default `inset`, the family look. */
  variant?: "plain" | "inset";
  /** Width cap of the page column. Default `max-w-6xl`; pass `max-w-none` for full width. */
  contentClassName?: string;
  labels?: Partial<ProductShellLabels>;
  children: ReactNode;
}

const isPlainClick = (e: MouseEvent) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

/**
 * The shell every Nasaq product uses: the AppShell sidebar with the brand, the workspace switcher,
 * search and the menu in the standard order (Dashboard → product groups → Reports → Integrations → Settings),
 * a header with the Connect pill last, ⌘K listing every menu item, and a phone tab bar with More.
 */
export function ProductShell({
  brand,
  nav,
  pathname,
  linkComponent,
  onNavigate,
  workspace,
  account,
  headerStart,
  headerEnd,
  connect,
  banner,
  commands,
  mobileTabs,
  variant = "inset",
  contentClassName,
  labels: labelsProp,
  children,
}: ProductShellProps) {
  const t = { ...STRINGS[useAuthLocale()], ...labelsProp };
  const groups = useMemo(() => productNavGroups(nav, t), [nav, t.reports, t.integrations, t.settings]);
  const active = activeNavId(groups, pathname);
  const navigate = (href: string) => (onNavigate ? onNavigate(href) : window.location.assign(href));
  const linkProps = (href: string) =>
    linkComponent ? { render: createElement(linkComponent, { href }) } : { href, onClick: onNavigate ? (e: MouseEvent) => isPlainClick(e) && (e.preventDefault(), onNavigate(href)) : undefined };

  return (
    <AppShell
      variant={variant}
      sidebar={
        <Sidebar aria-label={t.menu}>
          <SidebarHeader>
            <SidebarBrand label={brand.label} logo={brand.logo} mark={brand.mark} {...(linkProps(brand.href) as object)} />
            {workspace}
            <SearchTrigger label={t.search} className="mt-2 w-full" />
          </SidebarHeader>
          <SidebarContent>
            {groups.map((g) => (
              <SidebarGroup key={g.id} label={g.label} data-section={g.section}>
                {g.items.map((item) => (
                  <SidebarItem
                    key={item.id}
                    data-nav-id={item.id}
                    active={item.id === active}
                    icon={item.icon ? createElement(item.icon, { className: "size-4", "aria-hidden": true }) : undefined}
                    trailing={item.badge === 0 || item.badge === "" ? undefined : item.badge}
                    {...(linkProps(item.href) as object)}
                  >
                    {item.label}
                  </SidebarItem>
                ))}
              </SidebarGroup>
            ))}
          </SidebarContent>
          {account ? <SidebarFooter>{account}</SidebarFooter> : null}
        </Sidebar>
      }
    >
      <AppHeader>
        <SidebarTrigger />
        <div className="flex min-w-0 flex-1 items-center gap-2">{headerStart}</div>
        <div className="flex items-center gap-2">
          {headerEnd}
          <SearchTrigger variant="icon" label={t.search} className="md:hidden" />
          {connect}
        </div>
      </AppHeader>
      {banner}
      <AppMain>
        <div className={cn("mx-auto w-full max-w-6xl pb-24 md:pb-0", contentClassName)}>{children}</div>
      </AppMain>
      <ProductTabs groups={groups} ids={mobileTabs} active={active} navigate={navigate} more={t.more} />
      <ProductCommands groups={groups} extra={commands} navigate={navigate} />
      <CommandPalette hotkey />
    </AppShell>
  );
}

function ProductTabs({ groups, ids, active, navigate, more }: { groups: ResolvedNavGroup[]; ids?: string[]; active?: string; navigate: (href: string) => void; more: string }) {
  const shell = useAppShell();
  const tabs = pickMobileTabs(groups, ids);
  const value = tabs.some((i) => i.id === active) ? active! : "more";
  return (
    <BottomTabBar
      className="md:hidden"
      position="fixed"
      value={value}
      onValueChange={(v) => {
        if (v === "more") return shell.setMobileOpen(true);
        const item = tabs.find((i) => i.id === v);
        if (item) navigate(item.href);
      }}
      items={[...tabs.map((i) => ({ value: i.id, label: i.label, icon: i.icon ?? Menu, badge: i.badge })), { value: "more", label: more, icon: Menu }]}
    />
  );
}

function ProductCommands({ groups, extra, navigate }: { groups: ResolvedNavGroup[]; extra?: Command[]; navigate: (href: string) => void }) {
  const commands = useMemo<Command[]>(
    () => [
      ...groups.flatMap((g) =>
        g.items.map((i) => ({
          id: `nav.${i.id}`,
          label: i.label,
          section: "navigation",
          hint: g.label,
          icon: i.icon ? createElement(i.icon, { className: "size-4" }) : undefined,
          keywords: [i.id, ...(g.label ? [g.label] : []), ...(i.keywords ?? [])],
          perform: () => navigate(i.href),
        })),
      ),
      ...(extra ?? []),
    ],
    // `navigate` is recreated each render; the hrefs are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groups, extra],
  );
  useRegisterCommands(commands);
  return null;
}

export {
  PRODUCT_NAV_SECTIONS,
  PRODUCT_SETTINGS_ORDER,
  type ProductNavSection,
  type ProductNavItem,
  type ProductNavGroup,
  type ProductNavInput,
  type ProductNavLabels,
  type ResolvedNavGroup,
  productNavGroups,
  sortSettings,
  sortIntegrations,
  isNavActive,
  activeNavId,
  pickMobileTabs,
  productNavProblems,
} from "./product-nav";
