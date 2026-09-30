/*
 * Shared demo data for the HR attendance, local payments, loyalty and promo, and rates and subscriptions stories. Real
 * components, fake async callbacks. Nothing here talks to a server. Names are plain text: no payment logos are used.
 */
import {
  AttendanceMarker,
  type AttendancePunch,
  type AttendancePunchKind,
  BillingOverview,
  LeaveBalances,
  type LeaveRequestInput,
  LeaveRequestDialog,
  LeaveRequestList,
  type LeaveRequestRow,
  type LeaveType,
  LocalPayments,
  type LocalPaymentMethod,
  type LocalPaymentSubmission,
  LoyaltyCard,
  PaymentVerificationQueue,
  type PaymentSubmission,
  PayrollRuns,
  type PayrollRun,
  PointsHistory,
  type PromoApplied,
  type PromoCode,
  PromoCodeField,
  PromoCodeManager,
  type PromoLike,
  RateSchedule,
  type Rate,
  RecurringSubscriptions,
  type Subscription,
  VisitHistory,
} from "@nasaq/web";
import { type ReactNode, useState } from "react";
import { useAr, wait } from "./_profile-demo";

export { useAr, wait };

const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** A day key `n` days from today. */
export const dayIn = (n: number) => keyOf(new Date(Date.now() + n * 86_400_000));
const at = (days: number, hour = 10, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
};

/** A page frame for the page stories. */
export function V2Page({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 p-4 sm:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-h2 text-foreground">{title}</h1>
        {description ? <p className="text-body text-muted-foreground">{description}</p> : null}
      </header>
      {children}
    </main>
  );
}

/* ------------------------------------------------------------------ HR */

export function useHrDemo() {
  const ar = useAr();
  const types: LeaveType[] = [
    { id: "annual", name: ar ? "إجازة سنوية" : "Annual leave", annualDays: 21, accrual: "monthly", carryOverMax: 5 },
    { id: "sick", name: ar ? "إجازة مرضية" : "Sick leave", annualDays: 10 },
    { id: "unpaid", name: ar ? "إجازة بدون راتب" : "Unpaid leave", annualDays: 0, limited: false },
  ];
  const [requests, setRequests] = useState<LeaveRequestRow[]>(() => [
    { id: "r1", employee: "Sara Alharbi", typeId: "annual", start: dayIn(-40), end: dayIn(-36), status: "approved" },
    { id: "r2", employee: "Sara Alharbi", typeId: "annual", start: dayIn(21), end: dayIn(25), status: "pending", reason: "Family trip" },
    { id: "r3", employee: "Omar Khalil", typeId: "sick", start: dayIn(2), end: dayIn(3), status: "pending", reason: "Medical appointment" },
    { id: "r4", employee: "Layla Nasser", typeId: "annual", start: dayIn(-10), end: dayIn(-9), status: "rejected", note: "Month-end close" },
  ]);
  const [punches, setPunches] = useState<AttendancePunch[]>([]);
  const [runs, setRuns] = useState<PayrollRun[]>(() => [
    {
      id: "p9",
      period: "2026-09",
      status: "draft",
      lines: [
        { id: "l1", employee: "Sara Alharbi", basic: 4_500_000, allowances: 500_000, additions: 120_000, deductions: 350_000, workedDays: 22, workingDays: 22 },
        { id: "l2", employee: "Omar Khalil", basic: 3_800_000, allowances: 300_000, deductions: 280_000, workedDays: 20, workingDays: 22 },
        { id: "l3", employee: "Layla Nasser", basic: 5_200_000, allowances: 600_000, additions: 250_000, deductions: 420_000, workedDays: 22, workingDays: 22 },
      ],
    },
    { id: "p8", period: "2026-08", status: "paid", payDate: dayIn(-25), lines: [{ id: "m1", employee: "Sara Alharbi", basic: 4_500_000, allowances: 500_000, deductions: 330_000 }, { id: "m2", employee: "Omar Khalil", basic: 3_800_000, allowances: 300_000, deductions: 270_000 }] },
  ]);

  return {
    ar,
    types,
    requests,
    punches,
    runs,
    onPunch: async (kind: AttendancePunchKind) => {
      await wait(400);
      setPunches((p) => [...p, { id: `${p.length + 1}`, kind, at: new Date(), place: ar ? "المكتب الرئيسي" : "Head office" }]);
    },
    onSubmit: async (input: LeaveRequestInput) => {
      await wait(600);
      setRequests((r) => [...r, { id: `n${r.length + 1}`, employee: "Sara Alharbi", typeId: input.typeId, start: input.start, end: input.end, halfStart: input.halfStart, halfEnd: input.halfEnd, reason: input.reason, status: "pending" }]);
    },
    onDecide: async (req: LeaveRequestRow, decision: "approved" | "rejected", note?: string) => {
      await wait(500);
      setRequests((r) => r.map((x) => (x.id === req.id ? { ...x, status: decision, note } : x)));
    },
    onWithdraw: async (req: LeaveRequestRow) => {
      await wait(400);
      setRequests((r) => r.map((x) => (x.id === req.id ? { ...x, status: "cancelled" } : x)));
    },
    onApprove: async (run: PayrollRun) => {
      await wait(600);
      setRuns((r) => r.map((x) => (x.id === run.id ? { ...x, status: "approved" } : x)));
    },
    onMarkPaid: async (run: PayrollRun) => {
      await wait(600);
      setRuns((r) => r.map((x) => (x.id === run.id ? { ...x, status: "paid", payDate: dayIn(0) } : x)));
    },
  };
}

