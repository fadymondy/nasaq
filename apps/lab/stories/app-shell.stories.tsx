import {
  AppBreadcrumbs,
  AppCrumb,
  AppFooter,
  AppFooterLink,
  AppNav,
  AppNavItem,
  AppPageHeader,
  DropdownMenuItem,
  DropdownMenuShortcut,
  EmptyState,
  ProductMark,
  SearchTrigger,
  SidebarItem,
  SidebarStatus,
  Toggle,
  ToggleGroup,
  UserMenu,
  AppHeader,
  AppMain,
  AppShell,
  Avatar,
  Badge,
  Status,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  PageActions,
  ProductSwitcher,
  Separator,
  SidebarTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
  useNasaq,
} from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { BookOpen, ChartColumn, CloudUpload, Download, GitBranch, Globe, KeyRound, LayoutGrid, LifeBuoy, Link2, Plus, ScrollText, Server, Settings, TrendingDown, TrendingUp, UserRound } from "lucide-react";
import { useState } from "react";
import { USER, useProducts, useT } from "./_demo";
import { DemoSidebar, DemoSidebarFooter, Palette } from "./_shell";
import { NotificationsSheet } from "./_notifications";

const meta = {
  title: "Components/Layout/Pages/App Shell",
  component: AppShell,
  parameters: { layout: "fullscreen", nasaq: { fullBleed: true } },
} satisfies Meta<typeof AppShell>;
export default meta;
type Story = StoryObj<typeof meta>;

// Mixed on purpose: Arabic copy around Latin names, keys and figures, to exercise bidi.
const KPIS = [
  { title: ["Revenue", "الإيرادات"], value: "$48,210", delta: "+12.4%", up: true, note: ["Trending up this month", "في ارتفاع هذا الشهر"] },
  { title: ["Active projects", "المشاريع النشطة"], value: "23", delta: "+3", up: true, note: ["3 started this week", "بدأت 3 منها هذا الأسبوع"] },
  { title: ["Hours tracked", "الساعات المسجلة"], value: "412h", delta: "-4.1%", up: false, note: ["Down from last month", "أقل من الشهر الماضي"] },
  { title: ["AI cost", "تكلفة الذكاء الاصطناعي"], value: "$186.40", delta: "+8.0%", up: true, note: ["Across 9 projects", "عبر 9 مشاريع"] },
] as const;

const STATUS = {
  progress: { tone: "info", label: ["In progress", "قيد التنفيذ"] },
  review: { tone: "warning", label: ["In review", "قيد المراجعة"] },
  done: { tone: "success", label: ["Done", "مكتملة"] },
  todo: { tone: "neutral", label: ["Todo", "للتنفيذ"] },
  blocked: { tone: "danger", label: ["Blocked", "متوقفة"] },
} as const;

const DAY = 86_400_000;
const TODAY = new Date(2026, 8, 29);
const ISSUES = [
  { key: "MH-728", title: ["App shell v2", "هيكل التطبيق v2"], status: "progress", assignee: "Fady Mondy", due: 0 },
  { key: "MH-721", title: ["Lab + feedback SDK", "المختبر و SDK الملاحظات"], status: "review", assignee: "Fady Mondy", due: 1 },
  { key: "MH-718", title: ["Token pipeline", "خط إنتاج الرموز"], status: "done", assignee: "Nour Adel", due: -2 },
  { key: "MH-722", title: ["React Native package", "حزمة React Native"], status: "todo", assignee: "Omar Samy", due: 7 },
  { key: "MH-724", title: ["Registry + docs site", "السجل وموقع التوثيق"], status: "blocked", assignee: "Mona Hany", due: 10 },
] as const;

/** "Today", "Tomorrow", else a short date, all through Intl so Arabic gets its own forms. */
function formatDue(days: number, locale: string) {
  if (days === 0 || days === 1) return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(days, "day");
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", numberingSystem: "latn" }).format(new Date(TODAY.getTime() + days * DAY));
}

