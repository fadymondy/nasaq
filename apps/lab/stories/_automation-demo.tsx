/* Shared demo data for the automation stories: cron-builder, run-history, step-editor, rule-builder, version-history. Every string is English and Arabic. */
import type { CronSchedule, HistoryVersion, RuleActionType, RuleDefinition, RuleEvent, RuleField, RunRecord, StepNode, StepParam, StepTestResult, WorkflowStepType } from "@nasaq/web";
import { Repeat } from "lucide-react";
import { stepCategories, stepTypes, useAr, wait } from "./_workflow-demo";

export { stepCategories, useAr, wait };

const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

/* ------------------------------------------------------------------ schedules */

export function demoSchedules(ar: boolean): CronSchedule[] {
  const now = Date.now();
  return [
    { id: "s1", name: ar ? "تقرير المبيعات الأسبوعي" : "Weekly sales report", cron: "0 9 * * 1", timeZone: "Asia/Riyadh", enabled: true, lastRun: { at: now - 2 * DAY, status: "ok" } },
    { id: "s2", name: ar ? "مزامنة العملاء" : "Sync customers", cron: "*/15 * * * *", timeZone: "UTC", enabled: true, lastRun: { at: now - 12 * MIN, status: "failed", message: "HTTP 502" } },
    { id: "s3", name: ar ? "نسخة احتياطية ليلية" : "Nightly backup", cron: "30 2 * * *", timeZone: "Africa/Cairo", enabled: true, lastRun: { at: now - 9 * HOUR, status: "missed" } },
    { id: "s4", name: ar ? "تنظيف الجلسات" : "Clean up sessions", cron: "@weekly", timeZone: "UTC", enabled: false },
  ];
}

/* ------------------------------------------------------------------ runs */

/** A small placeholder "page" as an inline image, so the stories need no assets. */
function shot(label: string, tone: "ok" | "bad"): string {
  const accent = tone === "ok" ? "seagreen" : "firebrick";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" fill="whitesmoke"/><rect x="24" y="24" width="592" height="40" rx="8" fill="gainsboro"/><rect x="24" y="88" width="380" height="16" rx="8" fill="lightgray"/><rect x="24" y="120" width="300" height="16" rx="8" fill="lightgray"/><rect x="24" y="200" width="592" height="120" rx="12" fill="white" stroke="${accent}" stroke-width="3"/><text x="48" y="268" font-family="sans-serif" font-size="22" fill="${accent}">${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function demoRunRecords(ar: boolean): RunRecord[] {
  const now = Date.now();
  const trig = { manual: ar ? "يدوي" : "Manual", schedule: ar ? "جدول" : "Schedule", webhook: ar ? "ويب هوك" : "Webhook" };
  const failed: RunRecord = {
    id: "run_8f21a",
    name: ar ? "فرز تذاكر الدعم" : "Support triage",
    status: "error",
    startedAt: now - 14 * MIN,
    trigger: trig.webhook,
    steps: [
      { id: "a", name: ar ? "ويب هوك" : "Webhook", status: "success", startedAtMs: 0, durationMs: 40, output: { ticket: { id: "T-2041", subject: ar ? "لا أستطيع تسجيل الدخول" : "Cannot sign in", priority: "high" } } },
      { id: "b", name: ar ? "شرط: أولوية عالية" : "Condition: high priority", status: "success", startedAtMs: 40, durationMs: 12, input: { expr: "ticket.priority == 'high'" }, output: { branch: "yes" } },
      {
        id: "c",
        name: ar ? "طلب HTTP إلى CRM" : "HTTP request to CRM",
        status: "error",
        startedAtMs: 52,
        durationMs: 3120,
        attempt: 3,
        input: { method: "POST", url: "https://crm.example.com/api/tickets", body: { id: "T-2041" } },
        error: ar ? "انتهت المهلة بعد 3 محاولات: HTTP 504" : "Timed out after 3 attempts: HTTP 504",
        logs: ["POST /api/tickets", "attempt 1: 504 Gateway Timeout (1002 ms)", "attempt 2: 504 Gateway Timeout (1011 ms)", "attempt 3: 504 Gateway Timeout (1107 ms)"],
        screenshots: [{ src: shot("504 Gateway Timeout", "bad"), alt: ar ? "صفحة خطأ 504 من خادم CRM" : "504 error page from the CRM server", caption: ar ? "آخر استجابة" : "Last response" }],
      },
      { id: "d", name: ar ? "إشعار الفريق" : "Notify team", status: "skipped", startedAtMs: 3172 },
    ],
    spans: [
      { id: "s1", name: "run", service: "worker", startMs: 0, durationMs: 3172, error: true, attributes: { "run.id": "run_8f21a", "workflow.version": 3 } },
      { id: "s2", parentId: "s1", name: "step.webhook", service: "worker", startMs: 0, durationMs: 40, attributes: { "http.method": "POST", "http.route": "/hooks/support" } },
      { id: "s3", parentId: "s1", name: "step.http", service: "worker", startMs: 52, durationMs: 3120, error: true, attributes: { "retry.count": 2, "http.url": "https://crm.example.com/api/tickets" } },
      { id: "s4", parentId: "s3", name: "POST crm.example.com", service: "http", startMs: 60, durationMs: 1002, error: true, attributes: { "http.status_code": 504 } },
      { id: "s5", parentId: "s3", name: "POST crm.example.com", service: "http", startMs: 1200, durationMs: 1011, error: true, attributes: { "http.status_code": 504 } },
      { id: "s6", parentId: "s3", name: "POST crm.example.com", service: "http", startMs: 2400, durationMs: 772, error: true, attributes: { "http.status_code": 504, timeout: true } },
    ],
    payload: { trigger: "webhook", body: { ticket: "T-2041" }, workflow: "support-triage", version: 3 },
    error: ar ? "فشلت الخطوة: طلب HTTP إلى CRM" : "Step failed: HTTP request to CRM",
  };
  const ok = (id: string, minsAgo: number, trigger: string, total: number): RunRecord => ({
    id,
    name: ar ? "فرز تذاكر الدعم" : "Support triage",
    status: "success",
    startedAt: now - minsAgo * MIN,
    trigger,
    steps: [
      { id: "a", name: ar ? "ويب هوك" : "Webhook", status: "success", startedAtMs: 0, durationMs: 35, output: { ticket: "T-20" + id.slice(-2) } },
      { id: "b", name: ar ? "شرط: أولوية عالية" : "Condition: high priority", status: "success", startedAtMs: 35, durationMs: 10, output: { branch: "no" } },
      { id: "c", name: ar ? "إشعار الفريق" : "Notify team", status: "success", startedAtMs: 45, durationMs: total - 45, screenshots: id === "run_71c0e" ? [{ src: shot(ar ? "تم الإرسال" : "Sent", "ok"), alt: ar ? "تأكيد إرسال الإشعار" : "Notification sent confirmation" }] : undefined },
    ],
    durationMs: total,
  });
  return [
    failed,
    ok("run_71c0e", 40, trig.schedule, 420),
    { id: "run_9d3b7", name: ar ? "مزامنة العملاء" : "Sync customers", status: "running", startedAt: now - 30_000, trigger: trig.schedule, steps: [{ id: "a", name: ar ? "جلب العملاء" : "Fetch customers", status: "running", startedAtMs: 0 }] },
    ok("run_44aa1", 95, trig.manual, 610),
    { ...ok("run_30b9c", 180, trig.webhook, 380), status: "waiting" },
    ok("run_12e8d", 300, trig.schedule, 505),
  ];
}

