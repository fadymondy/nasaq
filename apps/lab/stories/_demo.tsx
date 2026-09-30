/* Shared fixtures for the pattern stories. Bilingual so the language switcher visibly works. */
import { type Command, type CommandSource, type Product, ProductMark, useNasaq, type Workspace } from "@nasaq/web";
import { useMemo } from "react";
import {
  Bell,
  CircleDot,
  CircleHelp,
  FilePlus2,
  FolderKanban,
  FolderPlus,
  Inbox,
  Languages,
  LayoutDashboard,
  ListTodo,
  type LucideIcon,
  Monitor,
  Moon,
  PanelLeft,
  Settings,
  Sparkles,
  Store,
  Sun,
  Timer,
  Users,
} from "lucide-react";

const STRINGS = {
  search: { en: "Search…", ar: "بحث…" },
  dashboard: { en: "Dashboard", ar: "لوحة التحكم" },
  inbox: { en: "Inbox", ar: "الوارد" },
  myIssues: { en: "My issues", ar: "مهامي" },
  workspace: { en: "Workspace", ar: "مساحة العمل" },
  projects: { en: "Projects", ar: "المشاريع" },
  allProjects: { en: "All projects", ar: "كل المشاريع" },
  active: { en: "Active", ar: "النشطة" },
  archived: { en: "Archived", ar: "المؤرشفة" },
  time: { en: "Time tracking", ar: "تتبع الوقت" },
  teams: { en: "Teams", ar: "الفرق" },
  apps: { en: "Apps", ar: "التطبيقات" },
  appStore: { en: "App Store", ar: "متجر التطبيقات" },
  help: { en: "Help & feedback", ar: "المساعدة والملاحظات" },
  settings: { en: "Settings", ar: "الإعدادات" },
  account: { en: "Account", ar: "الحساب" },
  billing: { en: "Billing", ar: "الفوترة" },
  notifications: { en: "Notifications", ar: "الإشعارات" },
  newIssue: { en: "New issue", ar: "مهمة جديدة" },
  overview: { en: "Overview", ar: "نظرة عامة" },
  navigation: { en: "Navigation", ar: "التنقل" },
  actions: { en: "Actions", ar: "إجراءات" },
  language: { en: "Change language to Arabic", ar: "تغيير اللغة إلى الإنجليزية" },
  newProject: { en: "New project", ar: "مشروع جديد" },
  aiSummarise: { en: "Summarise my week", ar: "لخّص أسبوعي" },
  changeTheme: { en: "Change theme…", ar: "تغيير المظهر…" },
  themeLight: { en: "Light", ar: "فاتح" },
  themeDark: { en: "Dark", ar: "داكن" },
  themeSystem: { en: "System", ar: "حسب النظام" },
  toggleSidebar: { en: "Toggle sidebar", ar: "إظهار/إخفاء الشريط الجانبي" },
  project: { en: "Project", ar: "مشروع" },
  recentIssues: { en: "Recent issues", ar: "أحدث المهام" },
  recentIssuesHint: { en: "Updated in the last 7 days", ar: "حُدّثت خلال آخر 7 أيام" },
  viewAll: { en: "View all", ar: "عرض الكل" },
  colKey: { en: "Key", ar: "المعرّف" },
  colTitle: { en: "Title", ar: "العنوان" },
  colStatus: { en: "Status", ar: "الحالة" },
  colAssignee: { en: "Assignee", ar: "المسؤول" },
  colDue: { en: "Due", ar: "الاستحقاق" },
  customizeSidebar: { en: "Customize sidebar", ar: "تخصيص الشريط الجانبي" },
  customizeHint: { en: "Drag to reorder. Switch items off to hide them.", ar: "اسحب لإعادة الترتيب، وأوقف العناصر لإخفائها." },
  resetDefault: { en: "Reset to default", ar: "استعادة الافتراضي" },
  done: { en: "Done", ar: "تم" },
  reorder: { en: "Reorder", ar: "إعادة ترتيب" },
  close: { en: "Close", ar: "إغلاق" },
  movedTo: { en: "{label}, position {n} of {total}", ar: "{label}، الموضع {n} من {total}" },
  resizeSidebar: { en: "Resize sidebar", ar: "تغيير عرض الشريط الجانبي" },
} as const;

