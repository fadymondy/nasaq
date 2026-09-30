/* Fake project-management data (English and Arabic) for the comment thread, activity composer, issue view and project view, plus the two page demos. Nothing here talks to a server. */
import {
  ActivityComposer,
  type ActivityRecord,
  ActivityTimeline,
  type AiCostDay,
  type AiCostRow,
  applyIssuePatch,
  type ChecklistItem,
  type CommentInput,
  CommentThread,
  type CommentThreadProps,
  type EntityPerson,
  type GithubCommit,
  type GithubPull,
  type GithubRun,
  type Issue,
  type IssuePatch,
  type IssuePerson,
  IssueQuickView,
  type IssueViewProps,
  IssueView,
  type MentionOption,
  moveProjectIssue,
  type ProjectActivityItem,
  type ProjectDetails,
  type ProjectFile,
  type ProjectTab,
  ProjectView,
  type ProjectViewProps,
  type RunningTimer,
  type ThreadComment,
  type TimeEntry,
  type TimeProject,
  type WorkLabel,
  type WorkStatus,
} from "@nasaq/web";
import { useMemo, useRef, useState } from "react";
import { useProjectExtras } from "./_mahaam-project-extras";
import { useAr, wait } from "./_profile-demo";

const HOUR = 3_600_000;
const DAY = 86_400_000;
const ago = (ms: number) => Date.now() - ms;

/** A local civil date "YYYY-MM-DD", `n` days from today. */
export const civil = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/* ------------------------------------------------------------------ people */

export const people = (ar: boolean): IssuePerson[] => [
  { id: "u1", name: ar ? "ليلى حداد" : "Layla Haddad" },
  { id: "u2", name: ar ? "عمر ناصر" : "Omar Nasser" },
  { id: "u3", name: ar ? "نورة السعود" : "Nora Al-Saud" },
  { id: "u4", name: ar ? "يوسف كريم" : "Yusuf Karim" },
];

export const mentionOptions = (ar: boolean): MentionOption[] =>
  people(ar).map((p, i) => ({ id: p.id, name: p.name, description: ["Design lead", "Backend", "Frontend", "QA"][i] }));

export const statuses = (ar: boolean): WorkStatus[] => [
  { id: "backlog", name: ar ? "قيد التخطيط" : "Backlog", hue: "gray", stage: "backlog" },
  { id: "todo", name: ar ? "للتنفيذ" : "Todo", hue: "blue", stage: "todo" },
  { id: "doing", name: ar ? "قيد العمل" : "In progress", hue: "amber", stage: "active" },
  { id: "review", name: ar ? "قيد المراجعة" : "In review", hue: "violet", stage: "review" },
  { id: "done", name: ar ? "منجز" : "Done", hue: "green", stage: "done" },
  { id: "canceled", name: ar ? "ملغى" : "Canceled", hue: "red", stage: "canceled" },
];

export const labels = (ar: boolean): WorkLabel[] => [
  { id: "l1", name: ar ? "واجهة" : "Frontend", hue: "blue" },
  { id: "l2", name: ar ? "خلفية" : "Backend", hue: "teal" },
  { id: "l3", name: ar ? "تصميم" : "Design", hue: "pink" },
  { id: "l4", name: ar ? "إتاحة" : "Accessibility", hue: "violet" },
  { id: "l5", name: ar ? "أداء" : "Performance", hue: "orange" },
];

/* ------------------------------------------------------------------ issues */

type Seed = [key: number, title: [string, string], statusId: string, priority: Issue["priority"], type: Issue["type"], assignee: string | null, labelIds: string[], estimate: number | null, start: number | null, due: number | null, created: number, parent?: number];

