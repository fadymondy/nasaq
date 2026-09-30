/* Shared fixtures and stateful demos for the approval queue, kill switch, import wizard, checklist and
   status + label manager stories. Everything is fake. Arabic demo data follows the locale. */
import {
  ApprovalQueue,
  type ApprovalItem,
  Checklist,
  type ChecklistItem,
  ImportWizard,
  type ImportField,
  KillSwitch,
  type PairedBrowser,
  PausedBanner,
  type PauseInfo,
  StatusLabelManager,
  toggleItem,
  useNasaq,
  type WorkLabel,
  type WorkStatus,
} from "@nasaq/web";
import { useEffect, useState } from "react";

export const useAr = () => useNasaq().locale.startsWith("ar");
export const wait = (ms = 500) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;
const ago = (ms: number) => Date.now() - ms;
const ahead = (ms: number) => Date.now() + ms;

// ---------------------------------------------------------------------------------------------
// Approvals
// ---------------------------------------------------------------------------------------------

function approvals(ar: boolean): ApprovalItem[] {
  return [
    {
      id: "ap-1",
      kind: "action",
      status: "pending",
      title: ar ? "إرسال حملة «عرض نهاية الشهر» إلى 4٬200 عميل" : "Send the month-end offer campaign to 4,200 customers",
      description: ar ? "طلبته أتمتة «حملات المتجر» وتحتاج موافقة قبل الإرسال." : "Requested by the Store campaigns automation. It needs sign-off before it sends.",
      requester: ar ? "أتمتة حملات المتجر" : "Store campaigns automation",
      createdAt: ago(25 * MIN),
      expiresAt: ahead(35 * MIN),
      args: { segment: "active-90d", template: "month-end-offer", smtp_password: "hunter2-not-real", send_at: "2026-09-30T18:00:00Z" },
      redact: ["smtp_password"],
    },
    {
      id: "ap-2",
      kind: "review",
      status: "pending",
      title: ar ? "مراجعة صفحة الهبوط «رمضان»" : "Review the Ramadan landing page",
      description: ar ? "تحقق من المعايير قبل النشر." : "Check the criteria before it goes live.",
      requester: ar ? "لينا الحسن" : "Lina Hassan",
      createdAt: ago(3 * HOUR),
      expiresAt: ahead(2 * DAY),
      criteria: [
        { id: "c1", label: ar ? "النصوص العربية والإنجليزية مكتملة" : "Arabic and English copy are complete", met: true },
        { id: "c2", label: ar ? "الصور لها نص بديل" : "Images have alt text", met: false },
        { id: "c3", label: ar ? "الروابط تعمل" : "Links resolve", met: true },
      ],
    },
    {
      id: "ap-3",
      kind: "moderation",
      status: "pending",
      title: ar ? "شهادة عميل جديدة" : "New customer testimonial",
      requester: ar ? "خالد الفهد" : "Khalid Al-Fahd",
      createdAt: ago(9 * HOUR),
      quote: ar ? "تجربة رائعة، وصل الطلب في يوم واحد والتغليف ممتاز." : "Great experience. The order arrived in one day and the packaging was lovely.",
    },
    {
      id: "ap-4",
      kind: "request",
      status: "pending",
      title: ar ? "طلب: إضافة مقاس جديد لقميص «سحاب»" : "Request: add a new size to the Sahab shirt",
      description: ar ? "طلب عميل مميز عبر نموذج الطلبات." : "From a priority customer through the request form.",
      requester: ar ? "ريم العتيبي" : "Reem Al-Otaibi",
      createdAt: ago(2 * DAY),
    },
    {
      id: "ap-5",
      kind: "action",
      status: "pending",
      title: ar ? "حذف 312 مسودة طلب قديمة" : "Delete 312 stale draft orders",
      requester: ar ? "أتمتة التنظيف" : "Cleanup automation",
      createdAt: ago(2 * DAY),
      expiresAt: ago(HOUR),
      args: { older_than_days: 60, dry_run: false },
    },
    {
      id: "ap-6",
      kind: "action",
      status: "approved",
      title: ar ? "تحديث أسعار الشحن" : "Update shipping rates",
      requester: ar ? "أتمتة الشحن" : "Shipping automation",
      createdAt: ago(DAY),
      decidedBy: ar ? "سارة" : "Sara",
      decidedAt: ago(20 * HOUR),
    },
    {
      id: "ap-7",
      kind: "moderation",
      status: "rejected",
      title: ar ? "تعليق على منتج" : "Product comment",
      requester: ar ? "زائر" : "Guest",
      createdAt: ago(DAY),
      decidedBy: ar ? "عمر" : "Omar",
      decidedAt: ago(22 * HOUR),
      reason: ar ? "يحتوي على رابط ترويجي." : "Contains a promotional link.",
    },
  ];
}

