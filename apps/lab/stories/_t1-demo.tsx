import {
  type AgentChange,
  AgentConfirm,
  type AgentStep,
  AgentSteps,
  AiCitedAnswer,
  type AiCitationSource,
  AiEvidenceCard,
  AiInsightCard,
  AiProvenance,
  AiSourceChips,
  type AiInsightAction,
  AskAiSelection,
  ArtifactList,
  ArtifactRenderer,
  Button,
  extractArtifacts,
  Markdown,
  useNasaq,
} from "@nasaq/web";
import { useRef, useState } from "react";

export const useAr = () => useNasaq().locale.startsWith("ar");

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-h4 text-foreground">{title}</h3>
        {hint ? <p className="text-body-sm text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ citations */

const SOURCES_EN: AiCitationSource[] = [
  { id: "s1", title: "Q3 revenue report", url: "https://example.com/reports/q3", kind: "PDF", locator: "p. 4", score: 0.94, quote: "Recurring revenue grew 12% year on year, led by the mid-market plan.", highlight: ["grew 12%"] },
  { id: "s2", title: "Board meeting notes", kind: "Doc", locator: "section 2", score: 0.81, quote: "Monthly churn fell to 2.1% after the onboarding changes shipped in July." },
  { id: "s3", title: "Support ticket digest", url: "https://example.com/support/digest", kind: "Web", score: 0.62, quote: "Setup questions dropped by a third since the new checklist." },
  { id: "s4", title: "Unsafe link example", url: "javascript:alert(1)", kind: "Web", score: 0.3, quote: "This source has a link that must not become clickable." },
];

const SOURCES_AR: AiCitationSource[] = [
  { id: "s1", title: "تقرير إيرادات الربع الثالث", url: "https://example.com/reports/q3", kind: "PDF", locator: "ص. 4", score: 0.94, quote: "نمت الإيرادات المتكررة بنسبة 12% على أساس سنوي بقيادة خطة الشركات المتوسطة.", highlight: ["نمت الإيرادات"] },
  { id: "s2", title: "محضر اجتماع المجلس", kind: "مستند", locator: "القسم 2", score: 0.81, quote: "انخفض معدل الإلغاء الشهري إلى 2.1% بعد إطلاق تحسينات التهيئة في يوليو." },
  { id: "s3", title: "ملخص تذاكر الدعم", url: "https://example.com/support/digest", kind: "ويب", score: 0.62, quote: "انخفضت أسئلة الإعداد بمقدار الثلث منذ قائمة التحقق الجديدة." },
  { id: "s4", title: "مثال رابط غير آمن", url: "javascript:alert(1)", kind: "ويب", score: 0.3, quote: "هذا المصدر رابطه لا يجب أن يصبح قابلًا للنقر." },
];

const CITED_EN = `Recurring revenue grew **12%** year on year [1], and monthly churn fell to 2.1% [2].

Support load is also lighter: setup questions dropped by about a third [3, 4].

Next quarter looks steady, though this last paragraph has no source, so treat it as the model's own estimate.`;

const CITED_AR = `نمت الإيرادات المتكررة بنسبة **12%** على أساس سنوي [1]، وانخفض معدل الإلغاء الشهري إلى 2.1% [2].

كما خفّ ضغط الدعم: انخفضت أسئلة الإعداد بمقدار الثلث تقريبًا [3، 4].

يبدو الربع القادم مستقرًا، لكن هذه الفقرة الأخيرة بلا مصدر، فاعتبرها تقدير النموذج نفسه.`;

/** The full answer with markers, chips, evidence and provenance. */
export function CitationsDemo({ ungrounded }: { ungrounded?: boolean }) {
  const ar = useAr();
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const sources = ar ? SOURCES_AR : SOURCES_EN;
  return (
    <AiCitedAnswer
      text={ar ? CITED_AR.replace("[3، 4]", "[3, 4]") : CITED_EN}
      sources={ungrounded ? [] : sources}
      provenance={{
        model: "claude-sonnet-5",
        latencyMs: 1240,
        grounded: !ungrounded,
        sourceCount: ungrounded ? 0 : sources.length,
        tokens: { input: 2140, output: 186 },
        retrieved: 12,
        at: new Date("2026-09-30T09:30:00Z"),
        confidence: ungrounded ? 0.41 : 0.86,
        extra: [{ label: ar ? "الفهرس" : "Index", value: "kb-v3" }],
      }}
      feedback={feedback}
      onFeedback={setFeedback}
      defaultEvidenceOpen={false}
    />
  );
}

/** The parts on their own: chips with a shared highlight, an evidence card, a provenance line. */
export function CitationPartsDemo() {
  const ar = useAr();
  const sources = ar ? SOURCES_AR : SOURCES_EN;
  const [active, setActive] = useState<string | null>(null);
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Section title={ar ? "شرائح المصادر" : "Source chips"} hint={ar ? "مرّر أو اضغط لتمييز المصدر." : "Hover or press to highlight a source."}>
        <AiSourceChips sources={sources} citedIds={["s1", "s2"]} activeId={active} onActiveChange={setActive} />
      </Section>
      <Section title={ar ? "بطاقة دليل" : "Evidence card"}>
        <div className="grid gap-3 sm:grid-cols-2">
          <AiEvidenceCard source={sources[0] as AiCitationSource} index={1} active={active === "s1"} />
          <AiEvidenceCard source={sources[1] as AiCitationSource} index={2} active={active === "s2"} />
        </div>
      </Section>
      <Section title={ar ? "سطر المصدر والأصل" : "Provenance line"}>
        <AiProvenance model="claude-sonnet-5" latencyMs={480} grounded sourceCount={3} confidence={0.72} defaultOpen />
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------ agent steps + confirm */

function stepsFor(ar: boolean, phase: "confirm" | "running" | "done" | "failed"): AgentStep[] {
  const L = (en: string, a: string) => (ar ? a : en);
  const base: AgentStep[] = [
    {
      id: "a",
      label: L("Search the tag list", "البحث في قائمة الوسوم"),
      tool: "tags.search",
      status: "done",
      durationMs: 320,
      args: { query: "billing", limit: 20, apiKey: "sk-live-12345" },
      result: JSON.stringify({ count: 3, tags: ["billing", "Billing", "bills"] }, null, 2),
    },
    {
      id: "b",
      label: L("Find duplicate tags", "إيجاد الوسوم المكررة"),
      tool: "tags.dedupe",
      status: "done",
      durationMs: 910,
      args: { strategy: "case-insensitive" },
      result: "2 duplicates found",
    },
  ];
  if (phase === "confirm")
    return [...base, { id: "c", label: L("Apply the cleanup", "تطبيق التنظيف"), tool: "tags.apply", status: "awaiting", args: { dryRun: false } }, { id: "d", label: L("Post a summary in #ops", "نشر ملخص في #ops"), tool: "chat.post", status: "pending" }];
  if (phase === "running") return [...base, { id: "c", label: L("Apply the cleanup", "تطبيق التنظيف"), tool: "tags.apply", status: "running", args: { dryRun: false } }, { id: "d", label: L("Post a summary in #ops", "نشر ملخص في #ops"), tool: "chat.post", status: "pending" }];
  if (phase === "failed")
    return [
      ...base,
      { id: "c", label: L("Apply the cleanup", "تطبيق التنظيف"), tool: "tags.apply", status: "error", durationMs: 1400, args: { dryRun: false }, error: L("The tags service timed out.", "انتهت مهلة خدمة الوسوم.") },
      { id: "d", label: L("Post a summary in #ops", "نشر ملخص في #ops"), tool: "chat.post", status: "skipped" },
    ];
  return [
    ...base,
    { id: "c", label: L("Apply the cleanup", "تطبيق التنظيف"), tool: "tags.apply", status: "done", durationMs: 640, args: { dryRun: false }, result: '{"renamed":2,"deleted":1}' },
    { id: "d", label: L("Post a summary in #ops", "نشر ملخص في #ops"), tool: "chat.post", status: "done", durationMs: 210, result: "ok" },
  ];
}

export function agentChanges(ar: boolean): AgentChange[] {
  const L = (en: string, a: string) => (ar ? a : en);
  return [
    { id: "c1", title: L("Rename tag", "إعادة تسمية وسم"), target: "tags/billing", description: L("Merge the casing variants.", "دمج اختلافات حالة الأحرف."), risk: "low", before: 'name: "Billing"\ncolor: "blue"\nowner: "finance"', after: 'name: "billing"\ncolor: "blue"\nowner: "finance"' },
    { id: "c2", title: L("Create tag", "إنشاء وسم"), target: "tags/invoices", risk: "low", after: 'name: "invoices"\ncolor: "green"' },
    { id: "c3", title: L("Delete 14 archived contacts", "حذف 14 جهة اتصال مؤرشفة"), target: "contacts/archived", description: L("This cannot be undone.", "لا يمكن التراجع عن هذا."), risk: "high", before: "count: 14\nstatus: archived\nlast_seen: 2023-01-04" },
  ];
}

/** A run that stops for confirmation. Apply or Reject moves the run along. */
export function AgentConfirmDemo({ failApply }: { failApply?: boolean }) {
  const ar = useAr();
  const [phase, setPhase] = useState<"confirm" | "running" | "done" | "failed">("confirm");
  const [log, setLog] = useState<string>("");
  const tries = useRef(0);
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <AgentSteps
        steps={stepsFor(ar, phase)}
        redactKeys={["apikey"]}
        defaultOpenIds={["a"]}
        onRetry={() => {
          setPhase("running");
          void wait(900).then(() => setPhase("done"));
        }}
        renderConfirm={() => (
          <AgentConfirm
            changes={agentChanges(ar)}
            summary={ar ? "سأنظّف الوسوم المكررة وأحذف جهات الاتصال المؤرشفة." : "I will clean up duplicate tags and remove archived contacts."}
            requireReason
            onApply={async (ids) => {
              await wait(700);
              tries.current += 1;
              if (failApply && tries.current === 1) return { error: ar ? "تعذّر التطبيق. حاول مرة أخرى." : "Could not apply. Try again." };
              setLog(ids.join(", "));
              setPhase("running");
              void wait(1200).then(() => setPhase("done"));
            }}
            onReject={async () => {
              await wait(400);
              setPhase("failed");
            }}
          />
        )}
      />
      <div className="flex flex-wrap items-center gap-2 text-caption text-muted-foreground">
        <Button size="sm" variant="ghost" onClick={() => setPhase("confirm")}>
          {ar ? "أعد التشغيل" : "Reset run"}
        </Button>
        {log ? <span dir="ltr">applied: {log}</span> : null}
      </div>
    </div>
  );
}

/** A finished run and a failed run, static, for reading the details. */
export function AgentStatesDemo() {
  const ar = useAr();
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <AgentSteps title={ar ? "تشغيل ناجح" : "Finished run"} steps={stepsFor(ar, "done")} redactKeys={["apikey"]} />
      <AgentSteps title={ar ? "تشغيل فشل" : "Failed run"} steps={stepsFor(ar, "failed")} onRetry={() => undefined} defaultOpenIds={["c"]} />
      <AgentSteps title={ar ? "قيد العمل" : "Working"} steps={stepsFor(ar, "running")} />
    </div>
  );
}