const SEEDS: Seed[] = [
  [101, ["Redesign the checkout summary", "إعادة تصميم ملخص الدفع"], "doing", "high", "feature", "u3", ["l1", "l3"], 12, -6, 5, -14],
  [102, ["Card form loses focus after a validation error", "نموذج البطاقة يفقد التركيز بعد خطأ التحقق"], "review", "urgent", "bug", "u3", ["l1", "l4"], 3, -4, -1, -9],
  [103, ["Order totals round differently on the server", "اختلاف تقريب إجمالي الطلب في الخادم"], "doing", "high", "bug", "u2", ["l2"], 5, -3, 3, -8],
  [104, ["Cache the shipping rate lookup", "تخزين مؤقت لاستعلام أسعار الشحن"], "todo", "medium", "improvement", "u2", ["l2", "l5"], 6, 2, 9, -7],
  [105, ["Empty cart illustration", "رسمة السلة الفارغة"], "todo", "low", "task", "u1", ["l3"], 2, 4, 8, -6],
  [106, ["Announce coupon errors to screen readers", "إعلان أخطاء القسيمة لقارئات الشاشة"], "todo", "medium", "improvement", "u4", ["l4"], 3, 5, 11, -6],
  [107, ["Split the payment step into its own route", "فصل خطوة الدفع في مسار مستقل"], "backlog", "medium", "improvement", null, ["l1"], 8, null, 16, -5],
  [108, ["Address autocomplete for Gulf countries", "الإكمال التلقائي للعناوين لدول الخليج"], "backlog", "medium", "feature", null, ["l1", "l2"], 10, null, 18, -5],
  [109, ["Upgrade the payment SDK", "ترقية حزمة الدفع"], "done", "medium", "chore", "u2", ["l2"], 4, -12, -8, -16],
  [110, ["Guest checkout flow", "مسار الشراء كضيف"], "done", "high", "feature", "u3", ["l1"], 14, -12, -5, -16],
  [111, ["Sticky order summary on mobile", "ملخص الطلب الثابت في الجوال"], "review", "medium", "improvement", "u1", ["l1", "l3"], 4, -5, 1, -10],
  [112, ["Currency switcher flashes on load", "وميض مبدّل العملة عند التحميل"], "doing", "low", "bug", "u4", ["l1"], 2, -1, 4, -3],
  [113, ["Drop the legacy address form", "حذف نموذج العنوان القديم"], "canceled", "low", "chore", null, ["l1"], null, null, null, -12],
  [114, ["Measure checkout web vitals", "قياس مؤشرات أداء صفحة الدفع"], "todo", "medium", "task", "u2", ["l5"], 3, 6, 12, -4],
  [115, ["Write the payment failure copy", "كتابة نصوص فشل الدفع"], "doing", "medium", "task", "u1", ["l3"], 2, -2, 2, -4],
  [116, ["Refund confirmation email", "بريد تأكيد الاسترداد"], "backlog", "low", "feature", null, ["l2"], 5, null, 20, -3],
  [201, ["Update the totals table markup", "تحديث ترميز جدول الإجماليات"], "done", "medium", "task", "u3", ["l1"], 2, -6, -3, -9, 101],
  [202, ["Add the discount line", "إضافة سطر الخصم"], "doing", "medium", "task", "u3", ["l1"], 3, -3, 2, -8, 101],
  [203, ["Tax breakdown popover", "نافذة تفاصيل الضريبة"], "todo", "low", "task", "u1", ["l1", "l3"], 4, 1, 5, -7, 101],
];

const STORY_DESCRIPTION = {
  en: "<p>The summary is the last thing people read before paying, and it is where most of our support questions start.</p><ul><li>Show the discount and the tax as their own lines</li><li>Keep the total visible while the form scrolls</li><li>Announce a changed total to screen readers</li></ul><p>Design is in the shared file. Backend totals come from <code>orders/quote</code>.</p>",
  ar: "<p>الملخص هو آخر ما يقرأه العميل قبل الدفع، ومنه تبدأ معظم أسئلة الدعم.</p><ul><li>عرض الخصم والضريبة في سطرين مستقلين</li><li>إبقاء الإجمالي ظاهرًا أثناء تمرير النموذج</li><li>إعلان تغيّر الإجمالي لقارئات الشاشة</li></ul><p>التصميم في الملف المشترك، وإجماليات الخادم تأتي من <code>orders/quote</code>.</p>",
};

export const PROJECT_ID = "p-checkout";
export const projectsList = (ar: boolean) => [
  { id: PROJECT_ID, name: ar ? "إعادة تصميم الدفع" : "Checkout redesign" },
  { id: "p-app", name: ar ? "تطبيق الجوال" : "Mobile app" },
];

export const issues = (ar: boolean): Issue[] =>
  SEEDS.map(([n, title, statusId, priority, type, assignee, labelIds, estimate, start, due, created, parent]) => ({
    id: `i${n}`,
    key: `NSQ-${n}`,
    title: title[ar ? 1 : 0],
    description: n === 101 ? STORY_DESCRIPTION[ar ? "ar" : "en"] : undefined,
    statusId,
    priority,
    type,
    assigneeId: assignee,
    labelIds,
    estimateHours: estimate,
    startDate: start == null ? null : civil(start),
    dueDate: due == null ? null : civil(due),
    projectId: PROJECT_ID,
    parentId: parent ? `i${parent}` : null,
    createdAt: ago(-created * DAY),
    completedAt: statusId === "done" ? ago(2 * DAY) : null,
  }));

export const FEATURED = "i101";