export function ApprovalDemo({ failFirst = false }: { failFirst?: boolean }) {
  const ar = useAr();
  const [items, setItems] = useState(() => approvals(ar));
  const [failed, setFailed] = useState(false);
  useEffect(() => setItems(approvals(ar)), [ar]);
  const me = ar ? "أنت" : "You";
  const decide = (id: string, patch: Partial<ApprovalItem>) => setItems((list) => list.map((i) => (i.id === id ? { ...i, ...patch, decidedBy: me, decidedAt: Date.now() } : i)));
  return (
    <ApprovalQueue
      items={items}
      convertLabel={ar ? "تحويل إلى مهمة" : "Convert to task"}
      onApprove={async (id) => {
        await wait();
        if (failFirst && !failed) {
          setFailed(true);
          return { error: ar ? "تعذّر الاتصال بالخادم." : "The server could not be reached." };
        }
        decide(id, { status: "approved" });
      }}
      onReject={async (id, reason) => {
        await wait();
        decide(id, { status: "rejected", reason });
      }}
      onConvert={async (id) => {
        await wait();
        decide(id, { status: "converted" });
      }}
    />
  );
}

// ---------------------------------------------------------------------------------------------
// Kill switch
// ---------------------------------------------------------------------------------------------

function browsers(ar: boolean): PairedBrowser[] {
  return [
    { id: "b1", name: ar ? "Chrome على ويندوز" : "Chrome on Windows", device: ar ? "مكتب سارة" : "Sara's desk", online: true, current: true },
    { id: "b2", name: ar ? "Chrome على macOS" : "Chrome on macOS", device: ar ? "لابتوب عمر" : "Omar's laptop", online: true, lastSeen: ago(MIN) },
    { id: "b3", name: ar ? "Edge على ويندوز" : "Edge on Windows", device: ar ? "جهاز المستودع" : "Warehouse PC", online: false, lastSeen: ago(3 * DAY) },
  ];
}

/** Holds the pause state so a banner and the panel can share it. */
export function useKillSwitchState(initialPaused = false) {
  const ar = useAr();
  const [paused, setPaused] = useState<PauseInfo | null>(
    initialPaused ? { by: ar ? "سارة" : "Sara", at: ago(12 * MIN), reason: ar ? "أتمتة البريد تُرسل رسائل مكررة." : "The email automation is sending duplicates." } : null,
  );
  const [list, setList] = useState(() => browsers(ar));
  useEffect(() => setList(browsers(ar)), [ar]);
  return {
    paused,
    browsers: list,
    pause: async (reason: string) => {
      await wait();
      setPaused({ by: ar ? "أنت" : "You", at: Date.now(), reason });
    },
    resume: async () => {
      await wait();
      setPaused(null);
    },
    unpair: async (id: string) => {
      await wait();
      setList((l) => l.filter((b) => b.id !== id));
    },
  };
}

export function KillSwitchDemo({ initialPaused = false }: { initialPaused?: boolean }) {
  const s = useKillSwitchState(initialPaused);
  return <KillSwitch paused={s.paused} activeCount={14} onStopAll={s.pause} onResume={s.resume} browsers={s.browsers} onUnpairBrowser={s.unpair} />;
}

export function PausedBannerDemo() {
  const s = useKillSwitchState(true);
  return s.paused ? <PausedBanner sticky={false} paused={s.paused} onResume={s.resume} /> : <p className="text-body-sm text-muted-foreground">Resumed.</p>;
}

// ---------------------------------------------------------------------------------------------
// Import wizard
// ---------------------------------------------------------------------------------------------

