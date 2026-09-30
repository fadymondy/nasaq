/* Fake billing and time data plus the four full-page demos (checkout, invoices, wallet, time tracking). Nothing here talks to a server. */
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  CheckoutSteps,
  type CheckoutPlan,
  type InvoiceData,
  InvoiceList,
  type InvoiceStatus,
  type InvoiceSummary,
  InvoiceView,
  type PaymentRecord,
  type RunningTimer,
  StatCard,
  StatGrid,
  type TimeEntry,
  TimeEntryList,
  type TimeProject,
  TimeTracker,
  Timesheet,
  useChartAxis,
  Wallet,
  type WalletTransaction,
} from "@nasaq/web";
import { ArrowLeft, Clock, Timer, Wallet as WalletIcon } from "lucide-react";
import { type ReactNode, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useAr, wait } from "./_profile-demo";

/* ------------------------------------------------------------------ shared */

const DAY = 86_400_000;
const daysAgo = (n: number, hour = 10) => {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return new Date(d.getTime() - n * DAY);
};
const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** The page frame: a title, a line under it and the content, capped to a readable width. */
export function BillingPage({ title, description, children, wide }: { title: string; description: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen bg-background">
      <div className={`mx-auto flex w-full flex-col gap-6 p-4 sm:p-8 ${wide ? "max-w-6xl" : "max-w-5xl"}`}>
        <header className="flex flex-col gap-1">
          <h1 className="text-title-lg text-foreground">{title}</h1>
          <p className="text-body text-muted-foreground">{description}</p>
        </header>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ checkout */

export const checkoutPlans = (ar: boolean): CheckoutPlan[] => [
  {
    id: "starter",
    name: ar ? "المبتدئ" : "Starter",
    description: ar ? "للأفراد والمشاريع الصغيرة" : "For individuals and small projects",
    monthlyPrice: 19,
    yearlyPrice: 190,
    features: ar ? ["3 مشاريع", "دعم بالبريد", "5 جيجابايت تخزين"] : ["3 projects", "Email support", "5 GB storage"],
  },
  {
    id: "team",
    name: ar ? "الفريق" : "Team",
    description: ar ? "للفرق التي تنمو" : "For growing teams",
    monthlyPrice: 49,
    yearlyPrice: 490,
    badge: ar ? "الأكثر شعبية" : "Most popular",
    highlighted: true,
    features: ar ? ["مشاريع غير محدودة", "دعم ذو أولوية", "100 جيجابايت تخزين"] : ["Unlimited projects", "Priority support", "100 GB storage"],
  },
  {
    id: "business",
    name: ar ? "الأعمال" : "Business",
    description: ar ? "للمؤسسات" : "For organisations",
    monthlyPrice: 129,
    yearlyPrice: 1290,
    features: ar ? ["تسجيل دخول موحّد", "سجل تدقيق", "1 تيرابايت تخزين"] : ["Single sign-on", "Audit log", "1 TB storage"],
  },
];

export function CheckoutPage() {
  const ar = useAr();
  return (
    <BillingPage title={ar ? "اشتراك جديد" : "Subscribe"} description={ar ? "اختر خطتك وأكمل الدفع في أربع خطوات." : "Choose your plan and pay in four steps."}>
      <CheckoutSteps
        plans={checkoutPlans(ar)}
        currency={ar ? "SAR" : "USD"}
        taxRate={0.15}
        taxLabel={ar ? "ضريبة القيمة المضافة" : "VAT"}
        defaultPlanId="team"
        defaultBilling={{ name: ar ? "سارة الأحمد" : "Sara Ahmed", email: "sara@example.com" }}
        bankDetails={<span dir="ltr">SA03 8000 0000 6080 1016 7519</span>}
        onComplete={async () => {
          await wait(900);
          return { reference: "SUB-2026-1042" };
        }}
        onDone={() => undefined}
      />
    </BillingPage>
  );
}

/* ------------------------------------------------------------------ invoices */

const STATUSES: InvoiceStatus[] = ["open", "overdue", "paid", "paid", "paid", "paid", "draft", "void", "paid", "refunded"];

export const demoInvoices = (): InvoiceSummary[] =>
  STATUSES.map((status, i) => ({
    id: `inv-${i + 1}`,
    number: `INV-2026-${String(42 - i).padStart(4, "0")}`,
    customer: ["Acme Co", "Globex", "Initech", "Umbrella", "Hooli"][i % 5],
    issueDate: daysAgo(i * 30 + 3),
    dueDate: daysAgo(i * 30 - 27),
    amount: [281.75, 640, 281.75, 1150, 281.75, 90, 470, 200, 281.75, 320][i]!,
    status,
  }));

export const demoPayments = (): PaymentRecord[] => [
  { id: "pay-1", date: daysAgo(31), amount: 281.75, status: "succeeded", method: "Visa 4242", invoiceNumber: "INV-2026-0040", reference: "ch_3Pq81x" },
  { id: "pay-2", date: daysAgo(61), amount: 1150, status: "succeeded", method: "Bank transfer", invoiceNumber: "INV-2026-0039", reference: "TRX-88231" },
  { id: "pay-3", date: daysAgo(92), amount: 281.75, status: "failed", method: "Visa 4242", invoiceNumber: "INV-2026-0038", reference: "ch_3Pd02a" },
  { id: "pay-4", date: daysAgo(93), amount: 281.75, status: "succeeded", method: "Mastercard 4444", invoiceNumber: "INV-2026-0038", reference: "ch_3Pd4Qz" },
  { id: "pay-5", date: daysAgo(2), amount: 90, status: "pending", method: "Bank transfer", reference: "TRX-90112" },
];

export function invoiceFor(summary: InvoiceSummary, ar: boolean): InvoiceData {
  const net = summary.amount / 1.15;
  return {
    number: summary.number,
    status: summary.status,
    issueDate: summary.issueDate,
    dueDate: summary.dueDate,
    currency: ar ? "SAR" : "USD",
    taxRate: 0.15,
    from: {
      name: ar ? "نسق للتقنية" : "Nasaq Technologies",
      address: ar ? ["طريق الملك فهد", "الرياض 12211", "المملكة العربية السعودية"] : ["1 King Fahd Road", "Riyadh 12211", "Saudi Arabia"],
      email: "billing@nasaq.example",
      taxId: "300000000000003",
    },
    to: {
      name: summary.customer ?? "Acme Co",
      address: ar ? ["شارع التحلية", "جدة 21411"] : ["22 Tahlia Street", "Jeddah 21411"],
      email: "accounts@acme.example",
    },
    lines: [
      { id: "l1", description: ar ? "اشتراك خطة الفريق" : "Team plan subscription", details: ar ? "5 مقاعد، شهر واحد" : "5 seats, 1 month", quantity: 5, unitPrice: Math.round((net / 5) * 100) / 100 },
    ],
    payments: summary.status === "paid" ? [{ id: "p1", date: summary.issueDate, method: "Visa 4242", amount: summary.amount }] : [],
    notes: ar ? "شكرًا لتعاملكم معنا." : "Thank you for your business.",
    terms: ar ? "الدفع خلال 30 يومًا من تاريخ الإصدار." : "Payment is due within 30 days of the issue date.",
  };
}

const MONTHS_EN = ["Apr", "May", "Jun", "Jul", "Aug", "Sep"];
const MONTHS_AR = ["أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر"];
const BILLED = [1240, 1810, 1530, 2210, 1980, 2460];

function BilledChart() {
  const ar = useAr();
  const { xAxis, yAxis } = useChartAxis();
  const config: ChartConfig = { billed: { label: ar ? "المفوتر" : "Billed" } };
  const data = (ar ? MONTHS_AR : MONTHS_EN).map((month, i) => ({ month, billed: BILLED[i]! }));
  return (
    <Card>
      <CardHeader>
        <CardTitle>{ar ? "المفوتر شهريًا" : "Billed per month"}</CardTitle>
        <CardDescription>{ar ? "آخر ستة أشهر" : "Last six months"}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} label={ar ? "مخطط أعمدة للمبالغ المفوترة شهريًا" : "Bar chart of the amount billed each month"} className="aspect-auto h-48">
          <BarChart data={data} margin={{ left: 4, right: 4 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} {...xAxis} />
            <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => `${v / 1000}k`} {...yAxis} />
            <ChartTooltip content={<ChartTooltipContent config={config} valueFormat={{ style: "currency", currency: ar ? "SAR" : "USD", maximumFractionDigits: 0 }} />} />
            <Bar dataKey="billed" fill="var(--color-billed)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export function InvoicesPage() {
  const ar = useAr();
  const [open, setOpen] = useState<InvoiceSummary | null>(null);
  const invoices = demoInvoices();
  const currency = ar ? "SAR" : "USD";
  if (open) {
    return (
      <BillingPage title={open.number} description={ar ? "عرض الفاتورة" : "Invoice"}>
        <div>
          <Button variant="ghost" onClick={() => setOpen(null)}>
            <ArrowLeft aria-hidden="true" className="rtl:rotate-180" />
            {ar ? "كل الفواتير" : "All invoices"}
          </Button>
        </div>
        <InvoiceView
          invoice={invoiceFor(open, ar)}
          onDownload={async () => {
            await wait(700);
          }}
          onPay={() => undefined}
        />
      </BillingPage>
    );
  }
  return (
    <BillingPage title={ar ? "الفواتير والمدفوعات" : "Invoices and payments"} description={ar ? "سجل الفوترة لحسابك." : "The billing history of your account."}>
      <BilledChart />
      <InvoiceList
        invoices={invoices}
        payments={demoPayments()}
        currency={currency}
        onOpen={setOpen}
        onPay={() => undefined}
        onDownload={async () => {
          await wait(700);
        }}
      />
    </BillingPage>
  );
}

/* ------------------------------------------------------------------ wallet */

const demoTransactions = (ar: boolean): WalletTransaction[] => [
  { id: "t1", type: "topup", amount: 500, status: "completed", date: daysAgo(0, 9), description: ar ? "شحن الرصيد" : "Top-up", reference: "TX-88120" },
  { id: "t2", type: "payment", amount: -84.5, status: "completed", date: daysAgo(0, 8), description: ar ? "دفع فاتورة INV-2026-0041" : "Payment for INV-2026-0041", reference: "TX-88101" },
  { id: "t3", type: "payout", amount: -300, status: "pending", date: daysAgo(1, 15), description: ar ? "سحب إلى البنك" : "Withdrawal to bank", reference: "TX-88044" },
  { id: "t4", type: "refund", amount: 42, status: "completed", date: daysAgo(3, 11), description: ar ? "استرداد الطلب 1187" : "Refund for order 1187", reference: "TX-87910" },
  { id: "t5", type: "fee", amount: -2.5, status: "completed", date: daysAgo(3, 11), description: ar ? "رسوم المعالجة" : "Processing fee" },
  { id: "t6", type: "topup", amount: 250, status: "failed", date: daysAgo(5, 14), description: ar ? "شحن الرصيد" : "Top-up", reference: "TX-87702" },
];

export function WalletPage() {
  const ar = useAr();
  const [balance, setBalance] = useState(1250.5);
  const [transactions, setTransactions] = useState(() => demoTransactions(ar));
  const push = (tx: Omit<WalletTransaction, "id" | "date" | "status">) => setTransactions((all) => [{ ...tx, id: `n${all.length}`, date: new Date(), status: "completed" }, ...all]);
  return (
    <BillingPage title={ar ? "المحفظة" : "Wallet"} description={ar ? "رصيدك ومعاملاتك." : "Your balance and activity."}>
      <Wallet
        balance={balance}
        pending={300}
        currency={ar ? "SAR" : "USD"}
        trend={[820, 900, 870, 1010, 980, 1120, 1090, 1180, 1250.5]}
        transactions={transactions}
        sources={[
          { id: "visa", label: "Visa 4242", description: ar ? "تنتهي في 08/28" : "Expires 08/28" },
          { id: "mc", label: "Mastercard 4444", description: ar ? "تنتهي في 03/27" : "Expires 03/27" },
        ]}
        destinations={[{ id: "bank", label: ar ? "مصرف الراجحي" : "Al Rajhi Bank", description: "SA03 **** **** 7519" }]}
        topUpPresets={[50, 100, 250, 500]}
        feeNote={ar ? "تُطبَّق رسوم 1.5% على البطاقات." : "A 1.5% fee applies to cards."}
        onTopUp={async ({ amount }) => {
          await wait(800);
          setBalance((b) => b + amount);
          push({ type: "topup", amount, description: ar ? "شحن الرصيد" : "Top-up" });
        }}
        onPayout={async ({ amount }) => {
          await wait(800);
          setBalance((b) => b - amount);
          push({ type: "payout", amount: -amount, description: ar ? "سحب إلى البنك" : "Withdrawal to bank" });
        }}
      />
    </BillingPage>
  );
}

/* ------------------------------------------------------------------ time tracking */

export const timeProjects = (ar: boolean): TimeProject[] => [
  {
    id: "web",
    name: ar ? "الموقع الإلكتروني" : "Website redesign",
    tasks: [
      { id: "ui", name: ar ? "تحسين الواجهة" : "UI polish" },
      { id: "qa", name: ar ? "اختبار الجودة" : "QA pass" },
    ],
  },
  {
    id: "app",
    name: ar ? "تطبيق الجوال" : "Mobile app",
    tasks: [
      { id: "api", name: ar ? "ربط الواجهة البرمجية" : "API integration" },
      { id: "rel", name: ar ? "إعداد الإصدار" : "Release prep" },
    ],
  },
  { id: "ops", name: ar ? "عمليات داخلية" : "Internal ops" },
];

export const demoEntries = (ar: boolean): TimeEntry[] => [
  { id: "e1", date: key(daysAgo(0)), seconds: 5400, projectId: "web", taskId: "ui", note: ar ? "مراجعة الشريط الجانبي" : "Sidebar review" },
  { id: "e2", date: key(daysAgo(0)), seconds: 2700, projectId: "ops", note: ar ? "اجتماع الفريق" : "Team sync" },
  { id: "e3", date: key(daysAgo(1)), seconds: 12600, projectId: "app", taskId: "api" },
  { id: "e4", date: key(daysAgo(1)), seconds: 3600, projectId: "web", taskId: "qa" },
  { id: "e5", date: key(daysAgo(2)), seconds: 9000, projectId: "app", taskId: "rel", note: ar ? "بناء الإصدار التجريبي" : "Beta build" },
  { id: "e6", date: key(daysAgo(3)), seconds: 7200, projectId: "web", taskId: "ui" },
  { id: "e7", date: key(daysAgo(4)), seconds: 5400, projectId: "ops" },
];

const hours = (s: number) => Math.round((s / 3600) * 10) / 10;

export function TimeTrackingPage() {
  const ar = useAr();
  const projects = timeProjects(ar);
  const [entries, setEntries] = useState(() => demoEntries(ar));
  const [running, setRunning] = useState<RunningTimer | null>(null);
  const counter = useRef(100);
  const next = () => `e${counter.current++}`;
  const today = key(new Date());
  const todaySeconds = entries.filter((e) => e.date === today).reduce((t, e) => t + e.seconds, 0);
  const weekSeconds = entries.reduce((t, e) => t + e.seconds, 0);
  return (
    <BillingPage title={ar ? "تتبّع الوقت" : "Time tracking"} description={ar ? "سجّل ساعات عملك على المشاريع والمهام." : "Log your hours against projects and tasks."} wide>
      <StatGrid>
        <StatCard label={ar ? "اليوم" : "Today"} value={hours(todaySeconds)} format={{ style: "unit", unit: "hour", unitDisplay: "short" }} icon={<Clock />} />
        <StatCard label={ar ? "هذا الأسبوع" : "This week"} value={hours(weekSeconds)} format={{ style: "unit", unit: "hour", unitDisplay: "short" }} delta={0.08} deltaLabel={ar ? "عن الأسبوع الماضي" : "vs last week"} icon={<Timer />} />
        <StatCard label={ar ? "الحالة" : "Status"} value={running ? (ar ? "المؤقّت يعمل" : "Timer running") : ar ? "متوقف" : "Idle"} icon={<WalletIcon />} />
      </StatGrid>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="flex flex-col gap-6">
          <TimeTracker
            projects={projects}
            running={running}
            onRunningChange={setRunning}
            onStop={async (stopped) => {
              await wait(400);
              setEntries((all) => [
                { id: next(), date: today, seconds: Math.max(60, stopped.seconds), projectId: stopped.projectId, taskId: stopped.taskId, note: stopped.note },
                ...all,
              ]);
            }}
          />
          <TimeEntryList
            entries={entries}
            projects={projects}
            onAdd={async (input) => {
              await wait(400);
              setEntries((all) => [{ id: next(), ...input }, ...all]);
            }}
            onEdit={async (entry, input) => {
              await wait(400);
              setEntries((all) => all.map((e) => (e.id === entry.id ? { ...e, ...input } : e)));
            }}
            onDelete={(entry) => setEntries((all) => all.filter((e) => e.id !== entry.id))}
          />
        </div>
        <Timesheet entries={entries} projects={projects} />
      </div>
    </BillingPage>
  );
}