export function AttendanceDemo() {
  const d = useHrDemo();
  return <AttendanceMarker className="max-w-md" punches={d.punches} shift={{ start: "09:00", end: "17:00", graceMinutes: 10 }} place={d.ar ? "المكتب الرئيسي" : "Head office"} onPunch={d.onPunch} />;
}

export function LeaveDemo({ manager = false }: { manager?: boolean }) {
  const d = useHrDemo();
  const [open, setOpen] = useState(false);
  const [typeId, setTypeId] = useState<string | undefined>();
  const mine = d.requests.filter((r) => r.employee === "Sara Alharbi");
  return (
    <div className="flex flex-col gap-6">
      {manager ? null : (
        <LeaveBalances
          types={d.types}
          requests={mine}
          carriedOver={{ annual: 3 }}
          onRequest={(id) => {
            setTypeId(id);
            setOpen(true);
          }}
        />
      )}
      <LeaveRequestList
        requests={manager ? d.requests : mine}
        types={d.types}
        mode={manager ? "manager" : "self"}
        onDecide={d.onDecide}
        onWithdraw={d.onWithdraw}
        onNew={() => {
          setTypeId(undefined);
          setOpen(true);
        }}
      />
      <LeaveRequestDialog open={open} onOpenChange={setOpen} types={d.types} requests={mine} defaultTypeId={typeId} carriedOver={{ annual: 3 }} onSubmit={d.onSubmit} />
    </div>
  );
}

export function PayrollDemo() {
  const d = useHrDemo();
  return <PayrollRuns runs={d.runs} currency="EGP" onApprove={d.onApprove} onMarkPaid={d.onMarkPaid} />;
}

/* ------------------------------------------------------------------ local payments */