/* ------------------------------------------------------------------ comments */

export const comments = (ar: boolean): ThreadComment[] => {
  const p = people(ar);
  const [layla, omar, nora] = p;
  return [
    {
      id: "c1",
      author: layla!,
      body: ar ? `مرحبًا @${nora!.name}، أرفقت النسخة الأخيرة من التصميم. الخصم أسفل المجموع الفرعي مباشرة.` : `Hi @${nora!.name}, the latest design is attached. The discount sits right under the subtotal.`,
      createdAt: ago(3 * DAY),
      mentions: [{ id: nora!.id, name: nora!.name }],
    },
    {
      id: "c2",
      author: nora!,
      body: ar ? "شكرًا ليلى. سأبدأ بجدول الإجماليات ثم أضيف النافذة المنبثقة للضريبة." : "Thanks Layla. I will start with the totals table, then add the tax popover.",
      createdAt: ago(3 * DAY - 2 * HOUR),
      parentId: "c1",
    },
    {
      id: "c3",
      author: { id: "a1", name: ar ? "وكيل المراجعة" : "Review agent", kind: "agent" },
      body: ar ? "فحصت الفرع: تغيّر الإجمالي لا يُعلَن لقارئات الشاشة. أضف `aria-live=\"polite\"` حول القيمة." : "Checked the branch: a changed total is not announced to screen readers. Wrap the value in `aria-live=\"polite\"`.",
      createdAt: ago(1 * DAY),
    },
    {
      id: "c4",
      author: { id: "cl1", name: ar ? "سلمى (العميل)" : "Salma (client)", kind: "client" },
      body: ar ? "هل يمكن إظهار سعر الشحن قبل إدخال العنوان؟" : "Can we show the shipping price before the address is entered?",
      createdAt: ago(5 * HOUR),
      pending: true,
    },
    {
      id: "c5",
      author: omar!,
      body: ar ? `@${nora!.name} إجماليات الخادم تُقرَّب لأقرب سنت لكل سطر، وليس للمجموع. انتبه لذلك في الواجهة.` : `@${nora!.name} the server rounds each line to the cent, not the total. Keep that in mind in the UI.`,
      createdAt: ago(2 * HOUR),
      mentions: [{ id: nora!.id, name: nora!.name }],
    },
  ];
};

/* ------------------------------------------------------------------ activity */

export const activities = (ar: boolean): ActivityRecord[] => {
  const [layla, , nora] = people(ar);
  return [
    { id: "a1", kind: "meeting", body: ar ? "اجتماع مراجعة التصميم مع العميل. تمت الموافقة على سطر الخصم." : "Design review with the client. The discount line is approved.", at: ago(4 * DAY), actor: layla, durationMinutes: 45 },
    { id: "a2", kind: "call", body: ar ? "مكالمة مع مسؤول الدفع حول قواعد التقريب." : "Call with the payments owner about rounding rules.", at: ago(2 * DAY), actor: nora, durationMinutes: 20 },
    { id: "a3", kind: "note", body: ar ? "العميل يفضّل عرض الضريبة كنافذة منبثقة لا كسطر." : "The client prefers the tax as a popover, not a line.", at: ago(1 * DAY), actor: layla },
    { id: "a4", kind: "task", body: ar ? "إرسال لقطات التصميم النهائية للعميل" : "Send the final design screenshots to the client", at: ago(-1 * DAY), actor: layla, done: false },
    { id: "a5", kind: "task", body: ar ? "مراجعة نص رسالة الخطأ مع فريق المحتوى" : "Review the error copy with the content team", at: ago(6 * HOUR), actor: nora, done: false },
    { id: "a6", kind: "task", body: ar ? "جمع ملاحظات الاختبار على الجوال" : "Collect mobile testing notes", at: ago(3 * DAY), actor: nora, done: true, doneAt: ago(2 * DAY) },
  ];
};

/* ------------------------------------------------------------------ checklist, dev, time, ai */

export const checklist = (ar: boolean): ChecklistItem[] => [
  { id: "k1", text: ar ? "مراجعة التصميم مع العميل" : "Review the design with the client", done: true },
  { id: "k2", text: ar ? "جدول الإجماليات" : "Totals table", done: true },
  {
    id: "k3",
    text: ar ? "سطر الخصم والضريبة" : "Discount and tax lines",
    done: false,
    subtasks: [
      { id: "k3a", text: ar ? "سطر الخصم" : "Discount line", done: true },
      { id: "k3b", text: ar ? "نافذة الضريبة" : "Tax popover", done: false },
    ],
  },
  { id: "k4", text: ar ? "إعلان التغيير لقارئات الشاشة" : "Announce changes to screen readers", done: false },
  { id: "k5", text: ar ? "اختبار على ثلاثة أجهزة" : "Test on three devices", done: false },
];

