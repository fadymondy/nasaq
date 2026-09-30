/*
 * Shared demo data and page bodies for batch W1: the desktop shell, the extension popup, glance surfaces and the
 * mobile nav kit. Nothing here talks to a server; names and numbers are invented.
 */
import {
  BottomTabBar,
  Button,
  DesktopAppIcon,
  type DesktopApp,
  type DesktopMenu,
  DesktopShell,
  ExtensionConnect,
  ExtensionMiniCard,
  ExtensionOptionRow,
  ExtensionOptionsPage,
  ExtensionPopup,
  ExtensionQuickActions,
  FilterStrip,
  GlanceRow,
  ProductLogo,
  Progress,
  Switch,
  SwipeActionRow,
  TrayPopover,
  useNasaq,
  WatchGlance,
  type WidgetDefinition,
  WidgetGallery,
  WidgetTile,
} from "@nasaq/web";
import {
  Archive,
  BatteryFull,
  Bell,
  CalendarDays,
  CheckCheck,
  Clock3,
  Coffee,
  Droplets,
  ExternalLink,
  FileText,
  Folder,
  Footprints,
  Home,
  Inbox,
  LogOut,
  Mail,
  Pin,
  Settings,
  Star,
  Terminal,
  Trash2,
  User,
  Wifi,
} from "lucide-react";
import { useState } from "react";

export const useAr = () => useNasaq().locale.startsWith("ar");
const tx = (ar: boolean, en: string, arText: string) => (ar ? arText : en);
export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------------------------------------ desktop */

function NotesBody({ ar }: { ar: boolean }) {
  return (
    <div className="flex h-full flex-col gap-2 p-4 text-body">
      <h2 className="text-h3">{tx(ar, "Sprint notes", "ملاحظات السبرنت")}</h2>
      <ul className="list-disc ps-5 text-muted-foreground">
        <li>{tx(ar, "Ship the desktop shell", "إطلاق واجهة سطح المكتب")}</li>
        <li>{tx(ar, "Review the RTL snap zones", "مراجعة مناطق الالتصاق في RTL")}</li>
        <li>{tx(ar, "Drag this window to an edge", "اسحب هذه النافذة إلى الحافة")}</li>
      </ul>
    </div>
  );
}

function FilesBody({ ar }: { ar: boolean }) {
  const rows = [
    [tx(ar, "Invoices", "الفواتير"), "24"],
    [tx(ar, "Contracts", "العقود"), "9"],
    [tx(ar, "Designs", "التصاميم"), "112"],
    [tx(ar, "Backups", "النسخ الاحتياطية"), "6"],
  ];
  return (
    <ul className="divide-y divide-border">
      {rows.map(([name, count]) => (
        <li key={name} className="flex items-center gap-3 px-4 py-2.5 text-body">
          <Folder aria-hidden className="size-4 text-primary" />
          <span className="flex-1">{name}</span>
          <span className="tabular-nums text-muted-foreground">{count}</span>
        </li>
      ))}
    </ul>
  );
}

function TerminalBody() {
  return (
    <pre dir="ltr" className="h-full bg-foreground p-4 font-mono text-caption leading-6 text-background">
      {"$ pnpm build\n> nasaq@1.0.0 build\n✓ registry built (412 items)\n$ "}
    </pre>
  );
}

function SettingsBody({ ar }: { ar: boolean }) {
  const [on, setOn] = useState(true);
  return (
    <div className="flex flex-col gap-3 p-4">
      <ExtensionOptionRow label={tx(ar, "Show seconds in the clock", "إظهار الثواني في الساعة")} control={<Switch checked={on} onCheckedChange={setOn} aria-label={tx(ar, "Show seconds", "إظهار الثواني")} />} />
      <p className="text-caption text-muted-foreground">{tx(ar, "Settings are local to this demo.", "الإعدادات محلية لهذا العرض.")}</p>
    </div>
  );
}