export function usePaymentsDemo() {
  const ar = useAr();
  const methods: LocalPaymentMethod[] = [
    {
      id: "instapay",
      name: "InstaPay",
      kind: "instant-transfer",
      description: ar ? "تحويل فوري بين البنوك" : "Instant bank-to-bank transfer",
      details: [
        { label: ar ? "عنوان الدفع" : "Payment address", value: "nasaq@instapay" },
        { label: ar ? "اسم الحساب" : "Account name", value: "Nasaq Studio LLC", copyable: false },
      ],
      steps: ar ? ["افتح تطبيق البنك واختر إنستاباي.", "حوّل المبلغ إلى عنوان الدفع.", "انسخ الرقم المرجعي من الإيصال."] : ["Open your bank app and choose InstaPay.", "Send the total to the payment address.", "Copy the reference number from the receipt."],
      qr: "instapay://pay?ipa=nasaq@instapay",
      max: 12_000_000,
    },
    {
      id: "vodafone",
      name: "Vodafone Cash",
      kind: "mobile-wallet",
      description: ar ? "محفظة الهاتف" : "Mobile wallet",
      details: [{ label: ar ? "رقم المحفظة" : "Wallet number", value: "+20 100 123 4567" }],
      steps: ar ? ["ادخل إلى المحفظة واختر إرسال أموال.", "أدخل الرقم والمبلغ الإجمالي.", "احتفظ برقم العملية."] : ["Open the wallet and choose Send money.", "Enter the number and the total.", "Keep the transaction number."],
      fee: { percentBps: 100 },
      max: 3_000_000,
    },
    {
      id: "bank",
      name: ar ? "تحويل بنكي" : "Bank transfer",
      kind: "bank-transfer",
      description: ar ? "من 1 إلى 2 يوم عمل" : "1 to 2 working days",
      details: [
        { label: ar ? "البنك" : "Bank", value: "Banque Misr", copyable: false },
        { label: "IBAN", value: "EG38 0019 0005 0000 0000 2631 8000 2" },
      ],
      fee: { fixed: 2500 },
      min: 100_000,
    },
  ];
  const [submission, setSubmission] = useState<LocalPaymentSubmission | undefined>();
  const [queue, setQueue] = useState<PaymentSubmission[]>(() => [
    { id: "q1", customer: "Youssef Adel", methodName: "InstaPay", amount: 1_250_000, currency: "EGP", reference: "IP-448120", receiptName: "receipt-448120.jpg", receiptUrl: "#", submittedAt: at(0, 9, 12), status: "submitted" },
    { id: "q2", customer: "Nour Hassan", methodName: "Vodafone Cash", amount: 480_000, currency: "EGP", reference: "VC-77120334", receiptUrl: "#", submittedAt: at(-1, 16, 40), status: "verifying" },
    { id: "q3", customer: "Karim Fathy", methodName: ar ? "تحويل بنكي" : "Bank transfer", amount: 3_000_000, currency: "EGP", reference: "BM-20993", submittedAt: at(-2, 11, 5), status: "verified" },
  ]);
  return {
    ar,
    methods,
    submission,
    queue,
    setSubmission,
    onSubmit: async (input: { methodId: string; reference: string; receipt: File | null }) => {
      await wait(900);
      if (input.reference === "FAIL0000") return { error: ar ? "لم نستطع قراءة الإيصال." : "We could not read that receipt." };
      setSubmission({ methodId: input.methodId, reference: input.reference, receiptName: input.receipt?.name, status: "submitted", submittedAt: new Date() });
      setQueue((q) => [{ id: `q${q.length + 1}`, customer: ar ? "أنت (تجريبي)" : "You (demo)", methodName: methods.find((m) => m.id === input.methodId)?.name ?? "", amount: 1_250_000, currency: "EGP", reference: input.reference, receiptUrl: "#", submittedAt: new Date(), status: "submitted" }, ...q]);
    },
    onVerify: async (s: PaymentSubmission) => {
      await wait(500);
      setQueue((q) => q.map((x) => (x.id === s.id ? { ...x, status: "verified" } : x)));
    },
    onReject: async (s: PaymentSubmission, reason: string) => {
      await wait(500);
      setQueue((q) => q.map((x) => (x.id === s.id ? { ...x, status: "rejected" } : x)));
      if (s.customer.includes("demo") || s.customer.includes("تجريبي")) setSubmission((p) => (p ? { ...p, status: "rejected", rejectionReason: reason } : p));
    },
  };
}

export function LocalPaymentsDemo({ status }: { status?: LocalPaymentSubmission["status"] }) {
  const d = usePaymentsDemo();
  const seeded: LocalPaymentSubmission | undefined = status
    ? { methodId: "instapay", reference: "IP-448120", status, submittedAt: at(0, 9, 12), rejectionReason: status === "rejected" ? (d.ar ? "المبلغ في الإيصال لا يطابق الفاتورة." : "The amount on the receipt does not match the invoice.") : undefined }
    : undefined;
  return <LocalPayments className="max-w-2xl" amount={1_250_000} currency="EGP" methods={d.methods} submission={d.submission ?? seeded} onSubmit={d.onSubmit} />;
}

export function PaymentQueueDemo() {
  const d = usePaymentsDemo();
  return <PaymentVerificationQueue submissions={d.queue} onVerify={d.onVerify} onReject={d.onReject} />;
}

