/*
 * The Mahaam product page (brief item 19), opened from the App Store inside the shared shell. Identity,
 * eyebrow, tagline, chips, the six features, integrations and the closing come from Mahaam's own landing;
 * the screenshots are drawn with Nasaq primitives. Plans, prices, ratings and the agent transcript's
 * figures are illustrative (the transcript uses Mahaam's real MCP tool names).
 */
import {
  AppGlyph,
  AppMain,
  Avatar,
  Badge,
  Button,
  FeatureStory,
  Ltr,
  Num,
  PlanCard,
  PlanGrid,
  Price,
  ProductArtwork,
  ProductCard,
  ProductGrid,
  ProductList,
  ProductListItem,
  ProductMark,
  Rating,
  ScreenshotFrame,
  SectionHeader,
  Spotlight,
  Status,
  Switch,
  Tabs,
  TabsIndicator,
  TabsList,
  TabsPanel,
  TabsTab,
} from "@nasaq/web";
import {
  ArrowUpRight,
  Bot,
  Code,
  GitBranch,
  Globe,
  KanbanSquare,

  type LucideIcon,
  MessageSquareWarning,
  Monitor,
  Package,
  Plug,
  Puzzle,
  ReceiptText,
  Smartphone,
  Timer,
  UsersRound,
} from "lucide-react";
import { useState } from "react";
import { type Bi, CATEGORIES, product, S, StoreHeader, StoreInstall, useLang } from "./_store";

const CONSOLE = "https://console.mahaam.app";

const M = {
  eyebrow: { en: "Project management", ar: "إدارة المشاريع" },
  tagline: {
    en: "Projects, tasks, time and invoices in one place — with a feedback widget for your clients' sites, a customer portal, and AI agents that work your issue board over MCP.",
    ar: "المشاريع والمهام والوقت والفواتير في مكان واحد — مع أداة ملاحظات لمواقع عملائك، وبوابة للعملاء، ووكلاء ذكاء اصطناعي يعملون على لوحة المشكلات عبر MCP.",
  },
  openConsole: { en: "Open the console", ar: "افتح لوحة التحكم" },
  tour: { en: "A look inside", ar: "نظرة من الداخل" },
  tourHint: { en: "The same app on the web, the desktop tray and your phone.", ar: "التطبيق نفسه على الويب وفي شريط سطح المكتب وعلى هاتفك." },
  board: { en: "Board", ar: "اللوحة" },
  timer: { en: "Timer", ar: "المؤقّت" },
  portal: { en: "Customer portal", ar: "بوابة العملاء" },
  everything: { en: "Everything a studio runs on", ar: "كل ما يحتاجه الاستوديو" },
  plans: { en: "Plans", ar: "الخطط" },
  plansHint: { en: "Every plan includes the web, desktop and mobile apps.", ar: "كل الخطط تشمل تطبيقات الويب وسطح المكتب والجوال." },
  yearly: { en: "Yearly · save 20%", ar: "سنويًا · وفّر 20%" },
  billedYearly: { en: "Billed yearly", ar: "يُدفع سنويًا" },
  billedMonthly: { en: "Billed monthly", ar: "يُدفع شهريًا" },
  illustrative: { en: "Plans and prices on this page are illustrative.", ar: "الخطط والأسعار في هذه الصفحة توضيحية." },
  popular: { en: "Most popular", ar: "الأكثر اختيارًا" },
  integrations: { en: "Works where you work", ar: "يعمل حيث تعمل" },
  integrationsHint: { en: "Included in every plan. No third-party connectors to buy.", ar: "مشمولة في كل الخطط، دون موصلات خارجية تشتريها." },
  included: { en: "Included", ar: "مشمول" },
  related: { en: "Works well with Mahaam", ar: "يعمل جيدًا مع مهام" },
  closing: { en: "Run your projects on Mahaam", ar: "أدِر مشاريعك على مهام" },
  closingCopy: {
    en: "Sign in at console.mahaam.app. Arabic and English, light and dark, on the web and on your phone.",
    ar: "سجّل الدخول من console.mahaam.app. بالعربية والإنجليزية، فاتحًا وداكنًا، على الويب وعلى هاتفك.",
  },
} satisfies Record<string, Bi>;