/** Just the confirm card, the way it sits in a side panel. */
export function AgentConfirmOnlyDemo() {
  const ar = useAr();
  return (
    <AgentConfirm
      changes={agentChanges(ar)}
      summary={ar ? "سأنظّف الوسوم المكررة." : "I will clean up duplicate tags."}
      defaultUnchecked={["c3"]}
      onApply={async () => {
        await wait(600);
      }}
      onReject={async () => {
        await wait(300);
      }}
    />
  );
}

/* ------------------------------------------------------------------ artifacts */

export function artifactSamples(): { id: string; en: string; ar: string; value: unknown }[] {
  return [
    {
      id: "card",
      en: "Card",
      ar: "بطاقة",
      value: {
        kind: "card",
        id: "deal",
        title: { en: "Acme renewal", ar: "تجديد أكمي" },
        description: { en: "Closes on Oct 14", ar: "يُغلق في 14 أكتوبر" },
        badges: [{ label: { en: "At risk", ar: "في خطر" }, tone: "warning" }, { label: "USD", tone: "neutral" }],
        fields: [
          { label: { en: "Value", ar: "القيمة" }, value: 48000 },
          { label: { en: "Owner", ar: "المسؤول" }, value: "Salma" },
          { label: { en: "Stage", ar: "المرحلة" }, value: "Negotiation" },
        ],
        items: [
          { label: { en: "Champion left", ar: "غادر المسؤول عن العلاقة" }, description: { en: "September 12", ar: "12 سبتمبر" }, tone: "danger" },
          { label: { en: "Usage is up", ar: "الاستخدام في ازدياد" }, value: "+18%", tone: "success" },
          { label: { en: "Open tickets", ar: "التذاكر المفتوحة" }, value: 4, tone: "warning" },
        ],
        body: { en: "Champion left in September. **Book a call** with the new contact.", ar: "غادر المسؤول عن العلاقة في سبتمبر. **احجز مكالمة** مع جهة الاتصال الجديدة." },
        footer: { en: "From the CRM, updated 2 hours ago", ar: "من نظام إدارة العملاء، حُدّث قبل ساعتين" },
        actions: [
          { id: "call", label: { en: "Book a call", ar: "احجز مكالمة" }, variant: "primary" },
          { id: "drop", label: { en: "Mark lost", ar: "تعيين كخسارة" }, variant: "danger", confirm: { en: "Mark this deal as lost?", ar: "تعيين هذه الصفقة كخسارة؟" } },
        ],
      },
    },
    {
      id: "table",
      en: "Table",
      ar: "جدول",
      value: {
        kind: "table",
        title: { en: "Overdue invoices", ar: "فواتير متأخرة" },
        columns: [
          { key: "no", label: { en: "No.", ar: "الرقم" } },
          { key: "client", label: { en: "Client", ar: "العميل" } },
          { key: "amount", label: { en: "Amount", ar: "المبلغ" }, align: "end" },
          { key: "late", label: { en: "Days late", ar: "أيام التأخر" }, align: "end" },
        ],
        rows: [
          { no: "INV-1042", client: "Acme", amount: 12400, late: 12 },
          { no: "INV-1038", client: "Globex", amount: 8300, late: 31 },
          { no: "INV-1029", client: "Initech", amount: 2150, late: 47 },
        ],
      },
    },
    {
      id: "chart",
      en: "Chart",
      ar: "رسم بياني",
      value: {
        kind: "chart",
        title: { en: "Signups by week", ar: "التسجيلات حسب الأسبوع" },
        chart: "bar",
        xKey: "week",
        series: [
          { key: "web", label: { en: "Web", ar: "الويب" } },
          { key: "mobile", label: { en: "Mobile", ar: "الجوال" }, color: "var(--nq-tag-teal)" },
        ],
        data: [
          { week: "W1", web: 120, mobile: 80 },
          { week: "W2", web: 140, mobile: 96 },
          { week: "W3", web: 132, mobile: 60 },
          { week: "W4", web: 160, mobile: 52 },
        ],
      },
    },
    {
      id: "stats",
      en: "Stats",
      ar: "مؤشرات",
      value: {
        kind: "stats",
        title: { en: "This week", ar: "هذا الأسبوع" },
        items: [
          { label: { en: "Signups", ar: "التسجيلات" }, value: 552, delta: 0.124, sparkline: [380, 410, 395, 450, 470, 520, 552] },
          { label: { en: "Churn", ar: "الإلغاء" }, value: "2.1%", delta: -0.08, invert: true, sparkline: [2.6, 2.5, 2.4, 2.3, 2.2, 2.1] },
          { label: { en: "Failed payments", ar: "مدفوعات فاشلة" }, value: 14, tone: "danger" },
        ],
      },
    },
    {
      id: "donut",
      en: "Donut",
      ar: "دائري",
      value: {
        kind: "chart",
        title: { en: "Orders by channel", ar: "الطلبات حسب القناة" },
        chart: "donut",
        xKey: "channel",
        series: [{ key: "orders", label: { en: "Orders", ar: "الطلبات" } }],
        data: [
          { channel: "Web", orders: 420 },
          { channel: "iOS", orders: 260 },
          { channel: "Android", orders: 210 },
          { channel: "Phone", orders: 60 },
        ],
      },
    },
    {
      id: "markdown",
      en: "Markdown",
      ar: "ماركداون",
      value: {
        kind: "markdown",
        text: "### Next steps\n\n- Call the **new contact**\n- Send the revised quote\n\n<script>alert('raw html is dropped')</script>",
      },
    },
    {
      id: "code",
      en: "Code",
      ar: "كود",
      value: { kind: "code", title: { en: "Query", ar: "الاستعلام" }, language: "sql", filename: "overdue.sql", code: "select no, client, amount\nfrom invoices\nwhere due < now() and paid = false\norder by due;" },
    },
    {
      id: "picker",
      en: "Picker",
      ar: "منتقي",
      value: {
        kind: "picker",
        id: "slot",
        title: { en: "Pick a time", ar: "اختر وقتًا" },
        mode: "single",
        options: [
          { value: "mon", label: { en: "Monday 10:00", ar: "الاثنين 10:00" }, description: { en: "30 minutes", ar: "30 دقيقة" } },
          { value: "tue", label: { en: "Tuesday 14:30", ar: "الثلاثاء 14:30" } },
          { value: "wed", label: { en: "Wednesday 09:00", ar: "الأربعاء 09:00" } },
        ],
        submitLabel: { en: "Confirm time", ar: "تأكيد الوقت" },
      },
    },
    {
      id: "multi",
      en: "Multi picker",
      ar: "منتقي متعدد",
      value: {
        kind: "picker",
        id: "channels",
        title: { en: "Notify which channels?", ar: "إشعار أي القنوات؟" },
        mode: "multiple",
        defaultValue: ["email"],
        options: [
          { value: "email", label: { en: "Email", ar: "البريد" } },
          { value: "sms", label: "SMS" },
          { value: "push", label: { en: "Push", ar: "الإشعارات" } },
        ],
      },
    },
    {
      id: "actions",
      en: "Actions",
      ar: "إجراءات",
      value: { kind: "actions", title: { en: "What next?", ar: "ما التالي؟" }, actions: [{ id: "a", label: { en: "Send reminder", ar: "إرسال تذكير" }, variant: "primary" }, { id: "b", label: { en: "Snooze", ar: "تأجيل" }, variant: "secondary" }, { id: "c", label: { en: "Delete all", ar: "حذف الكل" }, variant: "danger", confirm: { en: "Delete every overdue invoice?", ar: "حذف كل الفواتير المتأخرة؟" } }] },
    },
  ];
}