export function LocalPaymentsPageDemo() {
  const d = usePaymentsDemo();
  return (
    <div className="flex flex-col gap-10">
      <LocalPayments className="max-w-2xl" amount={1_250_000} currency="EGP" methods={d.methods} submission={d.submission} onSubmit={d.onSubmit} />
      <PaymentVerificationQueue submissions={d.queue} onVerify={d.onVerify} onReject={d.onReject} />
    </div>
  );
}

/* ------------------------------------------------------------------ loyalty and promo */

export const loyaltyTiers = (ar: boolean) => [
  { id: "bronze", name: ar ? "برونزي" : "Bronze", minPoints: 0 },
  { id: "silver", name: ar ? "فضي" : "Silver", minPoints: 1000, perk: ar ? "مشروب مجاني كل شهر" : "A free drink every month" },
  { id: "gold", name: ar ? "ذهبي" : "Gold", minPoints: 5000, perk: ar ? "أولوية في الحجز" : "Priority booking" },
];

export function LoyaltyCardDemo() {
  const ar = useAr();
  return (
    <LoyaltyCard
      className="max-w-2xl"
      name={ar ? "سارة الحربي" : "Sara Alharbi"}
      balance={1840}
      lifetimePoints={2650}
      tiers={loyaltyTiers(ar)}
      lots={[{ points: 200, expiresOn: dayIn(12) }, { points: 640, expiresOn: dayIn(120) }, { points: 1000 }]}
      memberSince={at(-420)}
      memberCode="NSQ-4821-9930"
      rewards={[
        { id: "coffee", title: ar ? "قهوة مجانية" : "Free coffee", description: ar ? "أي حجم" : "Any size", cost: 500 },
        { id: "dessert", title: ar ? "حلوى" : "Dessert of the day", cost: 1200 },
        { id: "table", title: ar ? "طاولة مميزة" : "Premium table", description: ar ? "مرة واحدة" : "Once", cost: 5000 },
      ]}
      onRedeem={async () => {
        await wait(700);
      }}
    />
  );
}

export function PointsHistoryDemo() {
  const ar = useAr();
  return (
    <PointsHistory
      entries={[
        { id: "1", kind: "earn", points: 125, date: at(-1), note: ar ? "زيارة: فرع المعادي" : "Visit: Maadi branch", balanceAfter: 1840 },
        { id: "2", kind: "redeem", points: -500, date: at(-8), note: ar ? "قهوة مجانية" : "Free coffee", balanceAfter: 1715 },
        { id: "3", kind: "earn", points: 210, date: at(-15), note: ar ? "زيارة: فرع الزمالك" : "Visit: Zamalek branch", balanceAfter: 2215 },
        { id: "4", kind: "expire", points: -80, date: at(-40), note: ar ? "انتهت صلاحية نقاط" : "Points expired", balanceAfter: 2005 },
        { id: "5", kind: "adjust", points: 50, date: at(-52), note: ar ? "تعويض عن تأخير" : "Goodwill for a late order", balanceAfter: 2085 },
      ]}
    />
  );
}

export const demoPromos = (): PromoLike[] => [
  { code: "WELCOME15", type: "percent", value: 1500, maxDiscount: 30_000, firstOrderOnly: true },
  { code: "EID50", type: "fixed", value: 5000, minSubtotal: 20_000, endsOn: dayIn(20) },
  { code: "OLD10", type: "percent", value: 1000, endsOn: dayIn(-5) },
];

export function PromoFieldDemo() {
  const [applied, setApplied] = useState<PromoApplied | null>(null);
  return (
    <div className="flex max-w-sm flex-col gap-2">
      <PromoCodeField applied={applied} currency="EGP" promos={demoPromos()} context={{ subtotal: 42_000, today: dayIn(0), firstOrder: true }} onApplied={setApplied} onRemove={() => setApplied(null)} />
      <p className="text-caption text-muted-foreground">Try WELCOME15, EID50 or OLD10.</p>
    </div>
  );
}