const CHIPS: { icon: LucideIcon; label: Bi }[] = [
  { icon: Timer, label: { en: "One-click timer", ar: "مؤقّت بنقرة واحدة" } },
  { icon: KanbanSquare, label: { en: "Boards and issues", ar: "لوحات ومشكلات" } },
  { icon: ReceiptText, label: { en: "Invoices from time", ar: "فواتير من الوقت" } },
  { icon: Bot, label: { en: "MCP and AI agents", ar: "MCP ووكلاء الذكاء الاصطناعي" } },
];

const FEATURES: { icon: LucideIcon; title: Bi; copy: Bi }[] = [
  {
    icon: KanbanSquare,
    title: { en: "Projects, tasks and issues", ar: "المشاريع والمهام والمشكلات" },
    copy: {
      en: "Boards and lists per project, checklists, mentions, an issue tracker with drag-and-drop order, and access by label, team or single task.",
      ar: "لوحات وقوائم لكل مشروع، وقوائم تحقّق وإشارات، ومتتبّع مشكلات بترتيب بالسحب، وصلاحيات حسب الوسم أو الفريق أو المهمة.",
    },
  },
  {
    icon: Timer,
    title: { en: "Time tracking everywhere", ar: "تتبّع الوقت في كل مكان" },
    copy: {
      en: "One running timer per person, synced live between the web, a desktop tray app, a Chrome extension and the mobile app.",
      ar: "مؤقّت واحد يعمل لكل شخص، متزامن لحظيًا بين الويب وتطبيق سطح المكتب وإضافة Chrome وتطبيق الجوال.",
    },
  },
  {
    icon: UsersRound,
    title: { en: "Customer portal", ar: "بوابة العملاء" },
    copy: {
      en: "Clients follow their projects' progress, hours and invoices, accept or reopen issues, and send requests you turn into issues or tasks.",
      ar: "يتابع العملاء تقدّم مشاريعهم وساعاتها وفواتيرها، ويقبلون المشكلات أو يعيدون فتحها، ويرسلون طلبات تحوّلها إلى مشكلات أو مهام.",
    },
  },
];

// ─── Screenshots, drawn with Nasaq primitives ────────────────────────────────

const COLUMNS: { title: Bi; tone: "neutral" | "info" | "warning" | "success"; cards: { key: string; title: Bi; who: string }[] }[] = [
  {
    title: { en: "Todo", ar: "للتنفيذ" },
    tone: "neutral",
    cards: [
      { key: "MH-742", title: { en: "Portal: request form", ar: "البوابة: نموذج الطلب" }, who: "Nour Adel" },
      { key: "MH-745", title: { en: "Invoice PDF in Arabic", ar: "فاتورة PDF بالعربية" }, who: "Omar Samy" },
    ],
  },
  {
    title: { en: "In progress", ar: "قيد التنفيذ" },
    tone: "info",
    cards: [
      { key: "MH-728", title: { en: "Feedback widget on acme.coffee", ar: "أداة الملاحظات على acme.coffee" }, who: "Fady Mondy" },
      { key: "MH-739", title: { en: "Desktop tray: idle detection", ar: "شريط سطح المكتب: كشف الخمول" }, who: "Mona Hany" },
    ],
  },
  {
    title: { en: "In review", ar: "قيد المراجعة" },
    tone: "warning",
    cards: [{ key: "MH-731", title: { en: "Client portal: invoice view", ar: "بوابة العميل: عرض الفاتورة" }, who: "Fady Mondy" }],
  },
];