const HTML_SAMPLE = {
  kind: "html",
  title: "HTML preview",
  height: 140,
  html: '<div style="font-family:sans-serif;padding:12px"><h3>Sandboxed</h3><p>Scripts and links inside do not run.</p><script>parent.document.title = "pwned"</script><img src="https://example.com/x.png" onerror="alert(1)"></div>',
};

/** Every kind, with the events logged under it. Includes a bad payload and an HTML artifact. */
export function ArtifactGalleryDemo() {
  const ar = useAr();
  const [log, setLog] = useState<string[]>([]);
  const [allowHtml, setAllowHtml] = useState(false);
  const push = (s: string) => setLog((l) => [s, ...l].slice(0, 5));
  const samples = artifactSamples();
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        {samples.map((s) => (
          <div key={s.id} className="min-w-0">
            <ArtifactRenderer
              artifact={s.value}
              onAction={async (id) => {
                push(`action: ${id}`);
                await wait(300);
              }}
              onPick={async (values) => {
                push(`pick: ${values.join(", ")}`);
                await wait(300);
              }}
            />
          </div>
        ))}
      </div>
      <Section title={ar ? "مخرجات غير صالحة" : "Invalid output"} hint={ar ? "نوع غير معروف وبيانات ناقصة تظهر كتحذير." : "An unknown kind and a missing field show as a warning."}>
        <div className="grid gap-3 sm:grid-cols-2">
          <ArtifactRenderer artifact={{ kind: "hologram" }} />
          <ArtifactRenderer artifact={{ kind: "table", columns: [{ key: "a", label: "A" }] }} />
        </div>
      </Section>
      <Section title="HTML" hint={ar ? "مغلق افتراضيًا ويظهر ككود. عند التفعيل يعمل في إطار معزول بلا سكربت." : "Off by default and shown as code. When enabled it runs in a sandboxed frame with no script."}>
        <label className="flex items-center gap-2 text-body-sm">
          <input type="checkbox" checked={allowHtml} onChange={(e) => setAllowHtml(e.target.checked)} />
          allowHtml
        </label>
        <ArtifactRenderer artifact={HTML_SAMPLE} allowHtml={allowHtml} />
      </Section>
      <p dir="ltr" className="min-h-5 text-caption text-muted-foreground" aria-live="polite">
        {log.length ? log.join("  |  ") : ar ? "لا أحداث بعد" : "No events yet"}
      </p>
    </div>
  );
}