export type StringKey = keyof typeof STRINGS;

export function useT() {
  const { locale } = useNasaq();
  const ar = locale.startsWith("ar");
  return (key: StringKey) => STRINGS[key][ar ? "ar" : "en"];
}

export const ICONS = { LayoutDashboard, Inbox, ListTodo, FolderKanban, Timer, Users, Settings, CircleHelp, Bell, Store };

export const WORKSPACES: Workspace[] = [
  { id: "3x1", name: "3x1", description: "Pro · 12 members", logo: <ProductMark brand="fadymondy" size={18} title="" /> },
  { id: "mahaam", name: "Mahaam", description: "Team · 5 members", logo: <ProductMark brand="mahaam" size={18} title="" /> },
  { id: "zekra", name: "Zekra Labs", description: "Free", logo: <ProductMark brand="zekra" size={18} title="" /> },
  { id: "personal", name: "Fady Mondy", description: "Personal" },
];

const WORKSPACE_PLANS_AR: Record<string, string> = {
  "3x1": "احترافي · 12 عضوًا",
  mahaam: "فريق · 5 أعضاء",
  zekra: "مجاني",
  personal: "شخصي",
};

/** WORKSPACES with the plan line in the active language. */
export function useWorkspaces(): Workspace[] {
  const { locale } = useNasaq();
  if (!locale.startsWith("ar")) return WORKSPACES;
  return WORKSPACES.map((w) => ({ ...w, description: WORKSPACE_PLANS_AR[w.id] ?? w.description }));
}

export const USER ={ name: "Fady Mondy", email: "hello@example.com" };

/** Real product identities; names come from the host, already localised. The first three are pinned. */
export function useProducts(): Product[] {
  const ar = useNasaq().locale.startsWith("ar");
  return useMemo(
    () => [
      { id: "mahaam", brand: "mahaam", name: ar ? "مهام" : "Mahaam", description: "Projects, issues, time", pinned: true, badge: 3 },
      { id: "zekra", brand: "zekra", name: ar ? "ذكرة" : "Zekra", description: "Memory for AI agents", pinned: true },
      { id: "nasaq", brand: "nasaq", name: ar ? "نسق" : "Nasaq", description: "Design system", pinned: true },
      { id: "moharrik", brand: "moharrik", name: ar ? "محرّك" : "Moharrik", description: "Automation" },
      { id: "circlexo", brand: "circlexo", name: "CircleXO", description: "App store" },
      { id: "hosbah", brand: "hosbah", name: ar ? "حوسبة" : "Hosbah", description: "Cloud" },
      { id: "seatfor", brand: "seatfor", name: "SeatFor", description: "Bookings" },
      { id: "orchestra", brand: "orchestra", name: ar ? "اوركيسترا" : "Orchestra", description: "Agents" },
      { id: "health-debug", brand: "health-debug", name: "Health Debug", description: "Health" },
    ],
    [ar],
  );
}

/**
 * The demo product's commands, as a product would register them: plain data plus callbacks.
 * Nasaq only ranks and renders them.
 */
