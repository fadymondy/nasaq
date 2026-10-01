/* The shared product shell for pattern and validation stories: sidebar, palette. */
import {
  CommandPalette,
  DropdownMenuItem,
  ProductIcon,
  ProductSwitcher,
  SearchTrigger,
  Sidebar,
  SidebarContent,
  SidebarCustomize,
  SidebarFooter,
  SidebarGroup,
  SidebarBrand,
  SidebarHeader,
  SidebarItem,
  type SidebarLayout,
  SidebarNest,
  SidebarProducts,
  SidebarSortable,
  SidebarSortableItem,
  SidebarSubItem,
  toast,
  useAppShell,
  useNasaq,
  useRegisterCommandSource,
  useRegisterCommands,
  useSidebarLayout,
  UserMenu,
  WorkspaceSwitcher,
} from "@nasaq/web";
import { Bell, CreditCard, type LucideIcon, SlidersHorizontal, UserRound } from "lucide-react";
import { createContext, type ReactNode, use, useState } from "react";
import { ICONS, type StringKey, USER, useDemoCommands, useDemoIssueSource, useProducts, useT, useWorkspaces } from "./_demo";

type NavItem = { id: string; label: string; icon: ReactNode; required?: boolean; render?: () => ReactNode };

/** Extra content for the sidebar footer, above the user menu (an upgrade card). Wrap the `AppShell` in it. */
export const DemoSidebarFooter = createContext<ReactNode>(null);

/** Which main-nav destination the page is on. */
export type DemoPage = "dashboard" | "inbox" | "my-issues" | "store";

/** One destination in a product's own navigation. */
export type ProductNavItem = { id: string; label: string; icon: LucideIcon; trailing?: string; required?: boolean };

/**
 * A product's own navigation, for validation screens of products other than Mahaam: the main list and
 * any labelled groups below it. Everything else in the shell (workspace, search, apps, user) stays shared.
 */
export type ProductNav = { main: ProductNavItem[]; group?: { label: string; items: ProductNavItem[] } };

/**
 * The product shell every pattern story shares: workspace, search, main nav, workspace nav, pinned products
 * and the user menu. `active` marks the current destination, so a page such as the App Store renders inside
 * the same frame as the dashboard rather than a sidebar of its own.
 */
export function DemoSidebar({
  active = "dashboard",
  product = "mahaam",
  nav,
  icons,
}: {
  active?: DemoPage | (string & {});
  /** The product whose screen this is: marked current in the switcher and the apps list. */
  product?: string;
  /** Replaces Mahaam's main and workspace navigation with the product's own. */
  nav?: ProductNav;
  /** Passed to `Sidebar`: `mobile` keeps the desktop column text-only. */
  icons?: "always" | "mobile";
}) {
  return (
    <SidebarIconsContext.Provider value={icons}>
      {nav ? <ProductSidebar active={active} product={product} nav={nav} /> : <MahaamSidebar active={active} />}
    </SidebarIconsContext.Provider>
  );
}

const SidebarIconsContext = createContext<"always" | "mobile" | undefined>(undefined);

function ProductSidebar({ active, product, nav }: { active: string; product: string; nav: ProductNav }) {
  const toItem = (i: ProductNavItem): NavItem => ({
    id: i.id,
    label: i.label,
    icon: <i.icon />,
    required: i.required,
    render: () => (
      <SidebarItem href="#" icon={<i.icon />} trailing={i.trailing} active={active === i.id}>
        {i.label}
      </SidebarItem>
    ),
  });
  return (
    <ShellSidebar
      product={product}
      main={nav.main.map(toItem)}
      work={nav.group?.items.map(toItem) ?? []}
      workLabel={nav.group?.label}
    />
  );
}

function MahaamSidebar({ active }: { active: string }) {
  const t = useT();

  const item = (id: DemoPage, key: StringKey, Icon: LucideIcon, trailing?: string) => ({
    id,
    label: t(key),
    icon: <Icon />,
    render: () => (
      <SidebarItem href="#" icon={<Icon />} trailing={trailing} active={active === id}>
        {t(key)}
      </SidebarItem>
    ),
  });
  const main: NavItem[] = [
    { ...item("dashboard", "dashboard", ICONS.LayoutDashboard), required: true },
    item("inbox", "inbox", ICONS.Inbox, "12"),
    item("my-issues", "myIssues", ICONS.ListTodo, "4"),
    item("store", "appStore", ICONS.Store),
  ];
  const work: NavItem[] = [
    {
      id: "projects",
      label: t("projects"),
      icon: <ICONS.FolderKanban />,
      render: () => (
        <SidebarNest label={t("projects")} icon={<ICONS.FolderKanban />} defaultOpen>
          <SidebarSubItem href="#">{t("allProjects")}</SidebarSubItem>
          <SidebarSubItem href="#">{t("active")}</SidebarSubItem>
          <SidebarSubItem href="#">{t("archived")}</SidebarSubItem>
        </SidebarNest>
      ),
    },
    { id: "time", label: t("time"), icon: <ICONS.Timer />, render: () => <SidebarItem href="#" icon={<ICONS.Timer />}>{t("time")}</SidebarItem> },
    { id: "teams", label: t("teams"), icon: <ICONS.Users />, render: () => <SidebarItem href="#" icon={<ICONS.Users />}>{t("teams")}</SidebarItem> },
  ];
  return <ShellSidebar product="mahaam" main={main} work={work} workLabel={t("workspace")} />;
}