const ANSWER_WITH_BLOCKS_EN = `Here is the overdue picture. Three invoices are late and one deal is at risk.

\`\`\`artifact
{"kind":"stats","items":[{"label":"Overdue","value":22850,"delta":0.06,"invert":true},{"label":"Invoices","value":3}]}
\`\`\`

I also suggest calling the client today.

\`\`\`artifact
{"kind":"actions","actions":[{"id":"call","label":"Call the client","variant":"primary"}]}
\`\`\`

\`\`\`artifact
{"kind":"broken",
\`\`\``;

const ANSWER_WITH_BLOCKS_AR = `هذه صورة المتأخرات. ثلاث فواتير متأخرة وصفقة واحدة في خطر.

\`\`\`artifact
{"kind":"stats","items":[{"label":"متأخر","value":22850,"delta":0.06,"invert":true},{"label":"الفواتير","value":3}]}
\`\`\`

أقترح أيضًا الاتصال بالعميل اليوم.

\`\`\`artifact
{"kind":"actions","actions":[{"id":"call","label":"اتصل بالعميل","variant":"primary"}]}
\`\`\`

\`\`\`artifact
{"kind":"broken",
\`\`\``;

/** An answer with fenced artifact blocks: the prose renders as Markdown, each block as a component. */
export function ArtifactAnswerDemo() {
  const ar = useAr();
  const { text, artifacts } = extractArtifacts(ar ? ANSWER_WITH_BLOCKS_AR : ANSWER_WITH_BLOCKS_EN);
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Markdown>{text}</Markdown>
      <ArtifactList artifacts={artifacts} />
    </div>
  );
}

