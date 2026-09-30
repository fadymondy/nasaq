/* Shared fixtures for the Q3 developer stories: error tracking, marketplace, repository picker and API reference.
   Everything is fake: names, hosts (example domains) and numbers. */
import type { ApiTool, ErrorIssue, MarketplaceListing, MarketplaceTemplate, PickerBranch, PickerRepo } from "@nasaq/web";
import { Bell, Bot, Calendar, FileText, GitBranch, Mail, MessageSquare, Shield, Workflow } from "lucide-react";
import { FlowPage, useAr, wait } from "./_workflow-demo";

export { FlowPage, useAr, wait };

const NOW = Date.now();
const ago = (min: number) => NOW - min * 60_000;

/* ------------------------------------------------------------------ error tracking */

/** A page capture drawn as SVG, so the demo needs no image file. Named colours only. */
const shot = (title: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540"><rect width="960" height="540" fill="white"/><rect width="960" height="56" fill="whitesmoke"/><circle cx="32" cy="28" r="10" fill="lightgray"/><rect x="64" y="20" width="220" height="16" rx="8" fill="lightgray"/><rect x="48" y="96" width="420" height="24" rx="6" fill="gainsboro"/><rect x="48" y="140" width="864" height="140" rx="10" fill="whitesmoke" stroke="lightgray"/><rect x="48" y="304" width="864" height="60" rx="10" fill="mistyrose" stroke="lightcoral"/><text x="72" y="340" font-family="sans-serif" font-size="18" fill="darkred">${title}</text><rect x="48" y="392" width="140" height="40" rx="8" fill="steelblue"/></svg>`,
  )}`;

export function errorIssues(ar: boolean): ErrorIssue[] {
  return [
    {
      id: "e1",
      title: "TypeError: Cannot read properties of undefined (reading 'total')",
      culprit: "src/checkout/cart.ts in computeTotals",
      level: "error",
      status: "unresolved",
      count: 1284,
      users: 212,
      firstSeen: ago(60 * 24 * 6),
      lastSeen: ago(4),
      series: [3, 5, 4, 8, 12, 19, 27, 41, 58, 74, 96, 131],
      release: "web@4.12.0",
      environment: "production",
      tags: { browser: "Chrome 141", os: "Windows 11", route: "/checkout", locale: ar ? "ar-SA" : "en-US" },
      frames: [
        { file: "node_modules/react-dom/cjs/react-dom.development.js", fn: "commitRoot", line: 26011, column: 5 },
        {
          file: "src/checkout/cart.ts",
          fn: "computeTotals",
          line: 48,
          column: 22,
          inApp: true,
          context: [
            { line: 46, code: "  const lines = cart.lines ?? [];" },
            { line: 47, code: "  const discount = cart.coupon;" },
            { line: 48, code: "  return lines.reduce((sum, l) => sum + l.price.total, discount.value);" },
            { line: 49, code: "}" },
          ],
        },
        { file: "src/checkout/summary.tsx", fn: "Summary", line: 17, column: 9, inApp: true },
      ],
      breadcrumbs: [
        { at: ago(4.5), type: "navigation", message: "/cart -> /checkout" },
        { at: ago(4.4), type: "http", message: "GET /api/cart 200" },
        { at: ago(4.3), type: "ui", message: "click button#apply-coupon" },
        { at: ago(4.2), type: "console", message: "coupon expired" },
        { at: ago(4.1), type: "error", message: "TypeError: Cannot read properties of undefined" },
      ],
      diagnostics: {
        screenshot: shot("Something went wrong"),
        console: [
          { at: ago(4.4), level: "info", message: "cart loaded (3 lines)" },
          { at: ago(4.2), level: "warn", message: "coupon SPRING10 expired" },
          { at: ago(4.1), level: "error", message: "Uncaught TypeError: Cannot read properties of undefined (reading 'total')" },
        ],
        network: [
          { at: ago(4.5), method: "GET", url: "https://api.example.com/v1/cart", status: 200, duration: 132 },
          { at: ago(4.4), method: "POST", url: "https://api.example.com/v1/coupons/apply", status: 422, duration: 88 },
          { at: ago(4.3), method: "GET", url: "https://api.example.com/v1/shipping", status: 504, duration: 10021 },
          { at: ago(4.3), method: "GET", url: "https://cdn.example.com/img/hero.webp", status: 200, duration: 41 },
        ],
      },
    },
    {
      id: "e2",
      title: "NetworkError: Failed to fetch /api/notifications",
      culprit: "src/lib/http.ts in request",
      level: "warning",
      status: "unresolved",
      count: 640,
      users: 98,
      firstSeen: ago(60 * 24 * 3),
      lastSeen: ago(22),
      series: [30, 22, 26, 18, 20, 12, 15, 9, 8, 6, 7, 4],
      release: "web@4.12.0",
      environment: "production",
      tags: { browser: "Safari 19", route: "/inbox" },
      frames: [{ file: "src/lib/http.ts", fn: "request", line: 92, column: 11, inApp: true }],
      breadcrumbs: [{ at: ago(23), type: "http", message: "GET /api/notifications failed" }],
    },
    {
      id: "e3",
      title: "RangeError: Invalid time value",
      culprit: "src/lib/dates.ts in formatDay",
      level: "error",
      status: "resolved",
      count: 77,
      users: 14,
      firstSeen: ago(60 * 24 * 12),
      lastSeen: ago(60 * 24 * 2),
      series: [9, 12, 8, 6, 3, 1, 0, 0, 0, 0, 0, 0],
      release: "web@4.10.3",
      environment: "production",
    },
    {
      id: "e4",
      title: "ChunkLoadError: Loading chunk 482 failed",
      culprit: "webpack/runtime/load-script",
      level: "fatal",
      status: "unresolved",
      count: 31,
      users: 29,
      firstSeen: ago(60 * 5),
      lastSeen: ago(51),
      series: [0, 0, 0, 0, 0, 0, 1, 2, 6, 9, 8, 5],
      release: "web@4.12.0",
      environment: "production",
    },
    {
      id: "e5",
      title: "Error: ResizeObserver loop completed with undelivered notifications",
      culprit: "(unknown)",
      level: "info",
      status: "ignored",
      count: 5210,
      users: 1180,
      firstSeen: ago(60 * 24 * 30),
      lastSeen: ago(1),
      series: [400, 410, 395, 420, 430, 401, 415, 440, 420, 418, 425, 431],
      release: "web@4.12.0",
      environment: "production",
    },
  ];
}

/* ------------------------------------------------------------------ marketplace */

export const marketCats = (ar: boolean) => [
  { id: "comms", label: ar ? "المراسلة" : "Messaging" },
  { id: "automation", label: ar ? "الأتمتة" : "Automation" },
  { id: "security", label: ar ? "الأمان" : "Security" },
  { id: "productivity", label: ar ? "الإنتاجية" : "Productivity" },
];

export function marketListings(ar: boolean): MarketplaceListing[] {
  const publisher = (en: string, a: string) => (ar ? a : en);
  const perms = (ar: boolean) => ({
    read: { id: "data.read", label: ar ? "قراءة بيانات مساحة العمل" : "Read workspace data", description: ar ? "المشاريع والمهام والتعليقات." : "Projects, tasks and comments.", risk: "low" as const },
    send: { id: "mail.send", label: ar ? "إرسال بريد باسمك" : "Send email as you", description: ar ? "يرسل رسائل من حسابك." : "Sends messages from your account.", risk: "high" as const },
    hooks: { id: "webhooks", label: ar ? "استدعاء عناوين خارجية" : "Call external URLs", description: ar ? "يرسل بيانات إلى خوادم الناشر." : "Sends data to the publisher's servers.", risk: "medium" as const },
  });
  const p = perms(ar);
  const shots = [
    { src: shot("Send email"), alt: ar ? "شاشة إعداد الإرسال" : "The send settings screen" },
    { src: shot("Templates"), alt: ar ? "شاشة القوالب" : "The templates screen" },
  ];
  return [
    {
      id: "mail",
      name: ar ? "إرسال البريد" : "Mail sender",
      summary: ar ? "أرسل رسائل مبنية على قوالب من أي خطوة." : "Send templated email from any step.",
      description: ar ? "أرسل رسائل بريد بقوالب جاهزة ومتغيرات من بيانات المشروع.\n\nيدعم المرفقات والنسخ المخفية وتتبع التسليم." : "Send email from ready templates with variables taken from your project data.\n\nSupports attachments, blind copies and delivery tracking.",
      category: "comms",
      icon: Mail,
      publisher: publisher("Northwind Labs", "مختبرات الشمال"),
      version: "2.4.1",
      badge: ar ? "رسمي" : "Official",
      installs: 18400,
      rating: 4.7,
      ratingCount: 512,
      tags: ["email", "templates"],
      updatedAt: ago(60 * 24 * 6),
      featured: true,
      screenshots: shots,
      permissions: [p.send, p.read, p.hooks],
      changelog: [
        { version: "2.4.1", date: ago(60 * 24 * 6), notes: [ar ? "إصلاح ترميز العناوين العربية." : "Fixed encoding of Arabic subjects.", ar ? "أسرع في الإرسال الجماعي." : "Faster bulk sends."] },
        { version: "2.4.0", date: ago(60 * 24 * 30), notes: [ar ? "دعم المرفقات الكبيرة." : "Large attachment support."] },
      ],
      reviews: [
        { id: "r1", author: ar ? "ليلى حداد" : "Layla Haddad", rating: 5, date: ago(60 * 24 * 4), body: ar ? "يعمل من أول مرة، والقوالب ممتازة." : "Worked the first time, and the templates are great." },
        { id: "r2", author: "Sam Ortega", rating: 4, date: ago(60 * 24 * 9), body: ar ? "جيد، لكنني أتمنى معاينة قبل الإرسال." : "Good, but I would like a preview before sending." },
      ],
      links: [
        { label: ar ? "الموقع" : "Website", href: "https://example.com/mail" },
        { label: ar ? "الشيفرة المصدرية" : "Source code", href: "https://example.com/mail/source" },
      ],
      compatibility: "Nasaq 4+",
      license: "MIT",
      size: "1.2 MB",
    },
    {
      id: "chat",
      name: ar ? "رسائل الفريق" : "Team chat",
      summary: ar ? "أرسل تنبيهات إلى قنوات الفريق." : "Post alerts to team channels.",
      category: "comms",
      icon: MessageSquare,
      publisher: publisher("Acme", "أكمي"),
      version: "1.9.0",
      installs: 9200,
      rating: 4.4,
      ratingCount: 201,
      updatedAt: ago(60 * 24 * 10),
      featured: true,
      permissions: [p.hooks],
      links: [{ label: ar ? "الوثائق" : "Docs", href: "https://example.com/chat/docs" }],
      license: "Apache-2.0",
    },
    {
      id: "flow",
      name: ar ? "منسّق سير العمل" : "Flow orchestrator",
      summary: ar ? "اربط الخطوات بشروط وجداول زمنية." : "Chain steps with conditions and schedules.",
      category: "automation",
      icon: Workflow,
      publisher: "Northwind Labs",
      version: "3.0.0",
      badge: ar ? "جديد" : "New",
      installs: 4100,
      rating: 4.9,
      ratingCount: 87,
      price: { amount: 9, currency: "USD", period: "month" },
      updatedAt: ago(60 * 24 * 2),
      featured: true,
      permissions: [p.read],
      changelog: [{ version: "3.0.0", date: ago(60 * 24 * 2), notes: [ar ? "محرر مرئي جديد." : "New visual editor."] }],
    },
    {
      id: "guard",
      name: ar ? "حارس الأسرار" : "Secret guard",
      summary: ar ? "افحص المستودعات بحثًا عن مفاتيح مسرّبة." : "Scan repositories for leaked keys.",
      category: "security",
      icon: Shield,
      publisher: "Acme",
      version: "1.2.3",
      installs: 2300,
      rating: 4.6,
      ratingCount: 44,
      permissions: [p.read],
      installed: true,
      updatedAt: ago(60 * 24 * 20),
    },
    {
      id: "cal",
      name: ar ? "مزامنة التقويم" : "Calendar sync",
      summary: ar ? "اعرض المواعيد النهائية في تقويمك." : "Show deadlines in your calendar.",
      category: "productivity",
      icon: Calendar,
      publisher: "Orbit",
      version: "0.9.4",
      installs: 5600,
      rating: 4.2,
      ratingCount: 120,
      updatedAt: ago(60 * 24 * 40),
    },
    {
      id: "docs",
      name: ar ? "مولّد الوثائق" : "Doc writer",
      summary: ar ? "حوّل الشيفرة إلى وثائق جاهزة." : "Turn code into ready documentation.",
      category: "productivity",
      icon: FileText,
      publisher: "Orbit",
      version: "1.0.2",
      installs: 1300,
      rating: 4.0,
      ratingCount: 19,
      price: { amount: 5, currency: "USD", period: "month" },
    },
    {
      id: "bot",
      name: ar ? "مساعد المراجعة" : "Review assistant",
      summary: ar ? "يعلّق على الطلبات بملاحظات مفيدة." : "Comments on pull requests with useful notes.",
      category: "automation",
      icon: Bot,
      publisher: "Northwind Labs",
      version: "0.7.0",
      installs: 3100,
      rating: 4.5,
      ratingCount: 61,
      permissions: [p.read, p.hooks],
    },
    {
      id: "bell",
      name: ar ? "منبّه الحوادث" : "Incident pager",
      summary: ar ? "نبّه المناوب عند تعطل الخدمة." : "Page whoever is on call when a service fails.",
      category: "comms",
      icon: Bell,
      publisher: "Acme",
      version: "2.1.0",
      installs: 7800,
      rating: 4.8,
      ratingCount: 260,
      permissions: [p.hooks],
    },
  ];
}

export const templateCats = (ar: boolean) => [
  { id: "onboarding", label: ar ? "الانضمام" : "Onboarding" },
  { id: "support", label: ar ? "الدعم" : "Support" },
  { id: "devops", label: ar ? "التشغيل" : "DevOps" },
];

export function marketTemplates(ar: boolean): MarketplaceTemplate[] {
  return [
    { id: "t1", name: ar ? "ترحيب بالموظف الجديد" : "New hire welcome", summary: ar ? "مهام اليوم الأول والحسابات والاجتماعات." : "First-day tasks, accounts and meetings.", category: "onboarding", icon: Workflow, uses: 3200, preview: shot(ar ? "ترحيب" : "Welcome"), previewAlt: ar ? "معاينة القالب" : "Template preview" },
    { id: "t2", name: ar ? "فرز تذاكر الدعم" : "Support triage", summary: ar ? "صنّف التذاكر ووجّهها للفريق المناسب." : "Label tickets and route them to the right team.", category: "support", icon: MessageSquare, uses: 1900 },
    { id: "t3", name: ar ? "نشر مع موافقة" : "Deploy with approval", summary: ar ? "بوابة موافقة قبل كل نشر للإنتاج." : "An approval gate before every production deploy.", category: "devops", icon: GitBranch, uses: 2700 },
    { id: "t4", name: ar ? "تقرير أسبوعي" : "Weekly report", summary: ar ? "ملخص أسبوعي يُرسل كل اثنين." : "A summary sent every Monday.", category: "support", icon: FileText, uses: 850 },
  ];
}

export const permissionOptions = (ar: boolean) => [
  { id: "data.read", label: ar ? "قراءة بيانات مساحة العمل" : "Read workspace data", description: ar ? "المشاريع والمهام والتعليقات." : "Projects, tasks and comments.", risk: "low" as const },
  { id: "webhooks", label: ar ? "استدعاء عناوين خارجية" : "Call external URLs", risk: "medium" as const },
  { id: "mail.send", label: ar ? "إرسال بريد باسم المستخدم" : "Send email as the user", risk: "high" as const },
];

/* ------------------------------------------------------------------ repository picker */

const REPOS: PickerRepo[] = [
  { id: "1", fullName: "acme/storefront", description: "Customer-facing web store", language: "TypeScript", defaultBranch: "main", stars: 1240, updatedAt: ago(90) },
  { id: "2", fullName: "acme/api-gateway", description: "Edge routing and auth", language: "Go", defaultBranch: "main", private: true, stars: 310, updatedAt: ago(60 * 5) },
  { id: "3", fullName: "acme/design-tokens", description: "Shared tokens", language: "CSS", defaultBranch: "trunk", stars: 88, updatedAt: ago(60 * 24 * 3) },
  { id: "4", fullName: "acme/mobile-app", description: "iOS and Android", language: "Kotlin", defaultBranch: "develop", private: true, stars: 45, updatedAt: ago(60 * 24 * 9) },
  { id: "5", fullName: "acme/docs", description: "Public documentation", language: "MDX", defaultBranch: "main", stars: 520, updatedAt: ago(60 * 24 * 1) },
  { id: "6", fullName: "acme/infra", description: "Terraform modules", language: "HCL", defaultBranch: "main", private: true, updatedAt: ago(60 * 24 * 14) },
];

export async function searchRepos(query: string): Promise<PickerRepo[]> {
  await wait(350);
  const q = query.trim().toLowerCase();
  return q ? REPOS.filter((r) => r.fullName.toLowerCase().includes(q) || (r.description ?? "").toLowerCase().includes(q)) : REPOS;
}

export async function loadBranches(repo: PickerRepo): Promise<PickerBranch[]> {
  await wait(300);
  const d = repo.defaultBranch ?? "main";
  return [
    { name: d, default: true, protected: true },
    { name: "develop" },
    { name: "release/4.12", protected: true },
    { name: "feature/checkout-v2" },
    { name: "fix/cart-totals" },
  ].filter((b, i, all) => all.findIndex((x) => x.name === b.name) === i);
}

/* ------------------------------------------------------------------ API reference */

export function apiTools(ar: boolean): ApiTool[] {
  const issues = ar ? "المشكلات" : "Issues";
  const projects = ar ? "المشاريع" : "Projects";
  const time = ar ? "الوقت" : "Time";
  const member = ar ? "عضو" : "Member";
  const admin = ar ? "مسؤول" : "Admin";
  const viewer = ar ? "مشاهد" : "Viewer";
  return [
    {
      id: "list_issues",
      name: "list_issues",
      summary: ar ? "اعرض مشكلات مشروع مع تصفية بالحالة." : "List a project's issues, filtered by status.",
      description: ar ? "يعيد المشكلات مرتبة بالأحدث. يدعم الترقيم بمؤشر." : "Returns issues newest first. Supports cursor pagination.",
      category: issues,
      scope: "issues:read",
      minRole: viewer,
      access: "read",
      returns: ar ? "مصفوفة من المشكلات ومؤشر الصفحة التالية." : "An array of issues and the next page cursor.",
      args: [
        { name: "project", type: "string", required: true, description: ar ? "مفتاح المشروع." : "The project key." },
        { name: "status", type: "string", values: ["open", "in_progress", "done"], default: "open", description: ar ? "تصفية بالحالة." : "Filter by status." },
        { name: "limit", type: "integer", default: "25", description: ar ? "حتى 100." : "Up to 100." },
        { name: "cursor", type: "string", description: ar ? "من الاستجابة السابقة." : "From the previous response." },
      ],
      examples: [
        {
          title: ar ? "الأحدث المفتوحة" : "Newest open",
          call: '{\n  "tool": "list_issues",\n  "arguments": { "project": "MH", "status": "open", "limit": 2 }\n}',
          result: '{\n  "issues": [\n    { "id": "MH-921", "title": "API reference page", "status": "open" },\n    { "id": "MH-920", "title": "Repository picker", "status": "open" }\n  ],\n  "nextCursor": "c_8fj2"\n}',
        },
      ],
    },
    {
      id: "create_issue",
      name: "create_issue",
      summary: ar ? "أنشئ مشكلة جديدة في مشروع." : "Create a new issue in a project.",
      category: issues,
      scope: "issues:write",
      minRole: member,
      access: "write",
      returns: ar ? "المشكلة المنشأة." : "The created issue.",
      args: [
        { name: "project", type: "string", required: true },
        { name: "title", type: "string", required: true, description: ar ? "عنوان قصير." : "A short title." },
        { name: "description", type: "string" },
        { name: "labels", type: "string[]" },
        { name: "priority", type: "string", values: ["low", "medium", "high"], default: "medium" },
      ],
      examples: [{ call: '{\n  "tool": "create_issue",\n  "arguments": { "project": "MH", "title": "Fix login redirect", "priority": "high" }\n}', result: '{ "id": "MH-930", "status": "open" }' }],
    },
    {
      id: "delete_issue",
      name: "delete_issue",
      summary: ar ? "احذف مشكلة نهائيًا." : "Permanently delete an issue.",
      category: issues,
      scope: "issues:delete",
      minRole: admin,
      access: "destructive",
      args: [{ name: "id", type: "string", required: true, description: ar ? "معرّف المشكلة." : "The issue id." }],
      examples: [{ call: '{ "tool": "delete_issue", "arguments": { "id": "MH-930" } }', result: '{ "deleted": true }' }],
    },
    {
      id: "list_projects",
      name: "list_projects",
      summary: ar ? "اعرض المشاريع التي تصل إليها." : "List the projects you can access.",
      category: projects,
      scope: "projects:read",
      minRole: viewer,
      access: "read",
      args: [],
      examples: [{ call: '{ "tool": "list_projects", "arguments": {} }', result: '{ "projects": [{ "key": "MH", "name": "Mahaam" }] }' }],
    },
    {
      id: "start_timer",
      name: "start_timer",
      summary: ar ? "ابدأ مؤقتًا على مشكلة." : "Start a timer on an issue.",
      category: time,
      scope: "time:write",
      minRole: member,
      access: "write",
      since: "2.1",
      args: [
        { name: "issue", type: "string", required: true },
        { name: "note", type: "string" },
      ],
      examples: [{ call: '{ "tool": "start_timer", "arguments": { "issue": "MH-921" } }', result: '{ "running": true, "startedAt": "2026-09-30T09:00:00Z" }' }],
    },
    {
      id: "export_time",
      name: "export_time",
      summary: ar ? "صدّر تقرير الوقت." : "Export a time report.",
      category: time,
      scope: "time:read",
      minRole: member,
      access: "read",
      deprecated: true,
      args: [{ name: "range", type: "string", required: true, values: ["week", "month"] }],
      examples: [{ call: '{ "tool": "export_time", "arguments": { "range": "week" } }', result: '{ "url": "https://example.com/report.csv" }' }],
    },
  ];
}