const dev = (ar: boolean) => ({
  repo: { owner: "nasaq", name: "checkout" },
  pulls: [
    { id: "pr1", number: 412, title: ar ? "ملخص الدفع الجديد" : "New checkout summary", author: { login: "nora-s" }, state: "open", createdAt: ago(1 * DAY), head: "feat/summary", base: "main" },
    { id: "pr2", number: 405, title: ar ? "توحيد أنماط الجدول" : "Unify table styles", author: { login: "layla-h" }, state: "merged", createdAt: ago(6 * DAY), mergedAt: ago(4 * DAY), mergedBy: { login: "omar-n" }, head: "chore/tables", base: "main" },
  ] as GithubPull[],
  commits: [
    { id: "9f2c1d47a0b8e5c3d6f1a2b3c4d5e6f708192a3b", message: "feat(summary): add discount and tax lines\n\nCloses NSQ-101", author: { login: "nora-s" }, date: ago(5 * HOUR), branch: "feat/summary", checks: "success" },
    { id: "3ab8e5d10c2f4a67b8c9d0e1f2a3b4c5d6e7f809", message: "fix(summary): keep total visible while scrolling", author: { login: "nora-s" }, date: ago(1 * DAY), branch: "feat/summary", checks: "pending" },
  ] as GithubCommit[],
  runs: [{ id: "r1", name: "CI", number: 1873, status: "success", branch: "feat/summary", sha: "9f2c1d4", event: "push", actor: { login: "nora-s" }, startedAt: ago(5 * HOUR), durationMs: 184_000 }] as GithubRun[],
});

const timeProjects = (ar: boolean, list: Issue[]): TimeProject[] => [
  { id: PROJECT_ID, name: projectsList(ar)[0]!.name, tasks: list.filter((i) => !i.parentId).map((i) => ({ id: i.id, name: `${i.key} ${i.title}` })) },
];

const seedTime = (): (TimeEntry & { issueId?: string })[] => [
  { id: "t1", date: civil(0), seconds: 5400, projectId: PROJECT_ID, taskId: "i101", issueId: "i101", note: "Totals table" },
  { id: "t2", date: civil(-1), seconds: 9000, projectId: PROJECT_ID, taskId: "i101", issueId: "i101", note: "Discount line" },
  { id: "t3", date: civil(-1), seconds: 3600, projectId: PROJECT_ID, taskId: "i102", issueId: "i102" },
  { id: "t4", date: civil(-2), seconds: 7200, projectId: PROJECT_ID, taskId: "i103", issueId: "i103", note: "Rounding" },
  { id: "t5", date: civil(-4), seconds: 12_600, projectId: PROJECT_ID, taskId: "i110", issueId: "i110" },
];

export const aiDays: AiCostDay[] = Array.from({ length: 14 }, (_, i) => {
  const n = 13 - i;
  const base = 2.4 + ((i * 5) % 7) * 0.9;
  const d = new Date();
  d.setDate(d.getDate() - n);
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { date, billed: n > 3 ? Math.round(base * 100) / 100 : 0, unbilled: n > 3 ? 0 : Math.round(base * 100) / 100 };
});

const aiByModel: AiCostRow[] = [
  { id: "opus", label: "Opus 5.5", tokensIn: 410_000, tokensOut: 62_000, cost: 21.4, previous: 18 },
  { id: "sonnet", label: "Sonnet 5.5", tokensIn: 1_900_000, tokensOut: 240_000, cost: 12.8, previous: 14 },
  { id: "haiku", label: "Haiku 4.5", tokensIn: 3_200_000, tokensOut: 310_000, cost: 3.1 },
];
const aiByProduct = (ar: boolean): AiCostRow[] => [
  { id: "review", label: ar ? "مراجعة الكود" : "Code review", tokensIn: 2_600_000, tokensOut: 300_000, cost: 22.7 },
  { id: "triage", label: ar ? "فرز البلاغات" : "Issue triage", tokensIn: 2_900_000, tokensOut: 312_000, cost: 14.6 },
];
const aiByRun: AiCostRow[] = [
  { id: "run_4a10", label: "run_4a10 · review NSQ-101", tokensIn: 420_000, tokensOut: 48_000, cost: 3.9 },
  { id: "run_4a0c", label: "run_4a0c · review NSQ-102", tokensIn: 310_000, tokensOut: 41_000, cost: 2.6 },
];