function DemoPage() {
  const t = useT();
  const products = useProducts();
  const { locale } = useNasaq();
  const l = locale.startsWith("ar") ? 1 : 0;
  const range = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric", numberingSystem: "latn" })
    .formatRange(new Date(2026, 8, 1), TODAY);
  return (
    <>
      <AppHeader>
        <SidebarTrigger />
        <Separator orientation="vertical" className="me-1" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden sm:inline-flex">
              <BreadcrumbLink href="#">3x1</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden sm:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>{t("dashboard")}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <PageActions
          className="ms-auto"
          primary={{ id: "demo.issue.new", label: t("newIssue"), icon: Plus, shortcut: "C", onSelect: () => toast(t("newIssue")) }}
          actions={[
            { id: "demo.dashboard.export", label: l ? "تصدير CSV" : "Export CSV", icon: Download, onSelect: () => toast(l ? "جارٍ التصدير" : "Exporting…") },
            { id: "demo.dashboard.share", label: l ? "نسخ الرابط" : "Copy link", icon: Link2, shortcut: "Mod Shift C", onSelect: () => toast(l ? "نُسخ الرابط" : "Link copied") },
            { id: "demo.dashboard.customise", label: l ? "تخصيص اللوحة" : "Customise dashboard", icon: LayoutGrid, group: "view", onSelect: () => toast(l ? "تخصيص" : "Customise") },
          ]}
        >
          <ProductSwitcher products={products} current="mahaam" onSelect={(p) => toast(`→ ${p.name}`)} allHref="#apps" />
          <NotificationsSheet />
        </PageActions>
      </AppHeader>
      <AppMain>
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-h2 text-foreground">{t("overview")}</h1>
            <p className="text-body-sm text-muted-foreground">{range}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {KPIS.map((k) => (
              <Card key={k.title[0]} className="gap-2 py-3.5">
                <CardHeader>
                  <CardDescription>{k.title[l]}</CardDescription>
                  <CardTitle className="text-h2 leading-tight tabular-nums">{k.value}</CardTitle>
                  <CardAction>
                    <Badge variant="outline" className="gap-1">
                      {k.up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                      <span dir="ltr">{k.delta}</span>
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardFooter className="text-caption text-muted-foreground">{k.note[l]}</CardFooter>
              </Card>
            ))}
          </div>
          <Card className="gap-2 pb-1">
            <CardHeader>
              <CardTitle>{t("recentIssues")}</CardTitle>
              <CardDescription>{t("recentIssuesHint")}</CardDescription>
              <CardAction>
                <Button size="sm">{t("viewAll")}</Button>
              </CardAction>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="ps-4">{t("colKey")}</TableHead>
                  <TableHead>{t("colTitle")}</TableHead>
                  <TableHead>{t("colStatus")}</TableHead>
                  <TableHead>{t("colAssignee")}</TableHead>
                  <TableHead className="pe-4 text-end">{t("colDue")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ISSUES.map((i) => (
                  <TableRow key={i.key}>
                    <TableCell className="ps-4 font-mono text-caption text-muted-foreground" dir="ltr">
                      {i.key}
                    </TableCell>
                    <TableCell className="font-medium">{i.title[l]}</TableCell>
                    <TableCell>
                      <Status tone={STATUS[i.status].tone}>{STATUS[i.status].label[l]}</Status>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <Avatar name={i.assignee} size="xs" />
                        {i.assignee}
                      </span>
                    </TableCell>
                    <TableCell className="pe-4 text-end text-muted-foreground first-letter:uppercase">{formatDue(i.due, locale)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      </AppMain>
      <Palette />
    </>
  );
}

/** Try ⌘K / Ctrl+K for spotlight, ⌘B / Ctrl+B to collapse the sidebar, and the language switcher for RTL. */
export const Dashboard: Story = {
  args: { sidebar: <DemoSidebar /> },
  render: (args) => (
    <AppShell {...args}>
      <DemoPage />
    </AppShell>
  ),
};

function CollapsedDemo() {
  const [collapsed, setCollapsed] = useState(true);
  return (
    <AppShell sidebar={<DemoSidebar />} collapsed={collapsed} onCollapsedChange={setCollapsed}>
      <DemoPage />
    </AppShell>
  );
}

/** The icon rail: every item keeps a tooltip and an accessible name. */
export const Collapsed: Story = {
  args: { sidebar: null },
  render: () => <CollapsedDemo />,
};

export const Mobile: Story = {
  args: { sidebar: <DemoSidebar /> },
  globals: { viewport: { value: "mobile" } },
  render: (args) => (
    <AppShell {...args}>
      <DemoPage />
    </AppShell>
  ),
};

/** `<Sidebar icons="mobile">`: a quieter text-only list on desktop. Collapse it (⌘B) and the icons come back on the rail. */
export const TextOnlyOnDesktop: Story = {
  name: "Text-only on desktop",
  args: { sidebar: <DemoSidebar icons="mobile" /> },
  render: (args) => (
    <AppShell {...args}>
      <DemoPage />
    </AppShell>
  ),
};

/** The same sidebar on a phone: the sheet keeps its icons, which help scanning a long list with a thumb. */
export const TextOnlyOnDesktopMobile: Story = {
  name: "Text-only on desktop, mobile sheet",
  args: { sidebar: <DemoSidebar icons="mobile" /> },
  globals: { viewport: { value: "mobile" } },
  render: (args) => (
    <AppShell {...args}>
      <DemoPage />
    </AppShell>
  ),
};

// ── Enterprise frames ─────────────────────────────────────────────────────────

function InsetFooter() {
  const ar = useNasaq().locale.startsWith("ar");
  return (
    <>
      <SidebarItem href="#support" icon={<LifeBuoy />}>
        {ar ? "الدعم" : "Support"}
      </SidebarItem>
      <SidebarItem href="#docs" icon={<BookOpen />}>
        {ar ? "التوثيق" : "Documentation"}
      </SidebarItem>
      <SidebarStatus href="#status">{ar ? "كل الأنظمة تعمل" : "All systems normal"}</SidebarStatus>
    </>
  );
}

/** The page on its own rounded panel, inset from the sidebar's surface (Polar, Linear, Nightwatch). Support, docs and the status line sit above the user. */
export const Inset: Story = {
  args: { sidebar: null },
  render: () => (
    <DemoSidebarFooter value={<InsetFooter />}>
      <AppShell variant="inset" sidebar={<DemoSidebar />}>
        <DemoPage />
      </AppShell>
    </DemoSidebarFooter>
  ),
};

const DEPLOYS = [
  { sha: "2a0c640", msg: ["fix(platform): seed the first operator with no configuration", "إصلاح: تهيئة أول مشغّل دون إعداد"], by: "Nour Adel", days: 28 },
  { sha: "50b02c7", msg: ["feat(platform): a super-admin console", "ميزة: لوحة المشرف العام"], by: "Omar Samy", days: 29 },
  { sha: "b687c0b", msg: ["fix(sales-deck): describe the lifecycle stages", "إصلاح: وصف مراحل دورة الحياة"], by: "Fady Mondy", days: 61 },
  { sha: "c9bb649", msg: ["fix(my-tasks): action buttons speak Arabic", "إصلاح: أزرار المهام بالعربية"], by: "Mona Hany", days: 64 },
] as const;

function TopNavApp({ empty, icons }: { empty?: boolean; icons?: "always" | "mobile" }) {
  const t = useT();
  const { locale } = useNasaq();
  const ar = locale.startsWith("ar");
  const l = ar ? 1 : 0;
  const ago = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const [tab, setTab] = useState("overview");
  const [range, setRange] = useState<readonly string[]>(["24h"]);
  const tabs = [
    ["overview", ar ? "نظرة عامة" : "Overview", LayoutGrid],
    ["deployments", ar ? "النشرات" : "Deployments", CloudUpload],
    ["resources", ar ? "الموارد" : "Resources", Server],
    ["logs", ar ? "السجلات" : "Logs", ScrollText],
    ["usage", ar ? "الاستخدام" : "Usage", ChartColumn],
    ["settings", t("settings"), Settings],
  ] as const;
  return (
    <AppShell>
      <AppHeader className="gap-3">
        <a href="#home" aria-label="Nasaq" className="flex shrink-0 items-center">
          <ProductMark size={22} title="" />
        </a>
        <AppBreadcrumbs>
          <AppCrumb
            href="#org"
            icon={<Avatar name="3x1" size="xs" />}
            tag={ar ? "مجاني" : "Free"}
            menu={
              <>
                <DropdownMenuItem>3x1</DropdownMenuItem>
                <DropdownMenuItem>One Studio</DropdownMenuItem>
                <DropdownMenuItem>Orchestra</DropdownMenuItem>
              </>
            }
          >
            3x1
          </AppCrumb>
          <AppCrumb
            href="#project"
            icon={<Avatar name="Taxflow" size="xs" />}
            menu={
              <>
                <DropdownMenuItem>taxflow</DropdownMenuItem>
                <DropdownMenuItem>lms-laravel</DropdownMenuItem>
              </>
            }
          >
            taxflow
          </AppCrumb>
          <AppCrumb
            current
            icon={<GitBranch />}
            tag={ar ? "إنتاج" : "Production"}
            tagVariant="warning"
            menu={
              <>
                <DropdownMenuItem>main</DropdownMenuItem>
                <DropdownMenuItem>dev</DropdownMenuItem>
              </>
            }
          >
            main
          </AppCrumb>
        </AppBreadcrumbs>
        <div className="ms-auto flex items-center gap-2">
          <SearchTrigger className="hidden w-52 lg:flex" />
          <SearchTrigger variant="icon" className="lg:hidden" />
          <Button variant="ghost" size="sm" className="hidden md:inline-flex">
            {ar ? "التوثيق" : "Docs"}
          </Button>
          <NotificationsSheet />
          <UserMenu variant="avatar" user={USER} onSignOut={() => toast("Signed out")}>
            <DropdownMenuItem>
              <UserRound />
              {t("account")}
              <DropdownMenuShortcut>A</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <KeyRound />
              API
              <DropdownMenuShortcut>T</DropdownMenuShortcut>
            </DropdownMenuItem>
          </UserMenu>
        </div>
      </AppHeader>
      <AppNav icons={icons}>
        {tabs.map(([id, label, Glyph]) => (
          <AppNavItem
            key={id}
            href={`#${id}`}
            icon={<Glyph />}
            active={tab === id}
            trailing={id === "logs" ? <Badge variant="accent">{ar ? "جديد" : "New"}</Badge> : undefined}
            onClick={(e) => {
              e.preventDefault();
              setTab(id);
            }}
          >
            {label}
          </AppNavItem>
        ))}
      </AppNav>
      <AppMain>
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <AppPageHeader
            icon={<Avatar name="Taxflow" size="md" />}
            title={
              <>
                taxflow <span className="text-muted-foreground">· main</span>
              </>
            }
            description={<bdi dir="ltr">taxflow-main.nasaq.cloud</bdi>}
            actions={
              <>
                <ToggleGroup value={range} onValueChange={(v) => v.length && setRange(v)} aria-label={ar ? "المدة" : "Range"}>
                  {["1h", "24h", "7d", "30d"].map((r) => (
                    <Toggle key={r} value={r} className="uppercase">
                      {r}
                    </Toggle>
                  ))}
                </ToggleGroup>
                <Button variant="secondary" size="sm">
                  <Globe />
                  {ar ? "زيارة" : "Visit"}
                </Button>
                <Button variant="primary" size="sm">
                  <CloudUpload />
                  {ar ? "نشر" : "Deploy"}
                </Button>
              </>
            }
          />
          {empty ? (
            <Card>
              <EmptyState
                icon={Server}
                title={ar ? "لا خوادم بعد" : "No servers yet"}
                description={ar ? "اشترك لتنشئ أول خادم." : "Subscribe to create your first server."}
                actions={<Button variant="primary">{ar ? "اشترك" : "Subscribe"}</Button>}
              />
            </Card>
          ) : (
            <Card className="gap-0 py-0">
              <CardHeader className="border-b border-border py-3">
                <CardTitle>{ar ? "آخر النشرات" : "Latest deployments"}</CardTitle>
              </CardHeader>
              <ul className="divide-y divide-border">
                {DEPLOYS.map((d) => (
                  <li key={d.sha} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-body-sm">
                    <Status tone="success">{ar ? "جاهز" : "Ready"}</Status>
                    <code className="font-mono text-caption text-muted-foreground" dir="ltr">
                      {d.sha}
                    </code>
                    <span className="min-w-0 flex-1 truncate text-foreground">{d.msg[l]}</span>
                    <span className="text-caption text-muted-foreground">
                      {d.by} · {ago.format(-d.days, "day")}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </AppMain>
      <AppFooter start={<span>© 2026 3x1</span>}>
        <AppFooterLink href="#status">{ar ? "الحالة" : "Status"}</AppFooterLink>
        <AppFooterLink href="#changelog">{ar ? "التحديثات" : "Changelog"}</AppFooterLink>
        <AppFooterLink href="#docs">{ar ? "التوثيق" : "Docs"}</AppFooterLink>
        <AppFooterLink href="#help">{ar ? "المساعدة" : "Help"}</AppFooterLink>
        <AppFooterLink href="#legal">{ar ? "الشروط" : "Legal"}</AppFooterLink>
      </AppFooter>
      <Palette />
    </AppShell>
  );
}

/** No sidebar: the path with switchers and tags in the header, section tabs under it, a title row with the range and the main action, and a footer (Laravel Cloud, Forge, Supabase). */
export const TopNavigation: Story = {
  name: "Top navigation",
  args: { sidebar: null },
  render: () => <TopNavApp />,
};

/** The same frame on an empty page: one icon, one sentence, one button. */
export const TopNavigationEmpty: Story = {
  name: "Top navigation, empty page",
  args: { sidebar: null },
  render: () => <TopNavApp empty />,
};

/** Below md the tabs move to a bottom bar: four fit, the rest open from "More" in a drawer. */
export const TopNavigationMobile: Story = {
  name: "Top navigation, mobile",
  args: { sidebar: null },
  globals: { viewport: { value: "mobile" } },
  render: () => <TopNavApp />,
};

/** `<AppNav icons="mobile">`: text-only tabs on desktop; the phone bar and its drawer still get their icons. */
export const TopNavigationTextOnly: Story = {
  name: "Top navigation, text-only tabs",
  args: { sidebar: null },
  render: () => <TopNavApp icons="mobile" />,
};
