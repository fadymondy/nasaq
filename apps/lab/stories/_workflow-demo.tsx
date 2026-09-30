/* Shared demo data and page frames for the workflow and graph stories (canvas, network, marketplace, knowledge graph). Every string is English and Arabic. */
import {
  type GraphViewKind,
  type GraphViewLink,
  type GraphViewLinkKind,
  type GraphViewNode,
  type WorkflowFieldDef,
  type WorkflowGraph,
  type WorkflowListing,
  type WorkflowNetworkLink,
  type WorkflowNetworkStep,
  type WorkflowRun,
  type WorkflowStepType,
  type WorkflowVersion,
} from "@nasaq/web";
import {
  Bell,
  Bot,
  Braces,
  Building2,
  CalendarClock,
  FileText,
  Filter,
  Globe,
  Lightbulb,
  Mail,
  MapPin,
  MessageCircle,
  Sheet,
  ShieldCheck,
  Sparkles,
  Split,
  StickyNote,
  User,
  UserCheck,
  Webhook,
} from "lucide-react";
import type { ReactNode } from "react";
import { useAr, wait } from "./_profile-demo";

export { useAr, wait };

/** The page frame: a title, a line under it, page actions and the content. `fill` makes the content take the rest of the screen. */
export function FlowPage({ title, description, actions, fill, children }: { title: string; description: string; actions?: ReactNode; fill?: boolean; children: ReactNode }) {
  return (
    <div className={fill ? "flex h-screen min-h-[640px] flex-col bg-background" : "min-h-screen bg-background"}>
      <div className={fill ? "mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col gap-4 p-4 sm:p-6" : "mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-8"}>
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-title-lg text-foreground">{title}</h1>
            <p className="text-body text-muted-foreground">{description}</p>
          </div>
          {actions}
        </header>
        {fill ? <div className="min-h-0 flex-1">{children}</div> : children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ workflow builder */

export function stepCategories(ar: boolean) {
  return [
    { id: "trigger", label: ar ? "المشغّلات" : "Triggers" },
    { id: "logic", label: ar ? "المنطق" : "Logic" },
    { id: "comms", label: ar ? "التواصل" : "Messaging" },
    { id: "data", label: ar ? "البيانات" : "Data" },
    { id: "ai", label: ar ? "الذكاء" : "AI" },
  ];
}

export function stepTypes(ar: boolean): WorkflowStepType[] {
  const f = (name: string, en: string, arb: string, kind: WorkflowFieldDef["kind"], extra: Partial<WorkflowFieldDef> = {}): WorkflowFieldDef => ({ name, label: ar ? arb : en, kind, ...extra });
  return [
    { id: "webhook", label: ar ? "ويب هوك" : "Webhook", description: ar ? "يبدأ عند وصول طلب." : "Starts when a request arrives.", category: "trigger", icon: Webhook, role: "trigger", fields: [f("path", "Path", "المسار", "text", { required: true, placeholder: "/hooks/new-order" })], defaults: { path: "/hooks/new-order" }, keywords: ["http", "request"] },
    { id: "schedule", label: ar ? "جدول زمني" : "Schedule", description: ar ? "يعمل في مواعيد ثابتة." : "Runs at fixed times.", category: "trigger", icon: CalendarClock, role: "trigger", fields: [f("cron", "Cron", "التعبير الزمني", "code", { required: true })], defaults: { cron: "0 9 * * 1" } },
    { id: "condition", label: ar ? "شرط" : "Condition", description: ar ? "يفرّع المسار إلى نعم أو لا." : "Branches into yes or no.", category: "logic", icon: Split, fields: [f("expr", "Expression", "التعبير", "code", { required: true })], outputs: [{ id: "yes", label: ar ? "نعم" : "Yes" }, { id: "no", label: ar ? "لا" : "No" }], defaults: { expr: "order.total > 500" } },
    { id: "filter", label: ar ? "تصفية" : "Filter", description: ar ? "يمرّر العناصر المطابقة فقط." : "Keeps only matching items.", category: "logic", icon: Filter, fields: [f("expr", "Expression", "التعبير", "code")] },
    { id: "approval", label: ar ? "موافقة بشرية" : "Human approval", description: ar ? "ينتظر قرار شخص." : "Waits for a person to decide.", category: "logic", icon: UserCheck, fields: [f("who", "Approver", "المعتمِد", "text", { required: true })] },
    { id: "email", label: ar ? "إرسال بريد" : "Send email", description: ar ? "يرسل رسالة بريد من قالب." : "Sends an email from a template.", category: "comms", icon: Mail, fields: [f("to", "To", "إلى", "text", { required: true }), f("subject", "Subject", "الموضوع", "text"), f("body", "Body", "النص", "textarea")] },
    { id: "whatsapp", label: ar ? "رسالة واتساب" : "WhatsApp message", description: ar ? "يرسل رسالة واتساب." : "Sends a WhatsApp message.", category: "comms", icon: MessageCircle, fields: [f("to", "To", "إلى", "text", { required: true }), f("body", "Message", "الرسالة", "textarea")] },
    { id: "notify", label: ar ? "إشعار" : "Notify team", description: ar ? "ينبّه الفريق." : "Alerts the team.", category: "comms", icon: Bell },
    { id: "http", label: ar ? "طلب HTTP" : "HTTP request", description: ar ? "يستدعي واجهة خارجية." : "Calls an external API.", category: "data", icon: Globe, fields: [f("url", "URL", "الرابط", "url", { required: true }), f("method", "Method", "الطريقة", "select", { options: [{ value: "GET", label: "GET" }, { value: "POST", label: "POST" }] })], defaults: { method: "POST" } },
    { id: "sheet", label: ar ? "إضافة إلى جدول" : "Add to sheet", description: ar ? "يضيف صفًا إلى جدول بيانات." : "Appends a row to a spreadsheet.", category: "data", icon: Sheet },
    { id: "code", label: ar ? "كود" : "Code", description: ar ? "يشغّل دالة مخصصة." : "Runs a custom function.", category: "data", icon: Braces, fields: [f("src", "Source", "الكود", "code")] },
    { id: "agent", label: ar ? "وكيل ذكي" : "AI agent", description: ar ? "يفكّر ويتصرف بأدواتك." : "Reasons and acts with your tools.", category: "ai", icon: Bot, fields: [f("prompt", "Instructions", "التعليمات", "textarea", { required: true })] },
    { id: "summarise", label: ar ? "تلخيص" : "Summarise", description: ar ? "يلخّص نصًا طويلًا." : "Condenses long text.", category: "ai", icon: Sparkles },
  ];
}

/** A support-ticket flow: webhook -> AI triage -> condition -> approval or auto-reply -> notify. */
export function demoGraph(ar: boolean): WorkflowGraph {
  return {
    nodes: [
      { id: "n1", type: "webhook", label: ar ? "تذكرة جديدة" : "New ticket", config: { path: "/hooks/ticket" } },
      { id: "n2", type: "agent", label: ar ? "فرز التذكرة" : "Triage ticket", config: { prompt: ar ? "صنّف التذكرة وقدّر أولويتها." : "Classify the ticket and rate its urgency." } },
      { id: "n3", type: "condition", label: ar ? "هل هي عاجلة؟" : "Is it urgent?", config: { expr: "ticket.urgency >= 4" } },
      { id: "n4", type: "approval", label: ar ? "موافقة المشرف" : "Manager approval", config: { who: ar ? "مشرف الدعم" : "Support lead" } },
      { id: "n5", type: "whatsapp", label: ar ? "رد فوري" : "Instant reply", config: { to: "{{ticket.phone}}", body: ar ? "استلمنا طلبك وسنعود إليك خلال ساعة." : "We got your request and will reply within the hour." } },
      { id: "n6", type: "notify", label: ar ? "تنبيه الفريق" : "Alert the team", config: {} },
      { id: "n7", type: "sheet", label: ar ? "سجل التذاكر" : "Ticket log", config: {} },
    ],
    edges: [
      { id: "e1", source: "n1", target: "n2" },
      { id: "e2", source: "n2", target: "n3" },
      { id: "e3", source: "n3", target: "n4", sourceHandle: "yes", label: ar ? "نعم" : "Yes" },
      { id: "e4", source: "n3", target: "n5", sourceHandle: "no", label: ar ? "لا" : "No" },
      { id: "e5", source: "n4", target: "n6" },
      { id: "e6", source: "n5", target: "n7" },
      { id: "e7", source: "n6", target: "n7" },
    ],
  };
}

export function demoRuns(): WorkflowRun[] {
  const ok = (startedAtMs: number, durationMs: number, items = 1) => ({ status: "success" as const, startedAtMs, durationMs, items });
  return [
    {
      id: "r1",
      status: "success",
      startedAt: Date.now() - 12 * 60_000,
      durationMs: 5400,
      trigger: "Webhook",
      nodes: { n1: ok(0, 40), n2: ok(60, 3100), n3: ok(3200, 12), n5: ok(3230, 900), n7: ok(4200, 700) },
    },
    {
      id: "r2",
      status: "error",
      startedAt: Date.now() - 3 * 3600_000,
      durationMs: 3900,
      trigger: "Webhook",
      nodes: { n1: ok(0, 30), n2: ok(50, 2800), n3: ok(2900, 10), n4: { status: "error", startedAtMs: 2920, durationMs: 980, error: "Approver not found" } },
    },
  ];
}

export function demoVersions(ar: boolean): WorkflowVersion[] {
  const g = demoGraph(ar);
  const trimmed: WorkflowGraph = { nodes: g.nodes.slice(0, 3), edges: g.edges.slice(0, 2) };
  return [
    { version: 3, savedAt: Date.now() - 2 * 3600_000, author: ar ? "سارة" : "Sara", note: ar ? "أضفنا موافقة المشرف" : "Added manager approval", graph: g },
    { version: 2, savedAt: Date.now() - 2 * 86400_000, author: ar ? "خالد" : "Khaled", note: ar ? "الفرز بالذكاء" : "AI triage", graph: trimmed },
    { version: 1, savedAt: Date.now() - 6 * 86400_000, author: ar ? "سارة" : "Sara", graph: { nodes: g.nodes.slice(0, 1), edges: [] } },
  ];
}

/* ------------------------------------------------------------------ workflow network */

export function networkSteps(ar: boolean): { steps: WorkflowNetworkStep[]; links: WorkflowNetworkLink[] } {
  return {
    steps: [
      { id: "in", title: ar ? "وصول طلب استرداد" : "Refund request arrives", description: ar ? "من نموذج الموقع أو البريد." : "From the site form or email.", icon: Mail, owner: ar ? "بوابة الدعم" : "Support inbox", kind: "system" },
      { id: "check", title: ar ? "التحقق من الطلب" : "Check the order", description: ar ? "مطابقة رقم الطلب وتاريخ الشراء." : "Match order number and purchase date.", owner: ar ? "وكيل ذكي" : "AI agent", icon: Bot },
      { id: "dec", title: ar ? "هل المبلغ فوق ٥٠٠؟" : "Amount over 500?", description: ar ? "المبالغ الكبيرة تحتاج قرار بشري." : "Large amounts need a person.", kind: "decision" },
      { id: "human", title: ar ? "مراجعة المشرف" : "Manager review", description: ar ? "يوافق أو يرفض خلال يوم." : "Approves or rejects within a day.", owner: ar ? "مشرف الدعم" : "Support lead", kind: "human" },
      { id: "auto", title: ar ? "استرداد تلقائي" : "Automatic refund", description: ar ? "يُرسل الأمر إلى بوابة الدفع." : "Sends the order to the payment gateway.", owner: ar ? "واجهة الدفع" : "Billing API", kind: "system" },
      { id: "out", title: ar ? "إشعار العميل" : "Customer notified", description: ar ? "رسالة تأكيد بالمبلغ والموعد." : "Confirmation with amount and date.", kind: "output" },
    ],
    links: [
      { from: "in", to: "check" },
      { from: "check", to: "dec" },
      { from: "dec", to: "human", label: ar ? "نعم" : "Yes" },
      { from: "dec", to: "auto", label: ar ? "لا" : "No" },
      { from: "human", to: "auto", label: ar ? "موافق" : "Approved" },
      { from: "auto", to: "out" },
    ],
  };
}

/* ------------------------------------------------------------------ marketplace */

export function marketCategories(ar: boolean) {
  return [
    { id: "comms", label: ar ? "التواصل" : "Messaging", icon: MessageCircle },
    { id: "data", label: ar ? "البيانات" : "Data", icon: Sheet },
    { id: "logic", label: ar ? "المنطق" : "Logic", icon: Split },
    { id: "ai", label: ar ? "الذكاء" : "AI", icon: Sparkles },
    { id: "trust", label: ar ? "الموافقات" : "Approvals", icon: ShieldCheck },
  ];
}

export function marketListings(ar: boolean): WorkflowListing[] {
  const day = 86400_000;
  const step = (id: string, en: string, arb: string, sEn: string, sArb: string, category: string, icon: WorkflowListing["icon"], extra: Partial<WorkflowListing> & { step?: WorkflowListing["step"] } = {}): WorkflowListing => ({
    id,
    kind: "step",
    name: ar ? arb : en,
    summary: ar ? sArb : sEn,
    category,
    icon,
    publisher: ar ? "فريق نسق" : "Nasaq team",
    version: "1.2.0",
    ...extra,
  });
  return [
    step("wa", "WhatsApp message", "رسالة واتساب", "Send a WhatsApp message with a template.", "أرسل رسالة واتساب من قالب.", "comms", MessageCircle, {
      installs: 12400, rating: 4.8, ratingCount: 310, installed: true, updatedAt: Date.now() - 4 * day, tags: ["whatsapp", ar ? "رسائل" : "messages"],
      step: { inputs: [ar ? "جهة اتصال" : "Contact"], outputs: [ar ? "معرّف الرسالة" : "Message id"], fields: [{ name: "to", label: ar ? "إلى" : "To", kind: "text", required: true }, { name: "body", label: ar ? "الرسالة" : "Message", kind: "textarea" }] },
    }),
    step("mail", "Send email", "إرسال بريد", "Send a templated email through your provider.", "أرسل بريدًا من قالب عبر مزوّدك.", "comms", Mail, { installs: 9800, rating: 4.6, ratingCount: 204, updatedAt: Date.now() - 20 * day, step: { role: "action", inputs: [ar ? "جهة اتصال" : "Contact"], outputs: [ar ? "حالة التسليم" : "Delivery status"], fields: [{ name: "to", label: ar ? "إلى" : "To", kind: "text", required: true }] } }),
    step("hook", "Webhook trigger", "مشغّل ويب هوك", "Start a workflow when another system calls you.", "ابدأ سير العمل عندما يستدعيك نظام آخر.", "logic", Webhook, { installs: 15200, rating: 4.9, ratingCount: 512, updatedAt: Date.now() - 9 * day, step: { role: "trigger", outputs: [ar ? "الطلب" : "Request"], fields: [{ name: "path", label: ar ? "المسار" : "Path", kind: "text", required: true }] } }),
    step("cond", "Condition", "شرط", "Branch on any expression: yes goes one way, no the other.", "فرّع على أي تعبير: نعم في اتجاه ولا في آخر.", "logic", Split, { installs: 14100, rating: 4.7, ratingCount: 260, installed: true, updatedAt: Date.now() - 40 * day, step: { inputs: [ar ? "أي عنصر" : "Any item"], outputs: [ar ? "نعم" : "Yes", ar ? "لا" : "No"], fields: [{ name: "expr", label: ar ? "التعبير" : "Expression", kind: "code", required: true }] } }),
    step("sheet", "Add to sheet", "إضافة إلى جدول", "Append or update a row in a spreadsheet.", "أضف أو حدّث صفًا في جدول بيانات.", "data", Sheet, { installs: 7300, rating: 4.4, ratingCount: 121, price: { amount: 5, currency: "USD", period: "month" }, updatedAt: Date.now() - 60 * day, step: { inputs: [ar ? "صف" : "Row"], outputs: [ar ? "رقم الصف" : "Row number"], fields: [{ name: "sheet", label: ar ? "الجدول" : "Sheet", kind: "url", required: true }] } }),
    step("http", "HTTP request", "طلب HTTP", "Call any API with headers, auth and retries.", "استدعِ أي واجهة مع الترويسات والمصادقة وإعادة المحاولة.", "data", Globe, { installs: 18800, rating: 4.7, ratingCount: 640, updatedAt: Date.now() - 2 * day, step: { inputs: [ar ? "أي عنصر" : "Any item"], outputs: [ar ? "الاستجابة" : "Response"], fields: [{ name: "url", label: ar ? "الرابط" : "URL", kind: "url", required: true }, { name: "method", label: ar ? "الطريقة" : "Method", kind: "select" }] } }),
    step("agent", "AI agent", "وكيل ذكي", "An agent that reasons over your data and calls your tools.", "وكيل يفكّر في بياناتك ويستدعي أدواتك.", "ai", Bot, { installs: 6900, rating: 4.5, ratingCount: 98, price: { amount: 12, currency: "USD", period: "month" }, updatedAt: Date.now() - 1 * day, step: { inputs: [ar ? "نص" : "Text"], outputs: [ar ? "قرار" : "Decision", ar ? "ملخص" : "Summary"], fields: [{ name: "prompt", label: ar ? "التعليمات" : "Instructions", kind: "textarea", required: true }] } }),
    step("sum", "Summarise", "تلخيص", "Condense long text or a conversation into a few lines.", "لخّص نصًا طويلًا أو محادثة في بضعة أسطر.", "ai", Sparkles, { installs: 5200, rating: 4.3, ratingCount: 77, updatedAt: Date.now() - 15 * day, step: { inputs: [ar ? "نص" : "Text"], outputs: [ar ? "ملخص" : "Summary"] } }),
    step("appr", "Human approval", "موافقة بشرية", "Pause until a person approves or rejects, with a deadline.", "توقّف حتى يوافق شخص أو يرفض، مع موعد نهائي.", "trust", UserCheck, { installs: 8800, rating: 4.9, ratingCount: 233, installed: false, updatedAt: Date.now() - 7 * day, step: { inputs: [ar ? "طلب" : "Request"], outputs: [ar ? "موافق" : "Approved", ar ? "مرفوض" : "Rejected"], fields: [{ name: "who", label: ar ? "المعتمِد" : "Approver", kind: "text", required: true }] } }),
    {
      id: "refund",
      kind: "preset",
      name: ar ? "معالجة طلبات الاسترداد" : "Refund handling",
      summary: ar ? "من وصول الطلب حتى إشعار العميل، مع موافقة للمبالغ الكبيرة." : "From request to customer notice, with approval for large amounts.",
      description: ar ? "قالب جاهز يتحقق من الطلب بالذكاء الاصطناعي ويحوّل المبالغ الكبيرة إلى مشرف قبل الاسترداد." : "A ready workflow that checks the order with AI and sends large amounts to a manager before refunding.",
      category: "trust",
      icon: ShieldCheck,
      publisher: ar ? "فريق نسق" : "Nasaq team",
      version: "2.0.1",
      installs: 3100,
      rating: 4.8,
      ratingCount: 64,
      updatedAt: Date.now() - 3 * day,
      tags: [ar ? "دعم" : "support", ar ? "مدفوعات" : "payments"],
      preset: networkSteps(ar),
    },
    {
      id: "lead",
      kind: "preset",
      name: ar ? "متابعة العملاء المحتملين" : "Lead follow-up",
      summary: ar ? "يرحّب بالعميل الجديد ويسجّله ويُنبّه المبيعات." : "Greets a new lead, logs it and pings sales.",
      category: "comms",
      icon: Lightbulb,
      publisher: ar ? "مجتمع نسق" : "Nasaq community",
      version: "1.0.0",
      installs: 2100,
      rating: 4.5,
      ratingCount: 41,
      updatedAt: Date.now() - 25 * day,
      preset: {
        steps: [
          { id: "a", title: ar ? "نموذج جديد" : "Form submitted", kind: "system", icon: Webhook },
          { id: "b", title: ar ? "رسالة ترحيب" : "Welcome message", icon: MessageCircle },
          { id: "c", title: ar ? "تسجيل في الجدول" : "Log to sheet", icon: Sheet },
          { id: "d", title: ar ? "تنبيه المبيعات" : "Alert sales", kind: "output", icon: Bell },
        ],
      },
    },
  ];
}

/* ------------------------------------------------------------------ knowledge graph */

export function graphKinds(ar: boolean): GraphViewKind[] {
  return [
    { id: "person", label: ar ? "أشخاص" : "People", hue: "blue", icon: User, shape: "circle" },
    { id: "org", label: ar ? "جهات" : "Organisations", hue: "violet", icon: Building2, shape: "hexagon" },
    { id: "place", label: ar ? "أماكن" : "Places", hue: "green", icon: MapPin, shape: "diamond" },
    { id: "doc", label: ar ? "مستندات" : "Documents", hue: "amber", icon: FileText, shape: "rounded" },
    { id: "idea", label: ar ? "أفكار" : "Ideas", hue: "pink", icon: Lightbulb, shape: "pill" },
    { id: "note", label: ar ? "ملاحظات" : "Notes", hue: "gray", icon: StickyNote, shape: "square" },
  ];
}

/** How the relations are drawn: solid for membership, dashed for references, flowing for proposals and requests. */
export function graphLinkKinds(ar: boolean): GraphViewLinkKind[] {
  return [
    { id: "member", label: ar ? "عضوية" : "Membership", style: "solid" },
    { id: "authored", label: ar ? "تأليف" : "Authored", style: "solid", arrow: true },
    { id: "ref", label: ar ? "إشارة" : "Reference", style: "dashed", hue: "gray" },
    { id: "flow", label: ar ? "اقتراح" : "Proposal", style: "flow", arrow: true, hue: "pink" },
  ];
}

export function graphData(ar: boolean): { nodes: GraphViewNode[]; links: GraphViewLink[] } {
  const n = (id: string, en: string, arb: string, kind: string, dEn: string, dArb: string, tags: string[] = [], daysAgo = 3): GraphViewNode => ({
    id,
    kind,
    label: ar ? arb : en,
    description: ar ? dArb : dEn,
    tags,
    updatedAt: Date.now() - daysAgo * 86400_000,
  });
  const nodes: GraphViewNode[] = [
    n("sara", "Sara Al-Harbi", "سارة الحربي", "person", "Product lead, owns the onboarding redesign.", "قائدة المنتج، تقود إعادة تصميم التسجيل.", ["product"], 1),
    n("khaled", "Khaled Nasser", "خالد ناصر", "person", "Engineer working on the sync service.", "مهندس يعمل على خدمة المزامنة.", ["engineering"], 2),
    n("lina", "Lina Haddad", "لينا حداد", "person", "Designer of the mobile app.", "مصممة تطبيق الجوال.", ["design"], 5),
    n("omar", "Omar Saleh", "عمر صالح", "person", "Customer at Najd Logistics.", "عميل في نجد للخدمات اللوجستية.", ["customer"], 9),
    { ...n("nasaq", "Nasaq", "نسق", "org", "Our design system and product studio.", "نظام التصميم واستوديو المنتجات لدينا.", ["internal"], 14), weight: 30 },
    n("najd", "Najd Logistics", "نجد للخدمات اللوجستية", "org", "Customer since 2024, fleet tracking.", "عميل منذ ٢٠٢٤، تتبّع الأساطيل.", ["customer"], 8),
    n("riyadh", "Riyadh", "الرياض", "place", "Main office and the biggest market.", "المكتب الرئيسي وأكبر الأسواق.", [], 30),
    n("jeddah", "Jeddah", "جدة", "place", "Regional office, west coast.", "مكتب إقليمي على الساحل الغربي.", [], 30),
    n("spec", "Onboarding spec", "مواصفات التسجيل", "doc", "The agreed flow, edge cases and copy for onboarding.", "التدفق المتفق عليه وحالاته الخاصة ونصوصه.", ["spec"], 2),
    n("contract", "Najd contract", "عقد نجد", "doc", "Annual agreement with SLA terms.", "اتفاقية سنوية مع شروط مستوى الخدمة.", ["legal"], 40),
    n("roadmap", "Q4 roadmap", "خطة الربع الرابع", "doc", "What ships between October and December.", "ما سيُطلق بين أكتوبر وديسمبر.", ["planning"], 6),
    { ...n("offline", "Offline mode", "وضع عدم الاتصال", "idea", "Let drivers keep working with no signal.", "تمكين السائقين من العمل دون إشارة.", ["mobile"], 4), weight: 12 },
    n("voice", "Voice notes", "ملاحظات صوتية", "idea", "Capture a job update by speaking.", "تسجيل تحديث المهمة بالصوت.", ["mobile", "ai"], 7),
    n("call1", "Call with Omar", "مكالمة مع عمر", "note", "Asked for offline maps and faster sync.", "طلب خرائط دون اتصال ومزامنة أسرع.", ["customer"], 3),
    n("retro", "Sync retro", "مراجعة المزامنة", "note", "Root cause: retries without back-off.", "السبب الجذري: إعادة محاولات دون تباعد.", ["engineering"], 10),
  ];
  const l = (source: string, target: string, en?: string, arb?: string, kind?: string): GraphViewLink => {
    const label = ar ? arb : en;
    return { source, target, ...(label ? { label } : {}), ...(kind ? { kind } : {}) };
  };
  const links: GraphViewLink[] = [
    l("sara", "spec", "wrote", "كتبت", "authored"),
    l("sara", "roadmap", "owns", "تملك", "authored"),
    l("sara", "nasaq", "works at", "تعمل في", "member"),
    l("khaled", "nasaq", "works at", "يعمل في", "member"),
    l("lina", "nasaq", "works at", "تعمل في", "member"),
    l("khaled", "retro", "wrote", "كتب", "authored"),
    l("khaled", "offline", "proposed", "اقترح", "flow"),
    l("lina", "voice", "proposed", "اقترحت", "flow"),
    l("omar", "najd", "works at", "يعمل في", "member"),
    l("najd", "contract", "signed", "وقّعت", "authored"),
    l("nasaq", "contract", "signed", "وقّعت", "authored"),
    l("omar", "call1", "in", "في", "ref"),
    l("call1", "offline", "asked for", "طلب", "flow"),
    l("roadmap", "offline", "includes", "تتضمن", "ref"),
    l("roadmap", "voice", "includes", "تتضمن", "ref"),
    l("spec", "lina", "designed by", "صممتها", "ref"),
    l("nasaq", "riyadh", "based in", "مقرها", "member"),
    l("nasaq", "jeddah", "office in", "مكتب في", "member"),
    l("najd", "jeddah", "based in", "مقرها", "member"),
    l("retro", "call1", "related", undefined, "ref"),
  ];
  return { nodes, links };
}