const projectFiles = (ar: boolean): ProjectFile[] => [
  { id: "f1", name: "checkout-design-v4.fig", size: 8_400_000, uploadedBy: people(ar)[0]!.name, uploadedAt: ago(5 * DAY) },
  { id: "f2", name: ar ? "عقد-المشروع.pdf" : "project-contract.pdf", size: 412_000, uploadedBy: people(ar)[1]!.name, uploadedAt: ago(20 * DAY) },
  { id: "f3", name: "payment-flow.png", size: 1_240_000, uploadedBy: people(ar)[2]!.name, uploadedAt: ago(2 * DAY) },
];

export const projectDetails = (ar: boolean): ProjectDetails => ({
  id: PROJECT_ID,
  name: projectsList(ar)[0]!.name,
  key: "NSQ",
  client: ar ? "متجر الواحة" : "Oasis Market",
  status: "active",
  progress: 0,
  members: people(ar) as EntityPerson[],
  startDate: civil(-14),
  dueDate: civil(20),
  budget: 6000,
  currency: "USD",
});

const projectActivity = (ar: boolean): ProjectActivityItem[] => {
  const [layla, omar, nora] = people(ar);
  return [
    { id: "pa1", kind: "status", actor: nora, title: ar ? "نقلت NSQ-102 إلى قيد المراجعة" : "moved NSQ-102 to In review", at: ago(1 * HOUR) },
    { id: "pa2", kind: "comment", actor: omar, title: ar ? "علّق على NSQ-103" : "commented on NSQ-103", description: ar ? "التقريب يتم لكل سطر." : "Rounding happens per line.", at: ago(3 * HOUR) },
    { id: "pa3", kind: "code", actor: nora, title: ar ? "دفعت 3 إيداعات إلى feat/summary" : "pushed 3 commits to feat/summary", at: ago(5 * HOUR) },
    { id: "pa4", kind: "issue", actor: layla, title: ar ? "أنشأت NSQ-116" : "created NSQ-116", at: ago(1 * DAY) },
    { id: "pa5", kind: "file", actor: omar, title: ar ? "رفع payment-flow.png" : "uploaded payment-flow.png", at: ago(1 * DAY + 2 * HOUR) },
    { id: "pa6", kind: "status", actor: nora, title: ar ? "أنجزت NSQ-201" : "completed NSQ-201", at: ago(2 * DAY) },
    { id: "pa7", kind: "time", actor: omar, title: ar ? "سجّل 2 ساعة على NSQ-104" : "logged 2h on NSQ-104", at: ago(2 * DAY + 3 * HOUR) },
    { id: "pa8", kind: "member", actor: layla, title: ar ? "أضافت نورة إلى المشروع" : "added Nora to the project", at: ago(4 * DAY) },
    { id: "pa9", kind: "comment", actor: layla, title: ar ? "علّقت على NSQ-101" : "commented on NSQ-101", description: ar ? "هل نضيف سطر الخصم؟" : "Should we add the discount line?", at: ago(4 * DAY + 5 * HOUR) },
    { id: "pa10", kind: "issue", actor: omar, title: ar ? "أنشأ NSQ-110" : "created NSQ-110", at: ago(6 * DAY) },
  ];
};

/* ------------------------------------------------------------------ state */