/* ------------------------------------------------------------------ ask ai + insight */

const ARTICLE_EN = [
  "Retention is the share of customers who are still active after a given period. It is usually tracked by cohort: everyone who signed up in the same month is followed together, so a drop can be tied to something that changed for that group.",
  "Net revenue retention goes a step further. It counts upgrades, downgrades and cancellations, so a company can retain more than 100% of its revenue even when some customers leave, as long as the rest expand.",
  "Try selecting a sentence and press Ask AI. You can also press Ctrl+Shift+Space with text selected.",
];
const ARTICLE_AR = [
  "الاحتفاظ بالعملاء هو نسبة العملاء الذين ما زالوا نشطين بعد فترة محددة. يُتتبع عادةً بحسب الفوج: يُتابَع كل من سجّل في الشهر نفسه معًا، فيمكن ربط أي انخفاض بشيء تغيّر لتلك المجموعة.",
  "يذهب الاحتفاظ بصافي الإيرادات خطوة أبعد. فهو يحتسب الترقيات والتخفيضات والإلغاءات، ولذلك قد تحتفظ الشركة بأكثر من 100% من إيراداتها حتى لو غادر بعض العملاء، ما دام الباقون يوسّعون اشتراكاتهم.",
  "جرّب تحديد جملة ثم اضغط اسأل الذكاء الاصطناعي. يمكنك أيضًا الضغط على Ctrl+Shift+Space أثناء تحديد النص.",
];