export function contactFields(ar: boolean): ImportField[] {
  return [
    { key: "name", label: ar ? "الاسم" : "Name", required: true, aliases: ["full name", "الاسم الكامل"] },
    { key: "email", label: ar ? "البريد الإلكتروني" : "Email", type: "email", required: true, aliases: ["e-mail", "email address", "البريد"] },
    { key: "phone", label: ar ? "الهاتف" : "Phone", type: "phone", aliases: ["mobile", "tel", "الجوال"] },
    { key: "company", label: ar ? "الشركة" : "Company", aliases: ["organization", "organisation"] },
  ];
}

export function ImportDemo() {
  const ar = useAr();
  return (
    <ImportWizard
      fields={contactFields(ar)}
      uniqueKey="email"
      onImport={async (rows) => {
        await wait(1400);
        const failed = rows.length > 3 ? [{ line: 3, message: ar ? "البريد مسجل مسبقًا في النظام." : "This email is already in the system." }] : [];
        return { imported: rows.length - failed.length, failed };
      }}
    />
  );
}

/** A sample the stories show above the wizard so it can be copied into the paste box. */
export const SAMPLE_CSV = [
  "Full Name,E-mail,Mobile,Organization",
  "Sara Khalid,sara@example.com,+966 50 123 4567,Nasaq",
  "Omar Nasser,omar@example.com,+971 55 987 6543,Mahaam",
  "Lina Hassan,lina@example,+966 55 000 1111,Cloudy",
  ",noname@example.com,,",
  "Reem Al-Otaibi,sara@example.com,12,Nasaq",
  "Khalid Al-Fahd,khalid@example.com,+965 5000 1234,Moharrik",
].join("\n");

// ---------------------------------------------------------------------------------------------
// Checklist
// ---------------------------------------------------------------------------------------------

function checklist(ar: boolean): ChecklistItem[] {
  return [
    {
      id: "k1",
      text: ar ? "تجهيز صفحة الإطلاق" : "Prepare the launch page",
      done: false,
      subtasks: [
        { id: "k1a", text: ar ? "كتابة النص العربي" : "Write the Arabic copy", done: true },
        { id: "k1b", text: ar ? "كتابة النص الإنجليزي" : "Write the English copy", done: true },
        { id: "k1c", text: ar ? "مراجعة الصور" : "Review the images", done: false },
      ],
      attachments: [{ id: "f1", name: ar ? "مسودة-الصفحة.pdf" : "page-draft.pdf", size: 482_000 }],
    },
    { id: "k2", text: ar ? "إعداد بوابة الدفع" : "Set up the payment gateway", done: true, meta: ar ? "سارة · انتهى الأحد" : "Sara · finished Sunday" },
    {
      id: "k3",
      text: ar ? "اختبار الطلب من البداية إلى النهاية" : "Test an order end to end",
      done: false,
      meta: ar ? "عمر · الخميس" : "Omar · Thursday",
      subtasks: [
        { id: "k3a", text: ar ? "طلب بالبطاقة" : "Card order", done: false },
        { id: "k3b", text: ar ? "طلب بالدفع عند الاستلام" : "Cash on delivery order", done: false },
      ],
    },
    { id: "k4", text: ar ? "إبلاغ فريق الدعم" : "Brief the support team", done: false },
  ];
}