/** All the state a project and its issues need, with fake async handlers. */
export function useWorkspace(ar: boolean) {
  const [list, setList] = useState<Issue[]>(() => issues(ar));
  const [status, setStatus] = useState<WorkStatus[]>(() => statuses(ar));
  const [tags, setTags] = useState<WorkLabel[]>(() => labels(ar));
  const [thread, setThread] = useState<Record<string, ThreadComment[]>>(() => ({ [FEATURED]: comments(ar) }));
  const [log, setLog] = useState<Record<string, ActivityRecord[]>>(() => ({ [FEATURED]: activities(ar) }));
  const [checks, setChecks] = useState<Record<string, ChecklistItem[]>>(() => ({ [FEATURED]: checklist(ar) }));
  const [time, setTime] = useState(seedTime);
  const [running, setRunning] = useState<RunningTimer | null>(null);
  const [files, setFiles] = useState<ProjectFile[]>(() => projectFiles(ar));
  const [project, setProject] = useState<ProjectDetails>(() => projectDetails(ar));
  const n = useRef(1000);
  const id = (p: string) => `${p}${n.current++}`;
  const me = people(ar)[2]!;
  const projects = useMemo(() => projectsList(ar), [ar]);

  const update = async (issueId: string, patch: IssuePatch) => {
    await wait(350);
    setList((all) => all.map((i) => (i.id === issueId ? applyIssuePatch(i, patch, status) : i)));
  };

  const timeHandlers = (issueId?: string) => ({
    running,
    onRunningChange: setRunning,
    onStop: async (s: { seconds: number; projectId: string; taskId?: string; note?: string }) => {
      await wait(300);
      setTime((all) => [{ id: id("t"), date: civil(0), seconds: Math.max(60, s.seconds), projectId: s.projectId, taskId: s.taskId, note: s.note, issueId: issueId ?? s.taskId }, ...all]);
    },
    onAdd: async (input: Omit<TimeEntry, "id">) => {
      await wait(300);
      setTime((all) => [{ id: id("t"), ...input, issueId: issueId ?? input.taskId }, ...all]);
    },
    onEdit: async (entry: TimeEntry, input: Omit<TimeEntry, "id">) => {
      await wait(300);
      setTime((all) => all.map((e) => (e.id === entry.id ? { ...e, ...input } : e)));
    },
    onDelete: (entry: TimeEntry) => setTime((all) => all.filter((e) => e.id !== entry.id)),
  });

  const commentProps = (issueId: string): NonNullable<IssueViewProps["thread"]> => ({
    comments: thread[issueId] ?? [],
    currentUser: me,
    suggestions: mentionOptions(ar),
    canModerate: true,
    onSubmit: async ({ body, mentions, parentId }: CommentInput) => {
      await wait(450);
      setThread((all) => ({ ...all, [issueId]: [...(all[issueId] ?? []), { id: id("c"), author: me, body, mentions, parentId, createdAt: Date.now() }] }));
    },
    onEdit: async (cid, body) => {
      await wait(300);
      setThread((all) => ({ ...all, [issueId]: (all[issueId] ?? []).map((c) => (c.id === cid ? { ...c, body, editedAt: Date.now() } : c)) }));
    },
    onDelete: async (cid) => {
      await wait(300);
      setThread((all) => ({ ...all, [issueId]: (all[issueId] ?? []).filter((c) => c.id !== cid && c.parentId !== cid) }));
    },
    onApprove: async (cid) => {
      await wait(300);
      setThread((all) => ({ ...all, [issueId]: (all[issueId] ?? []).map((c) => (c.id === cid ? { ...c, pending: false } : c)) }));
    },
  });

  const activityProps = (issueId: string): NonNullable<IssueViewProps["activity"]> => ({
    items: log[issueId] ?? [],
    onSubmit: async (input) => {
      await wait(400);
      setLog((all) => ({ ...all, [issueId]: [...(all[issueId] ?? []), { id: id("a"), kind: input.kind, body: input.body, at: input.at, actor: me, durationMinutes: input.durationMinutes, done: input.kind === "task" ? false : undefined }] }));
    },
    onToggleTask: async (aid, done) => {
      await wait(250);
      setLog((all) => ({ ...all, [issueId]: (all[issueId] ?? []).map((a) => (a.id === aid ? { ...a, done, doneAt: done ? Date.now() : null } : a)) }));
    },
    onDelete: async (aid) => {
      await wait(250);
      setLog((all) => ({ ...all, [issueId]: (all[issueId] ?? []).filter((a) => a.id !== aid) }));
    },
  });

  const issueProps = (issue: Issue): IssueViewProps => {
    const items = checks[issue.id] ?? [];
    const patchItems = (fn: (l: ChecklistItem[]) => ChecklistItem[]) => setChecks((all) => ({ ...all, [issue.id]: fn(all[issue.id] ?? []) }));
    const flip = (l: ChecklistItem[], cid: string, done: boolean): ChecklistItem[] => l.map((x) => (x.id === cid ? { ...x, done } : { ...x, subtasks: x.subtasks ? flip(x.subtasks, cid, done) : undefined }));
    return {
      issue,
      statuses: status,
      labels: tags,
      people: people(ar),
      projects,
      parentOptions: list.map((i) => ({ id: i.id, key: i.key, title: i.title, statusId: i.statusId, parentId: i.parentId })),
      onUpdate: (patch) => update(issue.id, patch),
      checklist: {
        items,
        onToggle: async (cid, done) => {
          await wait(200);
          patchItems((l) => flip(l, cid, done));
        },
        onAdd: async (text, parentId) => {
          await wait(250);
          patchItems((l) => (parentId ? l.map((x) => (x.id === parentId ? { ...x, subtasks: [...(x.subtasks ?? []), { id: id("k"), text, done: false }] } : x)) : [...l, { id: id("k"), text, done: false }]));
        },
        onRemove: async (cid) => {
          await wait(200);
          patchItems((l) => l.filter((x) => x.id !== cid).map((x) => ({ ...x, subtasks: x.subtasks?.filter((s) => s.id !== cid) })));
        },
      },
      subIssues: list.filter((i) => i.parentId === issue.id).map((i) => ({ id: i.id, key: i.key, title: i.title, statusId: i.statusId, assigneeId: i.assigneeId })),
      onAddSubIssue: async (title) => {
        await wait(350);
        const num = 300 + list.length;
        setList((all) => [...all, { id: `i${num}`, key: `NSQ-${num}`, title, statusId: "todo", priority: "medium", type: "task", labelIds: [], projectId: PROJECT_ID, parentId: issue.id, createdAt: Date.now() }]);
      },
      development: issue.id === FEATURED ? dev(ar) : undefined,
      thread: commentProps(issue.id),
      activity: activityProps(issue.id),
      time: { entries: time.filter((e) => e.issueId === issue.id), ...timeHandlers(issue.id) },
      ai: { days: aiDays, byModel: aiByModel, byProduct: aiByProduct(ar), byRun: aiByRun, markup: 0.2, currency: "USD", previousTotal: 30, run: { tokensIn: 420_000, tokensOut: 48_000, cached: 250_000, cost: 3.9, budget: 5 } },
    };
  };

  const done = list.filter((i) => status.find((s) => s.id === i.statusId)?.stage === "done").length;
  const live = list.filter((i) => status.find((s) => s.id === i.statusId)?.stage !== "canceled").length;

  const projectProps = (): ProjectViewProps => ({
    project: { ...project, progress: live ? Math.round((done / live) * 100) : 0 },
    issues: list,
    statuses: status,
    labels: tags,
    people: people(ar),
    onUpdateIssue: update,
    onMoveIssue: async (issueId, statusId, index) => {
      await wait(300);
      setList((all) => moveProjectIssue(all, issueId, statusId, index, status));
    },
    onCreateIssue: async ({ title, type, priority }) => {
      await wait(400);
      const num = 300 + list.length;
      setList((all) => [...all, { id: `i${num}`, key: `NSQ-${num}`, title, statusId: "backlog", priority, type, labelIds: [], projectId: PROJECT_ID, createdAt: Date.now() }]);
    },
    onDeleteIssue: async (issueId) => {
      await wait(300);
      setList((all) => all.filter((i) => i.id !== issueId));
    },
    activity: projectActivity(ar),
    budget: { total: 6000, spent: 3860, currency: "USD" },
    notes: activityProps(PROJECT_ID),
    time: { entries: time, projects: timeProjects(ar, list), ...timeHandlers() },
    ai: { days: aiDays, byModel: aiByModel, byProduct: aiByProduct(ar), byRun: aiByRun, markup: 0.2, currency: "USD", previousTotal: 30 },
    files,
    onUploadFiles: async (picked) => {
      await wait(500);
      setFiles((all) => [...picked.map((f) => ({ id: id("f"), name: f.name, size: f.size, uploadedBy: me.name, uploadedAt: Date.now() })), ...all]);
    },
    onDownloadFile: () => undefined,
    onDeleteFile: async (fid) => {
      await wait(250);
      setFiles((all) => all.filter((f) => f.id !== fid));
    },
    onSaveProject: async (patch) => {
      await wait(400);
      setProject((p) => ({ ...p, ...patch }));
    },
    workflow: {
      onSaveStatus: async (d) => {
        await wait(300);
        setStatus((all) => (d.id ? all.map((s) => (s.id === d.id ? { ...s, ...d, id: s.id } : s)) : [...all, { id: id("s"), name: d.name, hue: d.hue, stage: d.stage }]));
      },
      onDeleteStatus: async (sid) => {
        await wait(300);
        setStatus((all) => all.filter((s) => s.id !== sid));
      },
      onReorderStatuses: async (ids) => {
        await wait(200);
        setStatus((all) => ids.map((sid) => all.find((s) => s.id === sid)!).filter(Boolean));
      },
      onSaveLabel: async (d) => {
        await wait(300);
        setTags((all) => (d.id ? all.map((l) => (l.id === d.id ? { ...l, ...d, id: l.id } : l)) : [...all, { id: id("l"), name: d.name, hue: d.hue }]));
      },
      onDeleteLabel: async (lid) => {
        await wait(300);
        setTags((all) => all.filter((l) => l.id !== lid));
      },
    },
  });

  return { list, issueProps, projectProps, thread: commentProps, activity: activityProps, me };
}