export function PromoManagerDemo() {
  const [promos, setPromos] = useState<PromoCode[]>(() => [
    { id: "1", code: "WELCOME15", type: "percent", value: 1500, maxDiscount: 30_000, firstOrderOnly: true, active: true, used: 132 },
    { id: "2", code: "EID50", type: "fixed", value: 5000, minSubtotal: 20_000, startsOn: dayIn(-10), endsOn: dayIn(20), maxRedemptions: 200, active: true, used: 88 },
    { id: "3", code: "SUMMER", type: "percent", value: 2000, startsOn: dayIn(30), endsOn: dayIn(90), active: true, used: 0 },
    { id: "4", code: "OLD10", type: "percent", value: 1000, endsOn: dayIn(-5), active: true, used: 41 },
    { id: "5", code: "STAFF", type: "percent", value: 3000, active: false, used: 12 },
    { id: "6", code: "FLASH", type: "fixed", value: 2000, maxRedemptions: 50, active: true, used: 50 },
  ]);
  return (
    <PromoCodeManager
      promos={promos}
      currency="EGP"
      onSave={async (input, id) => {
        await wait(600);
        if (input.code === "TAKEN") return { error: "That code already exists." };
        setPromos((p) => (id ? p.map((x) => (x.id === id ? { ...x, ...input } : x)) : [...p, { id: `n${p.length + 1}`, used: 0, ...input }]));
      }}
      onSetActive={async (p, active) => {
        await wait(300);
        setPromos((all) => all.map((x) => (x.id === p.id ? { ...x, active } : x)));
      }}
      onDelete={async (p) => {
        await wait(400);
        setPromos((all) => all.filter((x) => x.id !== p.id));
      }}
    />
  );
}

export function VisitHistoryDemo() {
  const ar = useAr();
  return (
    <VisitHistory
      currency="EGP"
      visits={[
        { id: "1", date: at(-1, 20), place: ar ? "المعادي" : "Maadi", spend: 125_000, points: 125, status: "completed" },
        { id: "2", date: at(-8, 13), place: ar ? "الزمالك" : "Zamalek", spend: 98_000, points: 98, status: "completed" },
        { id: "3", date: at(-15, 21), place: ar ? "المعادي" : "Maadi", spend: 0, points: 0, status: "no-show" },
        { id: "4", date: at(-22, 19), place: ar ? "التجمع" : "New Cairo", spend: 210_000, points: 210, status: "completed" },
        { id: "5", date: at(-30, 12), place: ar ? "الزمالك" : "Zamalek", spend: 0, points: 0, status: "cancelled" },
      ]}
      rowActions={(v) => (v.status === "completed" ? [{ id: "again", label: ar ? "احجز مرة أخرى" : "Book again", onSelect: () => undefined }] : [])}
    />
  );
}

/* ------------------------------------------------------------------ rates and subscriptions */

export function RateScheduleDemo({ readOnly = false }: { readOnly?: boolean }) {
  const ar = useAr();
  const [bill, setBill] = useState<Rate[]>(() => [
    { id: "b1", amount: 40_000, from: "2025-01-01" },
    { id: "b2", amount: 48_000, from: "2026-01-01" },
    { id: "b3", amount: 55_000, from: dayIn(30) },
  ]);
  const [cost, setCost] = useState<Rate[]>(() => [
    { id: "c1", amount: 25_000, from: "2025-01-01" },
    { id: "c2", amount: 28_000, from: "2026-03-01" },
  ]);
  const add = (set: typeof setBill) => async (input: { amount: number; from: string }) => {
    await wait(500);
    set((r) => [...r, { id: `n${r.length + 1}`, ...input }]);
  };
  const remove = (set: typeof setBill) => async (rate: Rate) => {
    await wait(400);
    set((r) => r.filter((x) => x.id !== rate.id));
  };
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <RateSchedule title={ar ? "سعر الفوترة" : "Bill rate"} rates={bill} currency="EGP" marginAgainst={cost} onAdd={readOnly ? undefined : add(setBill)} onRemove={readOnly ? undefined : remove(setBill)} />
      <RateSchedule title={ar ? "سعر التكلفة" : "Cost rate"} rates={cost} currency="EGP" onAdd={readOnly ? undefined : add(setCost)} onRemove={readOnly ? undefined : remove(setCost)} />
    </div>
  );
}