/* ------------------------------------------------------------------ steps */

export function automationStepTypes(ar: boolean): WorkflowStepType[] {
  return [...stepTypes(ar), { id: "loop", label: ar ? "لكل عنصر" : "For each item", description: ar ? "يكرر الخطوات بالداخل لكل عنصر." : "Repeats the steps inside for every item.", category: "logic", icon: Repeat, fields: [{ name: "items", label: ar ? "العناصر" : "Items", kind: "text", required: true, placeholder: "{{orders}}" }], defaults: { items: "{{orders}}" } }];
}

export const NESTABLE = ["loop"];
export const KNOWN_VARIABLES = ["trigger.body", "orders", "item"];

export function demoSteps(ar: boolean): StepNode[] {
  return [
    { id: "st1", type: "webhook", config: { path: "/hooks/new-order" } },
    {
      id: "st2",
      type: "loop",
      config: { items: "{{orders}}" },
      children: [
        { id: "st3", type: "http", label: ar ? "أرسل الطلب إلى المخزون" : "Send order to inventory", config: { url: "https://{{api_host}}/orders", method: "POST" } },
        { id: "st4", type: "email", continueOnFailure: true, config: { to: "ops@example.com", subject: ar ? "طلب جديد" : "New order", body: ar ? "وصل الطلب." : "An order arrived." } },
      ],
    },
    { id: "st5", type: "notify", config: {} },
  ];
}

export function demoParams(): StepParam[] {
  return [
    { id: "p1", name: "api_host", value: "inventory.example.com" },
    { id: "p2", name: "api_key", value: "demo-key-not-real-1234", secret: true },
  ];
}