export function AskAiDemo({ failFirst }: { failFirst?: boolean }) {
  const ar = useAr();
  const tries = useRef(0);
  const [replaced, setReplaced] = useState<string | null>(null);
  const paragraphs = ar ? ARTICLE_AR : ARTICLE_EN;
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <AskAiSelection
        className="flex flex-col gap-3 text-body text-foreground"
        onReplace={(answer) => setReplaced(answer)}
        onAsk={async ({ prompt, selection, actionId }) => {
          await wait(900);
          tries.current += 1;
          if (failFirst && tries.current === 1) throw new Error(ar ? "انتهت مهلة النموذج." : "The model timed out.");
          const short = selection.length > 60 ? `${selection.slice(0, 60)}...` : selection;
          if (ar) return `**${actionId ?? "سؤال"}**: ${prompt}\n\nالنص المحدد يتحدث عن "${short}". باختصار، الفكرة أن القياس يتم لكل فوج ثم تُقارن النتائج عبر الزمن.`;
          return `**${actionId ?? "Question"}**: ${prompt}\n\nThe passage "${short}" is about measuring a group over time. In short, follow each cohort separately, then compare them.`;
        }}
      >
        {paragraphs.map((p) => (
          <p key={p.slice(0, 20)}>{p}</p>
        ))}
        <p data-ask-ai-ignore className="rounded-control border border-dashed border-border p-2 text-body-sm text-muted-foreground">
          {ar ? "هذه الفقرة لا تفتح النافذة (data-ask-ai-ignore)." : "This paragraph never opens the popover (data-ask-ai-ignore)."}
        </p>
      </AskAiSelection>
      {replaced ? (
        <p className="rounded-control bg-secondary p-2 text-body-sm">
          {ar ? "تم استدعاء الاستبدال:" : "Replace called with:"} <span dir="auto">{replaced.slice(0, 80)}</span>
        </p>
      ) : null}
    </div>
  );
}

