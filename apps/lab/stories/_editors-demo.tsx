/* Demo data for the content table, presentation and report editor stories. Nothing here talks to a server. */
import {
  ContentTableEditor,
  type ContentTableValue,
  type Deck,
  PresentationEditor,
  type Report,
  ReportEditor,
} from "@nasaq/web";
import type { ReactNode } from "react";
import { useAr, wait } from "./_profile-demo";

export { wait };

/** A saver that waits, then succeeds. Pass `fail` to make it return an error the first time. */
export const fakeSave = (ar: boolean, fail = false) => {
  let failed = false;
  return async () => {
    await wait(800);
    if (fail && !failed) {
      failed = true;
      return { error: ar ? "انقطع الاتصال بالخادم" : "The server could not be reached" };
    }
  };
};

/* ------------------------------------------------------------------ content table */

export const contentTable = (ar: boolean): ContentTableValue => ({
  columns: [
    { id: "name", label: ar ? "المنتج" : "Product", type: "text", required: true, width: 220 },
    {
      id: "category",
      label: ar ? "الفئة" : "Category",
      type: "select",
      options: [
        { value: "coffee", label: ar ? "قهوة" : "Coffee", hue: "amber" },
        { value: "tea", label: ar ? "شاي" : "Tea", hue: "green" },
        { value: "gear", label: ar ? "معدات" : "Gear", hue: "blue" },
      ],
    },
    { id: "price", label: ar ? "السعر" : "Price", type: "number", width: 120 },
    { id: "stock", label: ar ? "المخزون" : "Stock", type: "number", width: 120 },
    { id: "launch", label: ar ? "تاريخ الإطلاق" : "Launch date", type: "date", width: 160 },
    { id: "active", label: ar ? "نشط" : "Active", type: "checkbox", width: 100 },
    { id: "link", label: ar ? "الرابط" : "Link", type: "url", width: 220 },
    {
      id: "tags",
      label: ar ? "الوسوم" : "Tags",
      type: "tags",
      options: [
        { value: "organic", label: ar ? "عضوي" : "Organic", hue: "green" },
        { value: "new", label: ar ? "جديد" : "New", hue: "violet" },
        { value: "gift", label: ar ? "هدية" : "Gift", hue: "pink" },
      ],
      width: 220,
    },
  ],
  rows: [
    { id: "r1", cells: { name: ar ? "قهوة إثيوبية" : "Ethiopia Yirgacheffe", category: "coffee", price: 68, stock: 120, launch: "2026-01-12", active: true, link: "https://example.com/yirgacheffe", tags: ["organic"] } },
    { id: "r2", cells: { name: ar ? "قهوة كولومبية" : "Colombia Huila", category: "coffee", price: 59.5, stock: 84, launch: "2026-02-03", active: true, link: "https://example.com/huila", tags: ["new"] } },
    { id: "r3", cells: { name: ar ? "شاي ماتشا" : "Ceremonial matcha", category: "tea", price: 92, stock: 0, launch: "2026-03-20", active: false, link: "", tags: ["organic", "gift"] } },
    { id: "r4", cells: { name: ar ? "إبريق تقطير" : "Pour-over kettle", category: "gear", price: 210, stock: 36, launch: "2025-11-05", active: true, link: "https://example.com/kettle", tags: [] } },
    { id: "r5", cells: { name: "", category: "tea", price: 40, stock: 12, launch: "2026-04-01", active: true, link: "not a link", tags: ["new"] } },
    { id: "r6", cells: { name: ar ? "مطحنة يدوية" : "Hand grinder", category: "gear", price: 145, stock: 58, launch: "2025-12-14", active: true, link: "https://example.com/grinder", tags: ["gift"] } },
  ],
});

/* ------------------------------------------------------------------ presentation */

export const deck = (ar: boolean): Deck => ({
  title: ar ? "مراجعة الربع الثالث" : "Q3 product review",
  slides: [
    { id: "d1", layout: "title", theme: "dark", title: ar ? "مراجعة الربع الثالث" : "Q3 product review", subtitle: ar ? "فريق المنتج · أكتوبر" : "Product team · October", notes: ar ? "رحّب بالحضور وذكّرهم بأن العرض عشر دقائق." : "Welcome everyone and say the review takes ten minutes." },
    { id: "d2", layout: "content", theme: "light", title: ar ? "أبرز الإنجازات" : "What shipped", body: ar ? "محرر التقارير الجديد\nتحسين سرعة الجداول بنسبة ٤٠٪\nدعم كامل للغة العربية" : "The new report editor\nTables load 40% faster\nFull Arabic support", notes: ar ? "اذكر أن التحسين جاء من الفهرسة." : "Mention the speed-up came from indexing." },
    { id: "d3", layout: "two-column", theme: "light", title: ar ? "ما نجح وما لم ينجح" : "What worked, what did not", body: ar ? "الإطلاق المتدرج\nالتوثيق المبكر" : "Staged rollout\nEarly docs", body2: ar ? "الإشعارات المتأخرة\nنقص الاختبارات" : "Late notifications\nThin test coverage" },
    { id: "d4", layout: "quote", theme: "brand", title: "", body: ar ? "البساطة هي أقصى درجات الإتقان." : "Simplicity is the ultimate sophistication.", subtitle: ar ? "ليوناردو دا فينشي" : "Leonardo da Vinci", notes: ar ? "اربطها بهدف الربع القادم." : "Tie it to next quarter's goal." },
    { id: "d5", layout: "section", theme: "brand", title: ar ? "الخطة القادمة" : "Next quarter", subtitle: ar ? "ثلاث أولويات" : "Three priorities" },
    { id: "d6", layout: "content", theme: "light", title: ar ? "الأولويات" : "Priorities", body: ar ? "تطبيق الجوال\nالتكاملات\nلوحة التقارير" : "Mobile app\nIntegrations\nReporting dashboard" },
  ],
});