/* ------------------------------------------------------------------ demos */

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-8">{children}</div>
    </div>
  );
}

function IssuePageInner({ ar }: { ar: boolean }) {
  const w = useWorkspace(ar);
  const issue = w.list.find((i) => i.id === FEATURED)!;
  return (
    <Frame>
      <IssueView {...w.issueProps(issue)} variant="page" onBack={() => undefined} onOpenIssue={() => undefined} />
    </Frame>
  );
}

/** The full issue page. */
export function IssuePageDemo() {
  const ar = useAr();
  return <IssuePageInner key={ar ? "ar" : "en"} ar={ar} />;
}

function IssueViewInner({ ar, variant, initialTab }: { ar: boolean; variant: "page" | "drawer"; initialTab?: IssueViewProps["defaultTab"] }) {
  const w = useWorkspace(ar);
  const issue = w.list.find((i) => i.id === FEATURED)!;
  return <IssueView {...w.issueProps(issue)} variant={variant} defaultTab={initialTab} />;
}

/** The issue view on its own, as a page or in the narrow drawer layout. */
export function IssueViewDemo({ variant = "page", tab }: { variant?: "page" | "drawer"; tab?: IssueViewProps["defaultTab"] }) {
  const ar = useAr();
  return <IssueViewInner key={ar ? "ar" : "en"} ar={ar} variant={variant} initialTab={tab} />;
}