function BoardMock() {
  const lang = useLang();
  return (
    <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
      {COLUMNS.map((col) => (
        <div key={col.title.en} className="flex flex-col gap-2">
          <div className="flex items-center gap-2 px-1">
            <Status tone={col.tone}>{col.title[lang]}</Status>
            <span className="text-caption text-muted-foreground">
              <Num value={col.cards.length} />
            </span>
          </div>
          {col.cards.map((c) => (
            <div key={c.key} className="flex flex-col gap-2 rounded-control bg-nq-surface p-3 shadow-xs ring-1 ring-border">
              <Ltr className="font-mono text-caption text-muted-foreground">{c.key}</Ltr>
              <span className="text-body-sm text-foreground">{c.title[lang]}</span>
              <Avatar name={c.who} size="xs" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function TimerMock({ compact }: { compact?: boolean }) {
  const lang = useLang();
  const entries = [
    { key: "MH-728", title: COLUMNS[1]!.cards[0]!.title, h: 2.5 },
    { key: "MH-731", title: COLUMNS[2]!.cards[0]!.title, h: 1.25 },
    { key: "MH-739", title: COLUMNS[1]!.cards[1]!.title, h: 3 },
  ];
  return (
    <div className={compact ? "flex flex-col gap-3 p-3 pt-8" : "flex flex-col gap-4 p-5"}>
      <div className={`flex gap-4 rounded-card bg-[color-mix(in_oklab,var(--nq-brand)_12%,var(--nq-surface))] p-4 ${compact ? "flex-col items-start gap-3" : "items-center"}`}>
        <span className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground">
          <Timer className="size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col self-stretch">
          <span className="truncate text-label">{COLUMNS[1]!.cards[0]!.title[lang]}</span>
          <Ltr className="font-mono text-caption text-muted-foreground">MH-728</Ltr>
        </div>
        <Ltr className={`font-mono tabular-nums ${compact ? "text-h1" : "text-h2"}`}>01:42:08</Ltr>
      </div>
      <ul className="flex flex-col">
        {entries.map((e) => (
          <li key={e.key} className="flex items-center gap-3 border-b border-border py-2.5 text-body-sm last:border-0">
            {!compact && <Ltr className="font-mono text-caption text-muted-foreground">{e.key}</Ltr>}
            <span className="min-w-0 flex-1 truncate">{e.title[lang]}</span>
            <Num value={e.h} format={{ style: "unit", unit: "hour", unitDisplay: "short" }} className="text-muted-foreground" />
          </li>
        ))}
      </ul>
    </div>
  );
}

function PortalMock() {
  const lang = useLang();
  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-caption text-muted-foreground">Acme Coffee</span>
          <span className="text-h3">{lang === "ar" ? "إعادة تصميم المتجر" : "Storefront redesign"}</span>
        </div>
        <Status tone="info">{lang === "ar" ? "قيد التنفيذ" : "In progress"}</Status>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-caption text-muted-foreground">
          <span>{lang === "ar" ? "التقدّم" : "Progress"}</span>
          <Num value={0.68} format={{ style: "percent" }} />
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-secondary">
          <div className="h-full w-[68%] rounded-full bg-primary" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: lang === "ar" ? "الساعات" : "Hours", value: <Num value={46.5} /> },
          { label: lang === "ar" ? "مشكلات مفتوحة" : "Open issues", value: <Num value={7} /> },
          { label: lang === "ar" ? "مستحق" : "Due", value: <Num value={1840} format={{ style: "currency", currency: "USD", maximumFractionDigits: 0 }} /> },
        ].map((k) => (
          <div key={k.label} className="flex flex-col gap-0.5 rounded-control bg-nq-surface p-3">
            <span className="text-caption text-muted-foreground">{k.label}</span>
            <span className="text-h3 tabular-nums">{k.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Snippet() {
  return (
    <ScreenshotFrame variant="window" title="index.html">
      <pre dir="ltr" className="overflow-x-auto p-4 text-start font-mono text-caption leading-relaxed text-foreground">
        <span className="text-muted-foreground">{"<!-- acme.coffee -->\n"}</span>
        {'<script src="https://mahaam.app/feedback.js"\n        data-key="pk_live_…" defer></script>'}
      </pre>
    </ScreenshotFrame>
  );
}

const TRANSCRIPT: { tool?: string; text: Bi }[] = [
  { tool: "start_issue", text: { en: "MH-745 · plan posted: render the invoice PDF with the Arabic font", ar: "MH-745 · نُشرت الخطة: عرض فاتورة PDF بالخط العربي" } },
  { tool: "vault_recall", text: { en: "“invoice fonts” → 2 notes from this project", ar: "«خطوط الفواتير» ← ملاحظتان من هذا المشروع" } },
  { text: { en: "Edited 3 files, tests pass.", ar: "عُدّلت 3 ملفات، والاختبارات ناجحة." } },
  { tool: "log_time", text: { en: "MH-745 · 0.75 h", ar: "MH-745 · 0.75 س" } },
  { tool: "record_issue_usage", text: { en: "MH-745 · $0.42", ar: "MH-745 · 0.42 US$" } },
  { tool: "review_issue", text: { en: "MH-745 → In review, assigned to Fady", ar: "MH-745 ← قيد المراجعة، مُسندة إلى فادي" } },
];

function AgentTranscript() {
  const lang = useLang();
  return (
    <ScreenshotFrame variant="window" title="Claude Code · issue-worker" label={lang === "ar" ? "وكيل يعمل على مشكلة في مهام" : "An agent working a Mahaam issue"}>
      <ol className="flex flex-col gap-2 p-4 text-body-sm">
        {TRANSCRIPT.map((line, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static transcript
          <li key={i} className="flex items-start gap-2">
            {line.tool ? (
              <Badge variant="brand" className="font-mono">
                <Ltr>{line.tool}</Ltr>
              </Badge>
            ) : (
              <Bot aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            )}
            <span className="min-w-0 text-muted-foreground">{line.text[lang]}</span>
          </li>
        ))}
      </ol>
    </ScreenshotFrame>
  );
}

function InvoiceMock() {
  const lang = useLang();
  const rows = [
    { label: lang === "ar" ? "الوقت غير المفوتر · 38.5 س" : "Unbilled time · 38.5 h", amount: 1540 },
    { label: lang === "ar" ? "استهلاك الذكاء الاصطناعي · هامش 20%" : "AI usage · 20% markup", amount: 46.8 },
    { label: lang === "ar" ? "الخادم · سبتمبر" : "Server · September", amount: 24 },
  ];
  return (
    <ScreenshotFrame variant="browser" title="console.mahaam.app/invoices/INV-0192" label={lang === "ar" ? "مسودة فاتورة من الوقت" : "Draft invoice from time"}>
      <div className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between">
          <span className="text-h3">
            <Ltr>INV-0192</Ltr>
          </span>
          <Status tone="neutral">{lang === "ar" ? "مسودة" : "Draft"}</Status>
        </div>
        <ul className="flex flex-col">
          {rows.map((r) => (
            <li key={r.label} className="flex justify-between gap-3 border-b border-border py-2 text-body-sm">
              <span className="text-muted-foreground">{r.label}</span>
              <Num value={r.amount} format={{ style: "currency", currency: "USD" }} />
            </li>
          ))}
        </ul>
        <div className="flex justify-between text-label">
          <span>{lang === "ar" ? "الإجمالي" : "Total"}</span>
          <Num value={1610.8} format={{ style: "currency", currency: "USD" }} />
        </div>
      </div>
    </ScreenshotFrame>
  );
}

// ─── Sections ────────────────────────────────────────────────────────────────

function Tour() {
  const lang = useLang();
  const tabs = [
    { value: "board", icon: KanbanSquare, label: M.board, frame: "browser" as const, title: "console.mahaam.app/projects/acme", body: <BoardMock /> },
    { value: "timer", icon: Timer, label: M.timer, frame: "window" as const, title: "Mahaam", body: <TimerMock /> },
    { value: "portal", icon: UsersRound, label: M.portal, frame: "browser" as const, title: "portal.mahaam.app/acme", body: <PortalMock /> },
  ];
  return (
    <section aria-labelledby="mahaam-tour" className="flex flex-col gap-5">
      <SectionHeader headingId="mahaam-tour" title={M.tour[lang]} description={M.tourHint[lang]} />
      <Tabs defaultValue="board">
        <TabsList aria-label={M.tour[lang]}>
          {tabs.map((t) => (
            <TabsTab key={t.value} value={t.value}>
              <t.icon />
              {t.label[lang]}
            </TabsTab>
          ))}
          <TabsIndicator />
        </TabsList>
        {tabs.map((t) => (
          <TabsPanel key={t.value} value={t.value}>
            <ScreenshotFrame variant={t.frame} title={t.title} label={`Mahaam · ${t.label[lang]}`}>
              {t.body}
            </ScreenshotFrame>
          </TabsPanel>
        ))}
      </Tabs>
    </section>
  );
}

function Plans() {
  const lang = useLang();
  const [yearly, setYearly] = useState(false);
  const seat = (monthly: number) => (yearly ? Math.round(monthly * 0.8 * 100) / 100 : monthly);
  const note = yearly ? M.billedYearly[lang] : M.billedMonthly[lang];
  const ar = lang === "ar";
  return (
    <section aria-labelledby="mahaam-plans" className="flex flex-col gap-5">
      <SectionHeader
        headingId="mahaam-plans"
        title={M.plans[lang]}
        description={M.plansHint[lang]}
        action={
          <label className="flex cursor-pointer items-center gap-2 text-label">
            <Switch checked={yearly} onCheckedChange={setYearly} />
            {M.yearly[lang]}
          </label>
        }
      />
      <PlanGrid>
        <PlanCard
          name="Solo"
          description={ar ? "شخص واحد وبضعة عملاء." : "One person, a few clients."}
          price={<Price amount={0} size="lg" />}
          priceNote={ar ? "مجاني دائمًا" : "Free forever"}
          features={ar ? ["3 مشاريع", "تتبّع الوقت في كل مكان", "أداة الملاحظات"] : ["3 projects", "Time tracking everywhere", "Feedback SDK"]}
          action={<StoreInstall id="mahaam" appName={ar ? "مهام" : "Mahaam"} variant="secondary" size="md" free />}
        />
        <PlanCard
          highlighted
          badge={<Badge variant="brand">{M.popular[lang]}</Badge>}
          name="Team"
          description={ar ? "للاستوديوهات وفرق المنتجات." : "For studios and product teams."}
          price={<Price amount={seat(12)} compareAt={yearly ? 12 : undefined} period="seat-month" size="lg" fractionDigits={yearly ? 2 : 0} />}
          priceNote={note}
          features={
            ar
              ? ["كل ما في Solo، إضافةً إلى", "مشاريع غير محدودة", "بوابة العملاء", "فواتير من الوقت"]
              : ["Everything in Solo, plus", "Unlimited projects", "Customer portal", "Invoices from time"]
          }
          action={<Button>{ar ? "ابدأ تجربة 14 يومًا" : "Start 14-day trial"}</Button>}
        />
        <PlanCard
          name="Agency"
          description={ar ? "عملاء كثيرون ووكلاء على اللوحة." : "Many clients, AI agents on the board."}
          price={<Price amount={seat(24)} compareAt={yearly ? 24 : undefined} period="seat-month" size="lg" fractionDigits={yearly ? 2 : 0} />}
          priceNote={note}
          features={
            ar
              ? ["كل ما في Team، إضافةً إلى", "MCP ووكلاء الذكاء الاصطناعي", "فوترة استهلاك الذكاء الاصطناعي", "صلاحيات حسب الوسم والفريق"]
              : ["Everything in Team, plus", "MCP and AI agents", "AI usage billing with markup", "Access by label and team"]
          }
          action={<Button variant="secondary">{ar ? "اختر Agency" : "Choose Agency"}</Button>}
        />
      </PlanGrid>
      <p className="text-caption text-muted-foreground">{M.illustrative[lang]}</p>
    </section>
  );
}

const INTEGRATIONS: { icon: LucideIcon; name: Bi; copy: Bi }[] = [
  { icon: Code, name: { en: "Feedback script", ar: "سكربت الملاحظات" }, copy: { en: "One tag on any site", ar: "وسم واحد على أي موقع" } },
  { icon: Package, name: { en: "Laravel, Node, Go, Python", ar: "Laravel وNode وGo وPython" }, copy: { en: "Server packages for the Feedback SDK", ar: "حزم خادم لأداة الملاحظات" } },
  { icon: Globe, name: { en: "Web console", ar: "لوحة الويب" }, copy: { en: "console.mahaam.app", ar: "console.mahaam.app" } },
  { icon: Monitor, name: { en: "Desktop tray", ar: "شريط سطح المكتب" }, copy: { en: "The timer, one click away", ar: "المؤقّت على بعد نقرة" } },
  { icon: Puzzle, name: { en: "Chrome extension", ar: "إضافة Chrome" }, copy: { en: "Track time from any tab", ar: "تتبّع الوقت من أي تبويب" } },
  { icon: Smartphone, name: { en: "Mobile app", ar: "تطبيق الجوال" }, copy: { en: "Issues and timer on your phone", ar: "المشكلات والمؤقّت على هاتفك" } },
  { icon: Plug, name: { en: "MCP server", ar: "خادم MCP" }, copy: { en: "Every feature, scoped to your role", ar: "كل الميزات، في حدود دورك" } },
  { icon: Bot, name: { en: "Claude Code plugin", ar: "إضافة Claude Code" }, copy: { en: "issue-worker, triager, project-reporter", ar: "issue-worker وtriager وproject-reporter" } },
  { icon: GitBranch, name: { en: "GitHub", ar: "GitHub" }, copy: { en: "Commits, pulls, runs and deploys", ar: "الإيداعات وطلبات الدمج والتشغيل والنشر" } },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export function MahaamPage({ onBack }: { onBack?: () => void }) {
  const lang = useLang();
  const ar = lang === "ar";
  const mahaam = product("mahaam");
  const related = ["zekra", "moharrik", "hosbah", "orchestra"].map(product);
  const consoleLink = (
    <Button variant="ghost" size="lg" nativeButton={false} render={<a href={CONSOLE} target="_blank" rel="noreferrer" />}>
      {M.openConsole[lang]}
      <ArrowUpRight className="rtl:-scale-x-100" />
    </Button>
  );

  return (
    <>
      <StoreHeader page={mahaam.name[lang]} onStore={onBack} />
      <AppMain>
        <div data-brand="mahaam" className="@container mx-auto flex max-w-6xl flex-col gap-16 pb-8">
          <Spotlight
            brand="mahaam"
            titleAs="h1"
            eyebrow={<span className="text-label uppercase tracking-wide text-muted-foreground">{M.eyebrow[lang]}</span>}
            title={mahaam.name[lang]}
            description={
              <div className="flex flex-col gap-4">
                <p className="text-balance">{M.tagline[lang]}</p>
                <ul className="flex flex-wrap gap-2">
                  {CHIPS.map((c) => (
                    <li key={c.label.en} className="inline-flex items-center gap-1.5 rounded-full bg-background/70 px-2.5 py-1 text-caption text-foreground">
                      <c.icon aria-hidden className="size-3.5 text-nq-brand" />
                      {c.label[lang]}
                    </li>
                  ))}
                </ul>
              </div>
            }
            actions={
              <>
                <StoreInstall id="mahaam" appName={mahaam.name[lang]} variant="primary" size="lg" />
                {consoleLink}
              </>
            }
            meta={
              <>
                <Price amount={mahaam.price.monthly} period="seat-month" size="sm" className="text-foreground" />
                <span aria-hidden>·</span>
                <span>{S.freeTrial[lang]}</span>
                <span aria-hidden>·</span>
                <Rating value={mahaam.rating} count={mahaam.installs} countLabel={S.workspaces[lang]} />
              </>
            }
            media={
              <ScreenshotFrame variant="phone" label={ar ? "مؤقّت مهام على الجوال" : "Mahaam timer on a phone"} className="w-52">
                <TimerMock compact />
              </ScreenshotFrame>
            }
          />

          <Tour />

          <section aria-labelledby="mahaam-everything" className="flex flex-col gap-6">
            <SectionHeader headingId="mahaam-everything" title={M.everything[lang]} />
            <ul className="grid grid-cols-1 gap-x-8 gap-y-6 @3xl:grid-cols-3">
              {FEATURES.map((f) => (
                <li key={f.title.en} className="flex flex-col gap-2">
                  <AppGlyph icon={f.icon} />
                  <h3 className="text-label text-foreground">{f.title[lang]}</h3>
                  <p className="text-pretty text-body-sm text-muted-foreground">{f.copy[lang]}</p>
                </li>
              ))}
            </ul>
          </section>

          <FeatureStory
            icon={<MessageSquareWarning />}
            eyebrow={ar ? "أداة الملاحظات" : "Feedback SDK"}
            title={ar ? "ملاحظات العملاء تصل إلى المشروع مباشرة" : "Client feedback lands on the project"}
            description={
              ar
                ? "أضف سطرًا واحدًا — أو حزمة Laravel أو Node أو Go أو Python — إلى موقع العميل: زر عائم يرسل المشكلات مع لقطة شاشة وسجلات مباشرة إلى المشروع."
                : "Drop one script — or the Laravel, Node, Go or Python package — onto a client's site: a floating button files issues with a screenshot and logs straight onto the project."
            }
            points={ar ? ["لقطة شاشة وسجلات تُرفق تلقائيًا", "مفتاح لكل مشروع يمكنك إلغاؤه"] : ["Screenshot and logs attached automatically", "One key per project, revocable"]}
            media={<Snippet />}
          />

          <FeatureStory
            reverse
            icon={<Bot />}
            eyebrow={ar ? "MCP ووكلاء الذكاء الاصطناعي" : "MCP and AI agents"}
            title={ar ? "وكلاء يعملون على لوحتك، لا بجانبها" : "Agents that work your board, not beside it"}
            description={
              ar
                ? "كل الميزات عبر MCP برموز محدودة لا تتجاوز دورك: الوكلاء يخطّطون ويعملون ويسلّمون المشكلات للمراجعة، ويستدعون خزنة كل مشروع، ويبلّغون عن استهلاكهم."
                : "Every feature over MCP with scoped tokens that never exceed your role: agents plan, work and hand issues to review, recall each project's vault, and report their own usage."
            }
            points={
              ar
                ? ["الوكيل يسلّم للمراجعة، والإنسان يقرّر", "تكلفة كل مشكلة مسجّلة على المشروع"]
                : ["Agents hand off to review; a person decides", "Each issue's AI cost is recorded on the project"]
            }
            media={<AgentTranscript />}
          />

          <FeatureStory
            icon={<ReceiptText />}
            eyebrow={ar ? "الفواتير" : "Invoices"}
            title={ar ? "من الوقت إلى الفاتورة في خطوة" : "From time to invoice in one step"}
            description={
              ar
                ? "فوتر الوقت غير المفوتر، وتكلفة رموز الذكاء الاصطناعي لكل مشروع مع هامشك، واشتراكاته — خوادم وخطط ذكاء اصطناعي وأدوات تسويق — مرة لكل فترة."
                : "Invoice unbilled time, each project's AI token cost with your markup, and its subscriptions — servers, AI plans, marketing tools — once per period."
            }
            media={<InvoiceMock />}
          />

          <Plans />

          <section aria-labelledby="mahaam-integrations" className="flex flex-col gap-5">
            <SectionHeader headingId="mahaam-integrations" title={M.integrations[lang]} description={M.integrationsHint[lang]} />
            <ProductList>
              {INTEGRATIONS.map((i) => (
                <ProductListItem
                  key={i.name.en}
                  icon={<AppGlyph icon={i.icon} />}
                  name={i.name[lang]}
                  description={<bdi>{i.copy[lang]}</bdi>}
                  price={<span className="text-caption text-muted-foreground">{M.included[lang]}</span>}
                />
              ))}
            </ProductList>
          </section>

          <section aria-labelledby="mahaam-related" className="flex flex-col gap-5">
            <SectionHeader headingId="mahaam-related" title={M.related[lang]} />
            <ProductGrid>
              {related.map((p) => (
                <ProductCard
                  key={p.id}
                  artwork={<ProductArtwork brand={p.brand} markSize={40} />}
                  name={p.name[lang]}
                  category={CATEGORIES.find((c) => c.id === p.category)!.label[lang]}
                  description={p.tagline[lang]}
                  meta={<Rating value={p.rating} count={p.installs} />}
                  price={<Price amount={p.price.monthly} period="month" size="sm" />}
                  action={<StoreInstall id={p.id} appName={p.name[lang]} free={p.price.monthly === 0} />}
                />
              ))}
            </ProductGrid>
          </section>

          <ProductArtwork brand="mahaam" className="flex-col gap-4 px-6 py-12 text-center">
            <ProductMark brand="mahaam" size={40} title="" />
            <h2 className="text-h1 text-foreground">{M.closing[lang]}</h2>
            <p className="max-w-md text-pretty text-body text-muted-foreground">{M.closingCopy[lang]}</p>
            <Button variant="secondary" size="lg" nativeButton={false} render={<a href={CONSOLE} target="_blank" rel="noreferrer" />}>
              {M.openConsole[lang]}
              <ArrowUpRight className="rtl:-scale-x-100" />
            </Button>
          </ProductArtwork>
        </div>
      </AppMain>
    </>
  );
}