/* ------------------------------------------------------------------ report */

export const report = (ar: boolean): Report => ({
  title: ar ? "ملخص أداء مايو" : "May performance summary",
  subtitle: ar ? "أبرز الأرقام والاتجاهات لفريق المبيعات" : "Key numbers and trends for the sales team",
  author: ar ? "سارة العتيبي" : "Sara Al-Otaibi",
  date: "2026-06-02",
  blocks: [
    { id: "b1", type: "heading", level: 1, text: ar ? "نظرة عامة" : "Overview" },
    { id: "b2", type: "text", html: ar ? "<p>كان مايو <strong>أقوى شهر</strong> هذا العام. ارتفعت الإيرادات بفضل الاشتراكات السنوية، وانخفض معدل الإلغاء للمرة الثانية على التوالي.</p><ul><li>أكثر من ٣٠٠ عميل جديد</li><li>رضا العملاء ٤٫٦ من ٥</li></ul>" : "<p>May was the <strong>strongest month</strong> of the year. Revenue grew on the back of annual plans, and churn fell for the second month running.</p><ul><li>More than 300 new customers</li><li>Customer satisfaction 4.6 out of 5</li></ul>" },
    {
      id: "b3",
      type: "metrics",
      items: [
        { id: "m1", label: ar ? "الإيرادات" : "Revenue", value: 482000, currency: "SAR", delta: 0.124, deltaLabel: ar ? "مقارنة بأبريل" : "vs April" },
        { id: "m2", label: ar ? "عملاء جدد" : "New customers", value: 312, delta: 0.08 },
        { id: "m3", label: ar ? "معدل الإلغاء" : "Churn", value: 2.1, delta: -0.15 },
      ],
    },
    { id: "b4", type: "heading", level: 2, text: ar ? "الإيرادات حسب الأسبوع" : "Revenue by week" },
    {
      id: "b5",
      type: "chart",
      title: ar ? "الإيرادات الأسبوعية (بالآلاف)" : "Weekly revenue (thousands)",
      kind: "bar",
      series: [ar ? "هذا العام" : "This year", ar ? "العام الماضي" : "Last year"],
      rows: [
        { label: ar ? "الأسبوع ١" : "Week 1", values: [102, 88] },
        { label: ar ? "الأسبوع ٢" : "Week 2", values: [118, 91] },
        { label: ar ? "الأسبوع ٣" : "Week 3", values: [127, 95] },
        { label: ar ? "الأسبوع ٤" : "Week 4", values: [135, 99] },
      ],
      caption: ar ? "المصدر: لوحة المبيعات الداخلية." : "Source: internal sales dashboard.",
    },
    { id: "b6", type: "callout", tone: "warning", title: ar ? "انتبه للمخزون" : "Watch the stock", text: ar ? "نفدت ثلاثة منتجات من الأكثر مبيعاً في الأسبوع الأخير." : "Three best sellers ran out in the last week." },
    { id: "b7", type: "heading", level: 2, text: ar ? "أفضل المنتجات" : "Top products" },
    {
      id: "b8",
      type: "table",
      title: ar ? "المبيعات حسب المنتج" : "Sales by product",
      columns: [ar ? "المنتج" : "Product", ar ? "الوحدات" : "Units", ar ? "الإيراد" : "Revenue"],
      rows: [
        [ar ? "قهوة إثيوبية" : "Ethiopia Yirgacheffe", "1,240", "84,320"],
        [ar ? "شاي ماتشا" : "Ceremonial matcha", "860", "79,120"],
        [ar ? "إبريق تقطير" : "Pour-over kettle", "310", "65,100"],
      ],
    },
    { id: "b9", type: "divider" },
    { id: "b10", type: "callout", tone: "success", text: ar ? "الهدف للشهر القادم: تجاوز ٥٠٠ ألف ر.س." : "Goal for next month: pass SAR 500,000." },
  ],
});

/* ------------------------------------------------------------------ page frame */

export function PageFrame({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 p-4 sm:p-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-h2 font-semibold">{title}</h1>
          <p className="text-body-sm text-muted-foreground">{description}</p>
        </header>
        {children}
      </div>
    </div>
  );
}

export function ContentTablePage() {
  const ar = useAr();
  return (
    <PageFrame title={ar ? "كتالوج المنتجات" : "Product catalogue"} description={ar ? "عدّل الخلايا مباشرة، رتّب، ابحث ثم احفظ." : "Edit cells in place, sort, search, then save."}>
      <ContentTableEditor defaultValue={contentTable(ar)} onSave={fakeSave(ar)} maxHeight="32rem" />
    </PageFrame>
  );
}

export function PresentationPage() {
  const ar = useAr();
  return (
    <PageFrame title={ar ? "العروض التقديمية" : "Presentations"} description={ar ? "حرّر الشرائح ثم اضغط عرض." : "Edit the slides, then press Present."}>
      <PresentationEditor defaultValue={deck(ar)} onSave={fakeSave(ar)} />
    </PageFrame>
  );
}

export function ReportPage() {
  const ar = useAr();
  return (
    <PageFrame title={ar ? "التقارير" : "Reports"} description={ar ? "ابنِ التقرير من كتل ثم عاينه." : "Build the report from blocks, then preview it."}>
      <ReportEditor defaultValue={report(ar)} onSave={fakeSave(ar)} />
    </PageFrame>
  );
}