export const desktopApps = (ar: boolean): DesktopApp[] => [
  { id: "notes", title: tx(ar, "Notes", "الملاحظات"), icon: <DesktopAppIcon><FileText aria-hidden /></DesktopAppIcon>, content: <NotesBody ar={ar} />, size: { w: 420, h: 300 }, keywords: ["memo", "ملاحظة"] },
  { id: "files", title: tx(ar, "Files", "الملفات"), icon: <DesktopAppIcon><Folder aria-hidden /></DesktopAppIcon>, content: <FilesBody ar={ar} />, size: { w: 460, h: 320 }, single: true, keywords: ["folder", "مجلد"] },
  { id: "terminal", title: tx(ar, "Terminal", "الطرفية"), icon: <DesktopAppIcon><Terminal aria-hidden /></DesktopAppIcon>, content: <TerminalBody />, size: { w: 480, h: 260 } },
  { id: "calendar", title: tx(ar, "Calendar", "التقويم"), icon: <DesktopAppIcon><CalendarDays aria-hidden /></DesktopAppIcon>, content: <div className="grid h-full place-items-center p-4 text-body text-muted-foreground">{tx(ar, "Nothing on today", "لا شيء اليوم")}</div>, size: { w: 380, h: 280 }, pinned: false },
  { id: "settings", title: tx(ar, "Settings", "الإعدادات"), icon: <DesktopAppIcon><Settings aria-hidden /></DesktopAppIcon>, content: <SettingsBody ar={ar} />, size: { w: 400, h: 240 }, single: true },
];

export const desktopMenus =
  (ar: boolean) =>
  (focused: DesktopApp | undefined): DesktopMenu[] => [
    {
      id: "file",
      label: tx(ar, "File", "ملف"),
      items: [
        { id: "new", label: tx(ar, "New window", "نافذة جديدة"), shortcut: "Ctrl+N" },
        { id: "close", label: tx(ar, "Close window", "إغلاق النافذة"), shortcut: "Ctrl+W", disabled: !focused },
      ],
    },
    { id: "view", label: tx(ar, "View", "عرض"), items: [{ id: "fs", label: tx(ar, "Enter full screen", "ملء الشاشة"), shortcut: "F11" }] },
    { id: "help", label: tx(ar, "Help", "مساعدة"), items: [{ id: "about", label: tx(ar, "About this desktop", "عن سطح المكتب") }] },
  ];