/** A fake runner: every step succeeds after a pause, except an HTTP step to a host that is not defined. */
export async function fakeTestRun(steps: StepNode[], params: StepParam[]): Promise<StepTestResult[]> {
  await wait(900);
  const key = params.find((p) => p.secret)?.value ?? "";
  const out: StepTestResult[] = [];
  const walk = (list: StepNode[]) => {
    for (const s of list) {
      out.push({ stepId: s.id, status: "success", durationMs: 40 + out.length * 23, output: s.type === "http" ? { status: 200, headers: { authorization: `Bearer ${key}` }, body: { ok: true } } : { ok: true } });
      walk(s.children ?? []);
    }
  };
  walk(steps);
  return out;
}

/* ------------------------------------------------------------------ rules */

export function ruleEvents(ar: boolean): RuleEvent[] {
  return [
    { id: "order.created", label: ar ? "يُنشأ طلب" : "an order is placed", description: ar ? "عند إتمام العميل للدفع." : "When a customer completes checkout." },
    { id: "ticket.opened", label: ar ? "تُفتح تذكرة دعم" : "a support ticket is opened" },
    { id: "invoice.overdue", label: ar ? "تتأخر فاتورة" : "an invoice becomes overdue" },
  ];
}

export function ruleFields(ar: boolean): RuleField[] {
  return [
    { id: "total", label: ar ? "الإجمالي" : "Order total", kind: "number" },
    { id: "country", label: ar ? "الدولة" : "Country", kind: "select", options: [{ value: "sa", label: ar ? "السعودية" : "Saudi Arabia" }, { value: "eg", label: ar ? "مصر" : "Egypt" }, { value: "ae", label: ar ? "الإمارات" : "United Arab Emirates" }] },
    { id: "note", label: ar ? "ملاحظة العميل" : "Customer note", kind: "text" },
    { id: "vip", label: ar ? "عميل مميز" : "VIP customer", kind: "boolean" },
  ];
}

export function ruleActions(ar: boolean): RuleActionType[] {
  return [
    { id: "email", label: ar ? "أرسل بريدًا" : "Send an email", description: ar ? "يرسل رسالة من قالب." : "Sends a message from a template.", fields: [{ name: "to", label: ar ? "إلى" : "To", kind: "text", required: true }, { name: "subject", label: ar ? "الموضوع" : "Subject", kind: "text" }] },
    { id: "tag", label: ar ? "أضف وسمًا" : "Add a tag", fields: [{ name: "tag", label: ar ? "الوسم" : "Tag", kind: "text", required: true }] },
    { id: "assign", label: ar ? "أسنِد إلى" : "Assign to", fields: [{ name: "team", label: ar ? "الفريق" : "Team", kind: "select", options: [{ value: "sales", label: ar ? "المبيعات" : "Sales" }, { value: "support", label: ar ? "الدعم" : "Support" }] }] },
  ];
}

export function demoRule(): RuleDefinition {
  return {
    event: "order.created",
    conditions: {
      kind: "group",
      id: "root",
      join: "and",
      children: [
        { kind: "condition", id: "c1", field: "total", op: "gt", value: "500" },
        {
          kind: "group",
          id: "g1",
          join: "or",
          children: [
            { kind: "condition", id: "c2", field: "country", op: "is", value: "sa" },
            { kind: "condition", id: "c3", field: "vip", op: "is", value: "true" },
          ],
        },
      ],
    },
    actions: [
      { id: "a1", type: "email", config: { to: "sales@example.com", subject: "Big order" } },
      { id: "a2", type: "tag", config: { tag: "priority" } },
    ],
  };
}

/* ------------------------------------------------------------------ versions */

const config = (v: number) => ({
  name: "support-triage",
  version: v,
  trigger: { type: "webhook", path: "/hooks/support" },
  steps: [
    { type: "condition", expr: v >= 2 ? "ticket.priority == 'high'" : "ticket.priority != 'low'" },
    { type: "http", url: "https://crm.example.com/api/tickets", retries: v >= 3 ? 3 : 1 },
    ...(v >= 3 ? [{ type: "notify", channel: "#support" }] : []),
  ],
  timeoutSeconds: v === 1 ? 30 : 60,
});

export function demoHistory(ar: boolean): HistoryVersion[] {
  const now = Date.now();
  const notes = ar ? ["الإصدار الأول", "حصر الشرط بالأولوية العالية وزيادة المهلة", "إعادة المحاولة 3 مرات وإشعار قناة الدعم"] : ["First version", "Narrowed the condition to high priority and raised the timeout", "Retry three times and notify the support channel"];
  const authors = ar ? ["ليلى", "عمر", "ليلى"] : ["Layla", "Omar", "Layla"];
  return [1, 2, 3].map((v) => ({ id: `v${v}`, version: v, savedAt: now - (4 - v) * 2 * DAY, author: authors[v - 1], note: notes[v - 1], content: JSON.stringify(config(v), null, 2) }));
}