export function useDemoCommands(opts: {
  setTheme: (t: "light" | "dark" | "system") => void;
  resolvedTheme: string;
  setLocale: (l: string) => void;
  locale: string;
  toggleSidebar?: () => void;
  toast: (m: string) => void;
}): Command[] {
  const t = useT();
  const ar = opts.locale.startsWith("ar");
  const dark = opts.resolvedTheme === "dark";
  const { setTheme, setLocale, locale, toggleSidebar, toast } = opts;
  return useMemo<Command[]>(() => {
    const go = (label: string) => () => toast(`→ ${label}`);
    const nav = (id: string, key: StringKey, icon: LucideIcon, shortcut: string, keywords?: string[]): Command => ({
      id: `demo.go.${id}`,
      section: "navigation",
      label: t(key),
      icon,
      shortcut,
      keywords,
      perform: go(t(key)),
    });
    return [
      nav("dashboard", "dashboard", LayoutDashboard, "G D", ["home", "overview", "الرئيسية"]),
      nav("inbox", "inbox", Inbox, "G I"),
      nav("my-issues", "myIssues", ListTodo, "G M"),
      nav("projects", "projects", FolderKanban, "G P"),
      nav("time", "time", Timer, "G T"),
      nav("settings", "settings", Settings, "G S"),
      { id: "demo.new.issue", section: "create", label: t("newIssue"), icon: FilePlus2, shortcut: "C", priority: 1, perform: () => toast(t("newIssue")) },
      { id: "demo.new.project", section: "create", label: t("newProject"), icon: FolderPlus, perform: () => toast(t("newProject")) },
      {
        id: "demo.ai.summary",
        section: "ai",
        label: t("aiSummarise"),
        icon: Sparkles,
        keywords: ["ai", "summary", "ملخص"],
        perform: () => toast(t("aiSummarise")),
      },
      {
        id: "demo.system.theme",
        section: "system",
        label: t("changeTheme"),
        icon: dark ? Moon : Sun,
        keywords: ["theme", "dark", "light", "مظهر", "داكن", "فاتح"],
        children: [
          { id: "demo.theme.light", label: t("themeLight"), icon: Sun, perform: () => setTheme("light") },
          { id: "demo.theme.dark", label: t("themeDark"), icon: Moon, perform: () => setTheme("dark") },
          { id: "demo.theme.system", label: t("themeSystem"), icon: Monitor, perform: () => setTheme("system") },
        ],
      },
      {
        id: "demo.system.language",
        section: "system",
        label: t("language"),
        icon: Languages,
        keywords: ["language", "arabic", "english", "لغة", "عربي"],
        perform: () => setLocale(locale.startsWith("ar") ? "en" : "ar"),
      },
      ...(toggleSidebar
        ? [{ id: "demo.system.sidebar", section: "system", label: t("toggleSidebar"), icon: PanelLeft, shortcut: "⌘ B", bindShortcut: false, perform: toggleSidebar } satisfies Command]
        : []),
    ];
    // t is derived from locale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ar, dark, setTheme, setLocale, locale, toggleSidebar, toast]);
}

const SEARCHABLE = [
  { key: "MH-728", en: "App shell v2", ar: "هيكل التطبيق v2" },
  { key: "MH-721", en: "Lab + feedback SDK", ar: "المختبر و SDK الملاحظات" },
  { key: "MH-718", en: "Token pipeline", ar: "خط إنتاج الرموز" },
  { key: "MH-722", en: "React Native package", ar: "حزمة React Native" },
  { key: "MH-724", en: "Registry + docs site", ar: "السجل وموقع التوثيق" },
];

/** A fake remote search over issues (300 ms latency), registered with useRegisterCommandSource. */
export function useDemoIssueSource(toast: (m: string) => void): CommandSource {
  const { locale } = useNasaq();
  const ar = locale.startsWith("ar");
  return useMemo(
    () => ({
      id: "demo.issues",
      debounce: 200,
      search: (query, signal) =>
        new Promise<Command[]>((resolve) => {
          const timer = setTimeout(() => {
            const q = query.toLowerCase();
            resolve(
              SEARCHABLE.filter((i) => i.key.toLowerCase().includes(q) || i.en.toLowerCase().includes(q) || i.ar.includes(query)).map((i) => ({
                id: `demo.issue.${i.key}`,
                label: ar ? i.ar : i.en,
                icon: CircleDot,
                hint: i.key,
                perform: () => toast(i.key),
              })),
            );
          }, 300);
          signal.addEventListener("abort", () => clearTimeout(timer));
        }),
    }),
    [ar, toast],
  );
}