export function ChecklistDemo({ readOnly = false, empty = false }: { readOnly?: boolean; empty?: boolean }) {
  const ar = useAr();
  const [items, setItems] = useState<ChecklistItem[]>(() => (empty ? [] : checklist(ar)));
  useEffect(() => setItems(empty ? [] : checklist(ar)), [ar, empty]);
  let n = 100;
  return (
    <Checklist
      items={items}
      readOnly={readOnly}
      onToggle={async (id, done) => {
        await wait(200);
        setItems((l) => toggleItem(l, id, done));
      }}
      onAdd={async (text, parentId) => {
        await wait(250);
        const item: ChecklistItem = { id: `n${n++}${Date.now()}`, text, done: false };
        setItems((l) => (parentId ? l.map((i) => (i.id === parentId ? { ...i, done: false, subtasks: [...(i.subtasks ?? []), item] } : i)) : [...l, item]));
      }}
      onRemove={async (id) => {
        await wait(250);
        setItems((l) => l.filter((i) => i.id !== id).map((i) => (i.subtasks ? { ...i, subtasks: i.subtasks.filter((s) => s.id !== id) } : i)));
      }}
      onAttach={async (id, files) => {
        await wait(400);
        setItems((l) => l.map((i) => (i.id === id ? { ...i, attachments: [...(i.attachments ?? []), ...files.map((f, k) => ({ id: `a${Date.now()}${k}`, name: f.name, size: f.size }))] } : i)));
      }}
      onRemoveAttachment={async (itemId, attId) => {
        await wait(200);
        setItems((l) => l.map((i) => (i.id === itemId ? { ...i, attachments: i.attachments?.filter((a) => a.id !== attId) } : i)));
      }}
    />
  );
}

// ---------------------------------------------------------------------------------------------
// Status + label manager
// ---------------------------------------------------------------------------------------------

function statuses(ar: boolean): WorkStatus[] {
  return [
    { id: "s1", name: ar ? "قائمة الأفكار" : "Ideas", hue: "gray", stage: "backlog", usage: 41 },
    { id: "s2", name: ar ? "جاهز للبدء" : "Ready", hue: "blue", stage: "todo", usage: 12 },
    { id: "s3", name: ar ? "قيد التنفيذ" : "In progress", hue: "amber", stage: "active", usage: 8 },
    { id: "s4", name: ar ? "ينتظر العميل" : "Waiting on client", hue: "orange", stage: "active", usage: 3 },
    { id: "s5", name: ar ? "قيد المراجعة" : "In review", hue: "violet", stage: "review", usage: 5 },
    { id: "s6", name: ar ? "تم" : "Shipped", hue: "green", stage: "done", usage: 233 },
    { id: "s7", name: ar ? "أُلغي" : "Won't do", hue: "red", stage: "canceled", usage: 0 },
  ];
}

function labels(ar: boolean): WorkLabel[] {
  return [
    { id: "l1", name: ar ? "خلل" : "Bug", hue: "red", usage: 27 },
    { id: "l2", name: ar ? "ميزة" : "Feature", hue: "blue", usage: 18 },
    { id: "l3", name: ar ? "تصميم" : "Design", hue: "pink", usage: 9 },
    { id: "l4", name: ar ? "عاجل" : "Urgent", hue: "orange", usage: 2 },
    { id: "l5", name: ar ? "أداء" : "Performance", hue: "teal", usage: 0 },
  ];
}

export function StatusLabelDemo({ defaultTab = "statuses" }: { defaultTab?: "statuses" | "labels" }) {
  const ar = useAr();
  const [st, setSt] = useState(() => statuses(ar));
  const [lb, setLb] = useState(() => labels(ar));
  useEffect(() => {
    setSt(statuses(ar));
    setLb(labels(ar));
  }, [ar]);
  return (
    <StatusLabelManager
      defaultTab={defaultTab}
      statuses={st}
      labels={lb}
      onSaveStatus={async (d) => {
        await wait(300);
        setSt((l) => (d.id ? l.map((s) => (s.id === d.id ? { ...s, name: d.name, hue: d.hue, stage: d.stage } : s)) : [...l, { id: `s${Date.now()}`, name: d.name, hue: d.hue, stage: d.stage, usage: 0 }]));
      }}
      onDeleteStatus={async (id) => {
        await wait(300);
        setSt((l) => l.filter((s) => s.id !== id));
      }}
      onReorderStatuses={async (ids) => {
        await wait(150);
        setSt((l) => ids.map((id) => l.find((s) => s.id === id) as WorkStatus));
      }}
      onSaveLabel={async (d) => {
        await wait(300);
        setLb((l) => (d.id ? l.map((x) => (x.id === d.id ? { ...x, name: d.name, hue: d.hue } : x)) : [...l, { id: `l${Date.now()}`, name: d.name, hue: d.hue, usage: 0 }]));
      }}
      onDeleteLabel={async (id) => {
        await wait(300);
        setLb((l) => l.filter((x) => x.id !== id));
      }}
    />
  );
}