/** The frame shared by every product: workspace, search, the product's nav, apps and the user. */
function ShellSidebar({ product, main, work, workLabel }: { product: string; main: NavItem[]; work: NavItem[]; workLabel?: string }) {
  const t = useT();
  const workspaces = useWorkspaces();
  const [workspace, setWorkspace] = useState("3x1");
  const [customizing, setCustomizing] = useState(false);
  // Products replace the old Favourites: official marks, pinned by the user, the full grid one click away.
  const products = useProducts();
  const apps: NavItem[] = products.map((p) => ({ id: p.id, label: p.name, icon: <ProductIcon product={p} size={16} /> }));

  // Mahaam keeps its original storage keys; other products get their own, so layouts never collide.
  const key = (name: string) => (product === "mahaam" ? `nasaq-demo-nav-${name}` : `nasaq-demo-${product}-nav-${name}`);
  const mainLayout = useSidebarLayout(product === "mahaam" ? key("main-v2") : key("main"), main.map((i) => i.id));
  const workLayout = useSidebarLayout(key("workspace"), work.map((i) => i.id));
  // Default: the pinned products and the current one shown, the rest available in Customize sidebar.
  const appsLayout = useSidebarLayout(key("apps"), apps.map((i) => i.id), {
    defaultHidden: products.filter((p) => !p.pinned && p.id !== product).map((p) => p.id),
  });

  const list = (items: NavItem[], layout: SidebarLayout) => {
    const byId = new Map(items.map((i) => [i.id, i]));
    return (
      <SidebarSortable ids={layout.visible} onMove={layout.move}>
        {layout.visible.map((id) => (
          <SidebarSortableItem key={id} id={id}>
            {byId.get(id)?.render?.()}
          </SidebarSortableItem>
        ))}
      </SidebarSortable>
    );
  };

  return (
    <Sidebar icons={use(SidebarIconsContext)}>
      <SidebarHeader>
        <SidebarBrand href="#home" />
        <WorkspaceSwitcher
          workspaces={workspaces}
          value={workspace}
          onValueChange={setWorkspace}
          onCreate={() => toast("Create workspace")}
        />
        <SearchTrigger label={t("search")} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>{list(main, mainLayout)}</SidebarGroup>
        {workLayout.visible.length ? (
          <SidebarGroup label={workLabel} collapsible>
            {list(work, workLayout)}
          </SidebarGroup>
        ) : null}
        <SidebarProducts
          products={products}
          current={product}
          label={t("apps")}
          order={appsLayout.visible}
          onMove={appsLayout.move}
          onSelect={(p) => toast(`→ ${p.name}`)}
          action={
            <ProductSwitcher
              products={products}
              current={product}
              registerCommands={false}
              onSelect={(p) => toast(`→ ${p.name}`)}
              allHref="#apps"
              className="size-6"
            />
          }
        />
      </SidebarContent>
      <SidebarFooter>
        {use(DemoSidebarFooter)}
        {/* Settings and help live in the user menu; the footer is just the user. */}
        <UserMenu user={USER} onSignOut={() => toast("Signed out")}>
          <DropdownMenuItem>
            <UserRound />
            {t("account")}
          </DropdownMenuItem>
          <DropdownMenuItem>
            <CreditCard />
            {t("billing")}
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Bell />
            {t("notifications")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setCustomizing(true)}>
            <SlidersHorizontal />
            {t("customizeSidebar")}
          </DropdownMenuItem>
          <DropdownMenuItem>
            <ICONS.Settings />
            {t("settings")}
          </DropdownMenuItem>
          <DropdownMenuItem>
            <ICONS.CircleHelp />
            {t("help")}
          </DropdownMenuItem>
        </UserMenu>
      </SidebarFooter>
      <SidebarCustomize
        open={customizing}
        onOpenChange={setCustomizing}
        sections={[
          { id: "main", items: main, layout: mainLayout },
          ...(work.length ? [{ id: "workspace", label: workLabel, items: work, layout: workLayout }] : []),
          { id: "apps", label: t("apps"), items: apps, layout: appsLayout },
        ]}
        labels={{
          title: t("customizeSidebar"),
          description: t("customizeHint"),
          reset: t("resetDefault"),
          done: t("done"),
          reorder: (label) => `${t("reorder")} ${label}`,
          moved: (label, n, total) => t("movedTo").replace("{label}", label).replace("{n}", String(n)).replace("{total}", String(total)),
          close: t("close"),
        }}
      />
    </Sidebar>
  );
}

const notify = (m: string) => {
  toast(m);
};

/** The command palette with the demo commands and the issue search registered. Mount once per page. */
export function Palette() {
  const { setTheme, resolvedTheme, setLocale, locale } = useNasaq();
  const { toggleSidebar } = useAppShell();
  useRegisterCommands(useDemoCommands({ setTheme, resolvedTheme, setLocale, locale, toggleSidebar, toast: notify }));
  useRegisterCommandSource(useDemoIssueSource(notify));
  return <CommandPalette />;
}