export function DesktopDemo() {
  const ar = useAr();
  const time = ar ? "٩:٤١ ص" : "9:41 AM";
  return (
    <div className="h-dvh w-full">
      <DesktopShell
        apps={desktopApps(ar)}
        menus={desktopMenus(ar)}
        menuBarStart={<ProductLogo size={16} className="px-1" />}
        menuBarEnd={
          <>
            <Wifi aria-hidden className="size-3.5" />
            <span className="flex items-center gap-1 tabular-nums">
              <BatteryFull aria-hidden className="size-3.5" />
              {ar ? "٨٦٪" : "86%"}
            </span>
            <span className="tabular-nums">{time}</span>
          </>
        }
        defaultWindows={[]}
      />
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------ extension */

function ExtensionBrand() {
  return <ProductLogo size={18} />;
}

export function ExtensionPopupDemo({ startConnected = false }: { startConnected?: boolean }) {
  const ar = useAr();
  const [connected, setConnected] = useState(startConnected);
  const [paused, setPaused] = useState(false);
  const [drank, setDrank] = useState(3);
  return (
    <ExtensionPopup
      brand={<ExtensionBrand />}
      status={connected ? "connected" : "disconnected"}
      paused={connected ? paused : undefined}
      onPausedChange={connected ? setPaused : undefined}
      onOpenOptions={() => undefined}
      footer={<span dir="ltr">v1.4.2</span>}
    >
      {connected ? (
        <>
          <ExtensionMiniCard
            title={tx(ar, "Hydration", "شرب الماء")}
            icon={Droplets}
            status={{ label: tx(ar, "On track", "على المسار"), tone: "success" }}
            value={`${drank} / 8`}
            hint={tx(ar, "Glasses today", "أكواب اليوم")}
          >
            <Progress value={(drank / 8) * 100} label={tx(ar, "Hydration progress", "تقدم شرب الماء")} />
            <Button size="sm" variant="secondary" onClick={() => setDrank((n) => Math.min(8, n + 1))}>
              <Droplets aria-hidden />
              {tx(ar, "Log a glass", "سجّل كوبًا")}
            </Button>
          </ExtensionMiniCard>
          <ExtensionMiniCard
            title={tx(ar, "Caffeine block", "حظر الكافيين")}
            icon={Coffee}
            status={{ label: tx(ar, "Cutoff in 2h", "الإيقاف بعد ساعتين"), tone: "warning" }}
            hint={tx(ar, "Last cup at 1:10 PM", "آخر كوب الساعة ١:١٠ م")}
          />
          <ExtensionQuickActions
            actions={[
              { id: "open", label: tx(ar, "Open app", "افتح التطبيق"), icon: ExternalLink, external: true, onSelect: () => undefined },
              { id: "capture", label: tx(ar, "Capture page", "التقاط الصفحة"), icon: Star, onSelect: () => undefined },
              { id: "remind", label: tx(ar, "Remind me", "ذكّرني"), icon: Bell, onSelect: () => undefined },
              { id: "signout", label: tx(ar, "Disconnect", "قطع الاتصال"), icon: LogOut, onSelect: () => setConnected(false) },
            ]}
          />
        </>
      ) : (
        <ExtensionConnect
          defaultServer="https://app.example.com"
          onConnect={async ({ server }) => {
            await wait(700);
            if (server.includes("fail")) return { error: tx(ar, "Could not reach that server. Check the address.", "تعذّر الوصول إلى الخادم. تحقق من العنوان.") };
            setConnected(true);
          }}
        />
      )}
    </ExtensionPopup>
  );
}

export function ExtensionOptionsDemo() {
  const ar = useAr();
  const [dirty, setDirty] = useState(false);
  const [badge, setBadge] = useState(true);
  const [sound, setSound] = useState(false);
  const [sites, setSites] = useState(true);
  const change = (fn: (v: boolean) => void) => (v: boolean) => {
    fn(v);
    setDirty(true);
  };
  return (
    <ExtensionOptionsPage
      brand={<ExtensionBrand />}
      title={tx(ar, "Extension options", "خيارات الإضافة")}
      description={tx(ar, "These settings sync to your account.", "تتزامن هذه الإعدادات مع حسابك.")}
      dirty={dirty}
      onSave={async () => {
        await wait(600);
        setDirty(false);
      }}
      sections={[
        {
          id: "behaviour",
          title: tx(ar, "Behaviour", "السلوك"),
          content: (
            <div className="flex flex-col divide-y divide-border">
              <ExtensionOptionRow label={tx(ar, "Show badge count", "إظهار عدد الشارة")} description={tx(ar, "On the toolbar icon", "على أيقونة الشريط")} control={<Switch checked={badge} onCheckedChange={change(setBadge)} aria-label={tx(ar, "Show badge count", "إظهار عدد الشارة")} />} />
              <ExtensionOptionRow label={tx(ar, "Play a sound", "تشغيل صوت")} control={<Switch checked={sound} onCheckedChange={change(setSound)} aria-label={tx(ar, "Play a sound", "تشغيل صوت")} />} />
              <ExtensionOptionRow label={tx(ar, "Run on every site", "العمل على كل المواقع")} description={tx(ar, "Turn off to choose sites", "أوقفه لاختيار المواقع")} control={<Switch checked={sites} onCheckedChange={change(setSites)} aria-label={tx(ar, "Run on every site", "العمل على كل المواقع")} />} />
            </div>
          ),
        },
        {
          id: "server",
          title: tx(ar, "Server", "الخادم"),
          description: tx(ar, "Where the extension sends data.", "الوجهة التي ترسل إليها الإضافة البيانات."),
          content: (
            <div dir="ltr" className="rounded-control border border-border bg-secondary px-3 py-2 font-mono text-caption">
              https://app.example.com
            </div>
          ),
        },
      ]}
    />
  );
}

export function ExtensionPage() {
  return (
    <div className="flex flex-col items-center gap-10 bg-secondary/40 p-6 lg:flex-row lg:items-start lg:justify-center">
      <ExtensionPopupDemo />
      <div className="w-full max-w-2xl rounded-xl border border-border bg-background">
        <ExtensionOptionsDemo />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------ glance */

export function GlanceDemo() {
  const ar = useAr();
  const wallpaper = "bg-[linear-gradient(135deg,color-mix(in_oklab,var(--nq-action)_55%,transparent),color-mix(in_oklab,var(--nq-success)_40%,transparent))]";
  return (
    <div className="flex flex-col gap-10 p-6">
      <section className="flex flex-col gap-3">
        <h2 className="text-h3">{tx(ar, "Tray popover", "نافذة الشريط")}</h2>
        <TrayPopover
          title={tx(ar, "Today", "اليوم")}
          subtitle={tx(ar, "Tuesday, 29 September", "الثلاثاء ٢٩ سبتمبر")}
          headerEnd={<Switch defaultChecked aria-label={tx(ar, "Notifications", "الإشعارات")} />}
          actions={[
            { id: "open", label: tx(ar, "Open dashboard", "افتح لوحة التحكم"), icon: ExternalLink, shortcut: "Ctrl+O", onSelect: () => undefined },
            { id: "settings", label: tx(ar, "Settings", "الإعدادات"), icon: Settings, onSelect: () => undefined },
            { id: "quit", label: tx(ar, "Quit", "خروج"), icon: LogOut, danger: true, onSelect: () => undefined },
          ]}
        >
          <GlanceRow icon={Clock3} label={tx(ar, "Timer running", "المؤقت يعمل")} detail={tx(ar, "Design review", "مراجعة التصميم")} value="00:42:10" tone="info" onSelect={() => undefined} />
          <GlanceRow icon={Mail} label={tx(ar, "Unread", "غير مقروء")} value="12" onSelect={() => undefined} />
          <GlanceRow icon={CalendarDays} label={tx(ar, "Next meeting", "الاجتماع التالي")} detail="11:30" value={tx(ar, "in 25 min", "بعد ٢٥ دقيقة")} tone="warning" />
        </TrayPopover>
      </section>
      <section className="flex flex-wrap items-start gap-8">
        <div className="flex flex-col gap-3">
          <h2 className="text-h3">{tx(ar, "Watch", "الساعة")}</h2>
          <div className="flex flex-wrap gap-4">
            <WatchGlance title="9:41" headerEnd={<BatteryFull aria-hidden className="size-3.5" />}>
              <GlanceRow dense icon={Droplets} label={tx(ar, "Water", "الماء")} value="3/8" tone="info" />
              <GlanceRow dense icon={Footprints} label={tx(ar, "Steps", "الخطوات")} value="6,240" tone="success" />
              <GlanceRow dense icon={Coffee} label={tx(ar, "Caffeine", "الكافيين")} value="2" tone="warning" />
            </WatchGlance>
            <WatchGlance title="9:41" shape="round">
              <GlanceRow dense icon={Droplets} label={tx(ar, "Water", "الماء")} value="3/8" tone="info" />
              <GlanceRow dense icon={Footprints} label={tx(ar, "Steps", "الخطوات")} value="6,240" tone="success" />
            </WatchGlance>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <h2 className="text-h3">{tx(ar, "Home screen widgets", "ودجات الشاشة الرئيسية")}</h2>
          <div className="flex flex-wrap gap-3">
            <WidgetTile title={tx(ar, "Water", "الماء")} icon={Droplets} value="3/8" caption={tx(ar, "glasses today", "أكواب اليوم")} progress={37} tone="info" onOpen={() => undefined} />
            <WidgetTile title={tx(ar, "Steps", "الخطوات")} icon={Footprints} value="6,240" caption={tx(ar, "62% of goal", "٦٢٪ من الهدف")} progress={62} tone="success" />
            <WidgetTile size="medium" title={tx(ar, "Today", "اليوم")} icon={CalendarDays} value="3" caption={tx(ar, "tasks due", "مهام مستحقة")}>
              <GlanceRow dense icon={CheckCheck} label={tx(ar, "Send the quote", "أرسل عرض السعر")} value="10:00" />
            </WidgetTile>
          </div>
        </div>
      </section>
      <section className={`flex flex-col gap-3 rounded-2xl p-5 ${wallpaper}`}>
        <h2 className="text-h3">{tx(ar, "Lock screen widgets", "ودجات شاشة القفل")}</h2>
        <div className="flex flex-wrap items-center gap-3">
          <WidgetTile surface="lock" size="circular" title={tx(ar, "Water", "الماء")} icon={Droplets} value="3" progress={37} />
          <WidgetTile surface="lock" size="circular" title={tx(ar, "Steps", "الخطوات")} icon={Footprints} value="62%" progress={62} tone="success" />
          <WidgetTile surface="lock" size="inline" title={tx(ar, "Next meeting", "الاجتماع التالي")} icon={CalendarDays} value="11:30" />
        </div>
      </section>
    </div>
  );
}

const galleryWidgets = (ar: boolean): WidgetDefinition[] => [
  {
    id: "water",
    title: tx(ar, "Water", "الماء"),
    description: tx(ar, "Glasses against today's goal.", "الأكواب مقابل هدف اليوم."),
    sizes: ["small", "medium", "circular"],
    preview: (size) => <WidgetTile size={size} title={tx(ar, "Water", "الماء")} icon={Droplets} value="3/8" caption={tx(ar, "glasses today", "أكواب اليوم")} progress={37} tone="info" />,
  },
  {
    id: "steps",
    title: tx(ar, "Steps", "الخطوات"),
    description: tx(ar, "Your steps so far.", "خطواتك حتى الآن."),
    sizes: ["small", "inline"],
    preview: (size) => <WidgetTile size={size} title={tx(ar, "Steps", "الخطوات")} icon={Footprints} value="6,240" caption={tx(ar, "62% of goal", "٦٢٪ من الهدف")} progress={62} tone="success" />,
  },
  {
    id: "inbox",
    title: tx(ar, "Inbox", "الوارد"),
    description: tx(ar, "Unread count, one tap to open.", "عدد غير المقروء بنقرة واحدة."),
    sizes: ["small"],
    preview: (size) => <WidgetTile size={size} title={tx(ar, "Inbox", "الوارد")} icon={Inbox} value="12" caption={tx(ar, "unread", "غير مقروء")} />,
  },
];

export function WidgetGalleryDemo() {
  const ar = useAr();
  const [added, setAdded] = useState<string[]>(["water"]);
  return (
    <div className="p-6">
      <WidgetGallery
        widgets={galleryWidgets(ar)}
        added={added}
        onAdd={(id) => setAdded((a) => [...a, id])}
        onRemove={(id) => setAdded((a) => a.filter((x) => x !== id))}
      />
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------ mobile nav */

interface Msg {
  id: string;
  from: string;
  subject: string;
  time: string;
  group: "all" | "unread" | "starred" | "work";
  unread?: boolean;
  starred?: boolean;
  work?: boolean;
}

const messages = (ar: boolean): Msg[] => [
  { id: "1", from: tx(ar, "Nour Adel", "نور عادل"), subject: tx(ar, "Design review moved to 3 PM", "تم نقل مراجعة التصميم إلى الثالثة"), time: "9:12", group: "all", unread: true, work: true },
  { id: "2", from: tx(ar, "Billing", "الفوترة"), subject: tx(ar, "Your invoice is ready", "فاتورتك جاهزة"), time: "8:40", group: "all", unread: true },
  { id: "3", from: tx(ar, "Omar Samy", "عمر سامي"), subject: tx(ar, "Lunch on Thursday?", "غداء يوم الخميس؟"), time: tx(ar, "Mon", "الإثنين"), group: "all", starred: true },
  { id: "4", from: tx(ar, "Mona Hany", "منى هاني"), subject: tx(ar, "Registry validation passed", "نجح التحقق من السجل"), time: tx(ar, "Sun", "الأحد"), group: "all", work: true },
  { id: "5", from: tx(ar, "Fleet alerts", "تنبيهات الأسطول"), subject: tx(ar, "3 vehicles need service", "٣ مركبات تحتاج صيانة"), time: tx(ar, "Sat", "السبت"), group: "all", work: true, unread: true },
];

export function MobileNavDemo() {
  const ar = useAr();
  const [tab, setTab] = useState("inbox");
  const [filter, setFilter] = useState("all");
  const [rows, setRows] = useState(() => messages(ar));
  const [note, setNote] = useState("");
  const shown = rows.filter((m) => (filter === "all" ? true : filter === "unread" ? m.unread : filter === "starred" ? m.starred : m.work));
  const count = (f: string) => rows.filter((m) => (f === "all" ? true : f === "unread" ? m.unread : f === "starred" ? m.starred : m.work)).length;
  const patch = (id: string, fn: (m: Msg) => Msg | null, label: string) => {
    setRows((list) => list.flatMap((m) => (m.id === id ? (fn(m) ? [fn(m) as Msg] : []) : [m])));
    setNote(label);
  };
  return (
    <div className="mx-auto flex h-dvh w-full max-w-md flex-col bg-background text-foreground">
      <header className="flex items-center justify-between px-4 pt-4 pb-2">
        <h1 className="text-h1">{tx(ar, "Inbox", "الوارد")}</h1>
        <span role="status" className="text-caption text-muted-foreground">
          {note}
        </span>
      </header>
      <FilterStrip
        aria-label={tx(ar, "Filter messages", "تصفية الرسائل")}
        value={filter}
        onValueChange={setFilter}
        items={[
          { value: "all", label: tx(ar, "All", "الكل"), count: count("all") },
          { value: "unread", label: tx(ar, "Unread", "غير مقروء"), count: count("unread") },
          { value: "starred", label: tx(ar, "Starred", "مميز"), count: count("starred") },
          { value: "work", label: tx(ar, "Work", "العمل"), count: count("work") },
        ]}
      />
      <ul className="mt-2 min-h-0 flex-1 divide-y divide-border overflow-y-auto border-y border-border">
        {shown.map((m) => (
          <li key={m.id}>
            <SwipeActionRow
              startActions={[
                { id: "pin", label: m.starred ? tx(ar, "Unstar", "إلغاء التمييز") : tx(ar, "Star", "تمييز"), icon: Pin, tone: "primary", onSelect: () => patch(m.id, (x) => ({ ...x, starred: !x.starred }), tx(ar, "Star toggled", "تم تبديل التمييز")) },
              ]}
              endActions={[
                { id: "archive", label: tx(ar, "Archive", "أرشفة"), icon: Archive, onSelect: () => patch(m.id, () => null, tx(ar, "Archived", "تمت الأرشفة")) },
                { id: "delete", label: tx(ar, "Delete", "حذف"), icon: Trash2, tone: "danger", onSelect: () => patch(m.id, () => null, tx(ar, "Deleted", "تم الحذف")) },
              ]}
            >
              <div className="flex items-start gap-3 px-4 py-3">
                <span aria-hidden className={`mt-2 size-2 shrink-0 rounded-full ${m.unread ? "bg-primary" : "bg-transparent"}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className={`truncate text-label ${m.unread ? "font-semibold" : ""}`}>{m.from}</p>
                    <span className="shrink-0 text-caption text-muted-foreground">{m.time}</span>
                  </div>
                  <p className="truncate text-body text-muted-foreground">{m.subject}</p>
                </div>
                {m.starred ? <Star aria-label={tx(ar, "Starred", "مميز")} className="mt-1 size-4 shrink-0 fill-nq-warning text-nq-warning" /> : null}
              </div>
            </SwipeActionRow>
          </li>
        ))}
        {shown.length === 0 ? <li className="p-8 text-center text-body text-muted-foreground">{tx(ar, "Nothing here", "لا شيء هنا")}</li> : null}
      </ul>
      <BottomTabBar
        value={tab}
        onValueChange={setTab}
        items={[
          { value: "home", label: tx(ar, "Home", "الرئيسية"), icon: Home },
          { value: "inbox", label: tx(ar, "Inbox", "الوارد"), icon: Inbox, badge: rows.filter((m) => m.unread).length },
          { value: "calendar", label: tx(ar, "Calendar", "التقويم"), icon: CalendarDays },
          { value: "me", label: tx(ar, "Me", "أنا"), icon: User },
        ]}
      />
    </div>
  );
}