function QuickViewInner({ ar }: { ar: boolean }) {
  const w = useWorkspace(ar);
  const [open, setOpen] = useState(true);
  const issue = w.list.find((i) => i.id === FEATURED)!;
  return (
    <div className="flex flex-col items-start gap-3 p-4">
      <button type="button" className="rounded-md border px-3 py-1.5 text-body-sm" onClick={() => setOpen(true)}>
        {ar ? "فتح العرض السريع" : "Open quick view"}
      </button>
      <IssueQuickView {...w.issueProps(issue)} open={open} onOpenChange={setOpen} onOpenFull={() => setOpen(false)} />
    </div>
  );
}

/** The quick-view drawer, opened over the page. */
export function IssueQuickViewDemo() {
  const ar = useAr();
  return <QuickViewInner key={ar ? "ar" : "en"} ar={ar} />;
}

function ProjectPageInner({ ar, tab }: { ar: boolean; tab?: ProjectTab }) {
  const w = useWorkspace(ar);
  const extras = useProjectExtras(ar, people(ar), w.me);
  const base = w.projectProps();
  const [openId, setOpenId] = useState<string | null>(null);
  const issue = w.list.find((i) => i.id === openId);
  return (
    <Frame>
      <ProjectView {...base} {...extras} settings={{ ...extras.settings, onArchive: async () => base.onSaveProject?.({ status: "archived" }) }} defaultTab={tab} onOpenIssue={(i) => setOpenId(i.id)} />
      {issue ? <IssueQuickView {...w.issueProps(issue)} open onOpenChange={(o) => !o && setOpenId(null)} onOpenFull={() => setOpenId(null)} onOpenIssue={(id) => setOpenId(id)} /> : null}
    </Frame>
  );
}

/** The project page: header, tabs and the issue quick view. */
export function ProjectPageDemo({ tab }: { tab?: ProjectTab }) {
  const ar = useAr();
  return <ProjectPageInner key={ar ? "ar" : "en"} ar={ar} tab={tab} />;
}

function ThreadInner({ ar, signedIn, empty }: { ar: boolean; signedIn: boolean; empty: boolean }) {
  const w = useWorkspace(ar);
  const props = w.thread(FEATURED);
  return <div className="mx-auto max-w-2xl"><CommentThread {...(props as CommentThreadProps)} comments={empty ? [] : props.comments} signedIn={signedIn} /></div>;
}


/** The comment thread with the demo comments. */
export function CommentThreadDemo({ signedIn = true, empty = false }: { signedIn?: boolean; empty?: boolean }) {
  const ar = useAr();
  return <ThreadInner key={ar ? "ar" : "en"} ar={ar} signedIn={signedIn} empty={empty} />;
}

function ActivityInner({ ar, empty }: { ar: boolean; empty: boolean }) {
  const w = useWorkspace(ar);
  const a = w.activity(FEATURED);
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <ActivityComposer onSubmit={a.onSubmit} />
      <ActivityTimeline activities={empty ? [] : a.items.map((x) => x)} onToggleTask={a.onToggleTask} onDelete={a.onDelete} />
    </div>
  );
}

/** The composer above the history, open tasks first. */
export function ActivityDemo({ empty = false }: { empty?: boolean }) {
  const ar = useAr();
  return <ActivityInner key={ar ? "ar" : "en"} ar={ar} empty={empty} />;
}