export function useSubscriptionsDemo() {
  const ar = useAr();
  const projects = [
    { id: "web", name: ar ? "موقع العميل" : "Client website" },
    { id: "app", name: ar ? "تطبيق الجوال" : "Mobile app" },
  ];
  const [subs, setSubs] = useState<Subscription[]>(() => [
    { id: "s1", name: ar ? "استضافة سحابية" : "Cloud hosting", projectId: "web", projectName: projects[0]?.name, amount: 180_000, schedule: { kind: "cycle", every: 1, unit: "month" }, anchor: "2026-01-31", status: "active" },
    { id: "s2", name: ar ? "نطاق الموقع" : "Domain name", projectId: "web", projectName: projects[0]?.name, amount: 120_000, schedule: { kind: "cycle", every: 1, unit: "year" }, anchor: "2025-11-15", status: "active" },
    { id: "s3", name: ar ? "خدمة الإشعارات" : "Push notifications", projectId: "app", projectName: projects[1]?.name, amount: 45_000, quantity: 3, schedule: { kind: "cycle", every: 1, unit: "week" }, anchor: "2026-09-01", status: "active" },
    { id: "s4", name: ar ? "أدوات التصميم" : "Design tools", amount: 60_000, quantity: 5, schedule: { kind: "cycle", every: 3, unit: "month" }, anchor: "2026-02-10", status: "active" },
    { id: "s5", name: ar ? "تقرير أسبوعي" : "Weekday report pack", amount: 15_000, schedule: { kind: "cron", expr: "0 8 * * 1" }, anchor: "2026-01-05", status: "paused" },
  ]);
  return {
    ar,
    projects,
    subs,
    onSave: async (input: { name: string; projectId?: string; amount: number; quantity: number; schedule: Subscription["schedule"]; anchor: string }, id?: string) => {
      await wait(600);
      const projectName = projects.find((p) => p.id === input.projectId)?.name;
      setSubs((all) => (id ? all.map((s) => (s.id === id ? { ...s, ...input, projectName, status: s.status } : s)) : [...all, { id: `n${all.length + 1}`, ...input, projectName, status: "active" }]));
    },
    onStatusChange: async (s: Subscription, status: Subscription["status"]) => {
      await wait(400);
      setSubs((all) => all.map((x) => (x.id === s.id ? { ...x, status } : x)));
    },
  };
}

export function SubscriptionsDemo() {
  const d = useSubscriptionsDemo();
  return <RecurringSubscriptions subscriptions={d.subs} currency="EGP" projects={d.projects} onSave={d.onSave} onStatusChange={d.onStatusChange} />;
}

export function BillingOverviewDemo() {
  const d = useSubscriptionsDemo();
  return <BillingOverview subscriptions={d.subs} currency="EGP" />;
}

export function RatesPageDemo() {
  const d = useSubscriptionsDemo();
  return (
    <div className="flex flex-col gap-10">
      <BillingOverview subscriptions={d.subs} currency="EGP" />
      <RecurringSubscriptions subscriptions={d.subs} currency="EGP" projects={d.projects} onSave={d.onSave} onStatusChange={d.onStatusChange} />
      <RateScheduleDemo />
    </div>
  );
}

export function HrPageDemo() {
  const d = useHrDemo();
  const [open, setOpen] = useState(false);
  const mine = d.requests.filter((r) => r.employee === "Sara Alharbi");
  return (
    <div className="flex flex-col gap-10">
      <AttendanceMarker punches={d.punches} shift={{ start: "09:00", end: "17:00", graceMinutes: 10 }} place={d.ar ? "المكتب الرئيسي" : "Head office"} onPunch={d.onPunch} />
      <LeaveBalances types={d.types} requests={mine} carriedOver={{ annual: 3 }} onRequest={() => setOpen(true)} />
      <LeaveRequestList requests={d.requests} types={d.types} mode="manager" onDecide={d.onDecide} onNew={() => setOpen(true)} />
      <PayrollRuns runs={d.runs} currency="EGP" onApprove={d.onApprove} onMarkPaid={d.onMarkPaid} />
      <LeaveRequestDialog open={open} onOpenChange={setOpen} types={d.types} requests={mine} carriedOver={{ annual: 3 }} onSubmit={d.onSubmit} />
    </div>
  );
}

export function LoyaltyPageDemo() {
  return (
    <div className="flex flex-col gap-10">
      <LoyaltyCardDemo />
      <PromoFieldDemo />
      <VisitHistoryDemo />
      <PointsHistoryDemo />
      <PromoManagerDemo />
    </div>
  );
}