const INSIGHT_ACTIONS = (ar: boolean): AiInsightAction[] => [
  { id: "funnel", label: ar ? "افتح مسار التحويل" : "Open the funnel", variant: "primary" },
  { id: "snooze", label: ar ? "ذكّرني لاحقًا" : "Remind me later" },
];

export function InsightDemo() {
  const ar = useAr();
  const [dismissed, setDismissed] = useState(false);
  const [fb, setFb] = useState<"up" | "down" | null>(null);
  const [last, setLast] = useState("");
  const [loading, setLoading] = useState(false);
  return (
    <div className="flex min-w-0 flex-col gap-4">
      {!dismissed ? (
        <AiInsightCard
          title={ar ? "انخفضت التسجيلات عبر الجوال بنسبة 18%" : "Signups fell 18% on mobile"}
          tone="warning"
          model="claude-sonnet-5"
          metric={{ label: ar ? "تسجيلات الجوال" : "Mobile signups", value: 1240, delta: -0.18 }}
          body={
            ar
              ? "يبدأ الانخفاض في يوم إطلاق النموذج الجديد. **الخطوة الثالثة** هي الأكثر تركًا. راجع حقل رقم الهاتف."
              : "The drop starts the day the new form shipped. **Step 3** loses the most people. Review the phone number field."
          }
          confidence={0.78}
          sources={(ar ? SOURCES_AR : SOURCES_EN).slice(0, 2)}
          actions={INSIGHT_ACTIONS(ar)}
          onAction={(id) => setLast(id)}
          onAsk={() => setLast("ask")}
          onDismiss={() => setDismissed(true)}
          feedback={fb}
          onFeedback={setFb}
        />
      ) : (
        <Button variant="secondary" onClick={() => setDismissed(false)}>
          {ar ? "أعد إظهار الرؤية" : "Show the insight again"}
        </Button>
      )}
      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        <AiInsightCard
          tone="success"
          title={ar ? "انخفضت تكلفة الدعم" : "Support cost is down"}
          metric={{ label: ar ? "التكلفة لكل تذكرة" : "Cost per ticket", value: 4.2, format: { style: "currency", currency: "USD" }, delta: -0.1, invert: true }}
          body={ar ? "قائمة التحقق الجديدة قلّلت الأسئلة المتكررة." : "The new checklist cut repeat questions."}
        />
        <AiInsightCard tone="danger" title={ar ? "3 فواتير تجاوزت 30 يومًا" : "3 invoices are over 30 days late"} body={ar ? "أكبرها لدى **Globex**." : "The largest is **Globex**."} confidence={0.95} />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-caption text-muted-foreground">{ar ? "بلا إطار" : "Inline variant"}</span>
        <AiInsightCard variant="inline" tone="info" title={ar ? "الأسبوع القادم أهدأ عادةً" : "Next week is usually quieter"} body={ar ? "مقارنة بآخر 8 أسابيع." : "Compared with the last 8 weeks."} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setLoading(true);
            void wait(1800).then(() => setLoading(false));
          }}
        >
          {ar ? "حلّل مرة أخرى" : "Analyze again"}
        </Button>
        {last ? (
          <span dir="ltr" className="text-caption text-muted-foreground">
            event: {last}
          </span>
        ) : null}
      </div>
      <AiInsightCard loading={loading} title={ar ? "جارٍ تحليل الأداء" : "Analyzing performance"} body="x" />
    </div>
  );
}
