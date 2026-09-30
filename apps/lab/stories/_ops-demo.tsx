/* Shared fixtures and stateful demos for the ops and status stories: GitHub activity, DNS, backups, the
   realtime connection and alerts. Everything is fake: names, IPs (documentation ranges), SHAs, no real hosts. */
import {
  AlertList,
  type AlertItem,
  BackupManager,
  type BackupRecord,
  type BackupRetention,
  type BackupSchedule,
  DnsManagement,
  type DnsRecord,
  type DnsRecordInput,
  type GithubActor,
  GithubActivity,
  type GithubCommit,
  type GithubDeployment,
  type GithubPull,
  type GithubRun,
  SecurityAlerts,
  type SecurityAlertItem,
  useNasaq,
  type WsState,
} from "@nasaq/web";
import { useCallback, useEffect, useRef, useState } from "react";

export const useAr = () => useNasaq().locale.startsWith("ar");
export const wait = (ms = 600) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;
const ago = (ms: number) => Date.now() - ms;

// ---------------------------------------------------------------------------------------------
// GitHub
// ---------------------------------------------------------------------------------------------

const REPO_URL = "https://github.com/nasaq-demo/storefront";

const people = (ar: boolean): Record<"sara" | "omar" | "lina" | "bot", GithubActor> => ({
  sara: { login: ar ? "سارة" : "sara", href: "https://github.com/nasaq-demo" },
  omar: { login: ar ? "عمر" : "omar", href: "https://github.com/nasaq-demo" },
  lina: { login: ar ? "لينا" : "lina", href: "https://github.com/nasaq-demo" },
  bot: { login: "dependabot[bot]", href: "https://github.com/nasaq-demo" },
});

export const demoRepo = { owner: "nasaq-demo", name: "storefront", href: REPO_URL };

export function sampleCommits(ar: boolean): GithubCommit[] {
  const p = people(ar);
  const c = (id: string, message: string, author: GithubActor, age: number, branch: string, checks?: GithubCommit["checks"]): GithubCommit => ({
    id,
    message,
    author,
    date: ago(age),
    branch,
    href: `${REPO_URL}/commit/${id}`,
    ...(checks ? { checks } : {}),
  });
  return ar
    ? [
        c("4f2a91c0d3e5b7a9", "إصلاح: إعادة المحاولة عند خطأ 502 من بوابة الدفع\n\nتم رفع عدد المحاولات إلى 3 مع تأخير متزايد.", p.sara, 12 * MIN, "main", "success"),
        c("9b1e7d2c4a6f8e03", "ميزة: إضافة فلتر الحالة إلى قائمة الطلبات", p.omar, 2 * HOUR, "main", "success"),
        c("c3d8a5f1e9b24760", "تحسين: تقليل حجم حزمة صفحة الدفع", p.lina, 5 * HOUR, "feat/checkout-bundle", "pending"),
        c("e7f4b0a2d6c81935", "بناء: تحديث الاعتمادات", p.bot, 9 * HOUR, "main", "failure"),
        c("1a6c9e3f5b7d2084", "توثيق: شرح متغيرات البيئة", p.sara, DAY + 3 * HOUR, "main", "success"),
      ]
    : [
        c("4f2a91c0d3e5b7a9", "fix: retry on 502 from the payment gateway\n\nRaised attempts to 3 with a growing delay.", p.sara, 12 * MIN, "main", "success"),
        c("9b1e7d2c4a6f8e03", "feat: add a status filter to the orders list", p.omar, 2 * HOUR, "main", "success"),
        c("c3d8a5f1e9b24760", "perf: shrink the checkout page bundle", p.lina, 5 * HOUR, "feat/checkout-bundle", "pending"),
        c("e7f4b0a2d6c81935", "build: bump dependencies", p.bot, 9 * HOUR, "main", "failure"),
        c("1a6c9e3f5b7d2084", "docs: explain the environment variables", p.sara, DAY + 3 * HOUR, "main", "success"),
      ];
}

export function samplePulls(ar: boolean): GithubPull[] {
  const p = people(ar);
  const base = { href: REPO_URL } as const;
  return [
    {
      id: "p1",
      number: 412,
      title: ar ? "تحسين حزمة صفحة الدفع" : "Shrink the checkout page bundle",
      author: p.lina,
      state: "open",
      createdAt: ago(5 * HOUR),
      head: "feat/checkout-bundle",
      base: "main",
      labels: [{ name: "performance", hue: "blue" }],
      checks: "pending",
      comments: 3,
      ...base,
    },
    {
      id: "p2",
      number: 411,
      title: ar ? "إضافة فلتر الحالة إلى الطلبات" : "Add a status filter to orders",
      author: p.omar,
      state: "merged",
      createdAt: ago(DAY),
      mergedAt: ago(2 * HOUR),
      mergedBy: p.sara,
      head: "feat/orders-filter",
      base: "main",
      labels: [{ name: "feature", hue: "green" }],
      checks: "success",
      comments: 7,
      ...base,
    },
    {
      id: "p3",
      number: 409,
      title: ar ? "مسودة: نظام الإشعارات الجديد" : "Draft: the new notifications system",
      author: p.sara,
      state: "draft",
      createdAt: ago(2 * DAY),
      head: "feat/notifications",
      base: "main",
      labels: [{ name: "wip", hue: "amber" }],
      comments: 0,
      ...base,
    },
    {
      id: "p4",
      number: 408,
      title: ar ? "تحديث الاعتمادات" : "Bump dependencies",
      author: p.bot,
      state: "closed",
      createdAt: ago(3 * DAY),
      head: "dependabot/npm",
      base: "main",
      checks: "failure",
      comments: 1,
      ...base,
    },
  ];
}

export function sampleRuns(ar: boolean): GithubRun[] {
  const p = people(ar);
  const r = (id: string, name: string, status: GithubRun["status"], age: number, branch: string, dur: number | undefined, actor: GithubActor, event = "push"): GithubRun => ({
    id,
    name,
    status,
    branch,
    event,
    actor,
    startedAt: ago(age),
    ...(dur !== undefined ? { durationMs: dur } : {}),
    sha: "4f2a91c",
    href: `${REPO_URL}/actions`,
  });
  return [
    r("r1", ar ? "الاختبارات" : "Tests", "in_progress", 3 * MIN, "main", undefined, p.sara),
    r("r2", ar ? "البناء والنشر" : "Build and deploy", "success", 40 * MIN, "main", 4 * MIN + 12_000, p.sara),
    r("r3", ar ? "الاختبارات" : "Tests", "failure", 2 * HOUR, "feat/checkout-bundle", 6 * MIN + 30_000, p.lina, "pull_request"),
    r("r4", ar ? "فحص الأنماط" : "Lint", "success", 5 * HOUR, "main", 55_000, p.omar),
    r("r5", ar ? "الاختبارات الليلية" : "Nightly tests", "cancelled", 9 * HOUR, "main", 90_000, p.bot, "schedule"),
  ];
}

export function sampleDeployments(ar: boolean): GithubDeployment[] {
  const p = people(ar);
  return [
    { id: "d1", environment: ar ? "الإنتاج" : "Production", status: "success", ref: "main", sha: "4f2a91c", creator: p.sara, createdAt: ago(35 * MIN), url: "https://shop.example.com", href: `${REPO_URL}/deployments` },
    { id: "d2", environment: ar ? "المعاينة" : "Preview", status: "in_progress", ref: "feat/checkout-bundle", sha: "c3d8a5f", creator: p.lina, createdAt: ago(4 * MIN), href: `${REPO_URL}/deployments` },
    { id: "d3", environment: ar ? "الإنتاج" : "Production", status: "failure", ref: "main", sha: "e7f4b0a", creator: p.bot, createdAt: ago(9 * HOUR), href: `${REPO_URL}/deployments` },
  ];
}

export function GithubActivityDemo({ only }: { only?: "commits" | "pulls" | "runs" | "deployments" } = {}) {
  const ar = useAr();
  const [tick, setTick] = useState(0);
  const commits = sampleCommits(ar);
  const pulls = samplePulls(ar);
  const runs = sampleRuns(ar);
  const deployments = sampleDeployments(ar);
  return (
    <GithubActivity
      key={tick}
      repo={demoRepo}
      {...(!only || only === "commits" ? { commits } : {})}
      {...(!only || only === "pulls" ? { pulls } : {})}
      {...(!only || only === "runs" ? { runs } : {})}
      {...(!only || only === "deployments" ? { deployments } : {})}
      onRefresh={async () => {
        await wait(700);
        setTick((n) => n + 1);
      }}
      onDeploy={async () => {
        await wait(900);
      }}
      onRerun={async () => {
        await wait(800);
      }}
    />
  );
}

// ---------------------------------------------------------------------------------------------
// DNS
// ---------------------------------------------------------------------------------------------

export const DNS_ZONE = "nasaq-demo.com";

export function sampleDns(ar: boolean): DnsRecord[] {
  return [
    { id: "1", type: "A", name: "@", content: "203.0.113.10", ttl: 1, proxied: true },
    { id: "2", type: "A", name: "api", content: "203.0.113.24", ttl: 300, proxied: true, comment: ar ? "خادم الواجهة" : "API server" },
    { id: "3", type: "AAAA", name: "@", content: "2001:db8::10", ttl: 1, proxied: true },
    { id: "4", type: "CNAME", name: "www", content: DNS_ZONE, ttl: 1, proxied: true },
    { id: "5", type: "CNAME", name: "docs", content: "nasaq-demo.github.io", ttl: 3600, proxied: false, comment: ar ? "صفحات التوثيق" : "Docs pages" },
    { id: "6", type: "MX", name: "@", content: "mail1.example.net", ttl: 3600, priority: 10 },
    { id: "7", type: "MX", name: "@", content: "mail2.example.net", ttl: 3600, priority: 20 },
    { id: "8", type: "TXT", name: "@", content: "v=spf1 include:_spf.example.net ~all", ttl: 3600 },
    { id: "9", type: "TXT", name: "_dmarc", content: "v=DMARC1; p=quarantine; rua=mailto:dmarc@nasaq-demo.com", ttl: 3600 },
    { id: "10", type: "NS", name: "lab", content: "ns1.example.net", ttl: 86400 },
    { id: "11", type: "CAA", name: "@", content: '0 issue "letsencrypt.org"', ttl: 86400 },
    { id: "12", type: "SRV", name: "_sip._tcp", content: "10 5060 sip.example.net", ttl: 3600, priority: 10 },
  ];
}

export function useDnsRecords(ar: boolean) {
  const [records, setRecords] = useState<DnsRecord[]>(() => sampleDns(ar));
  useEffect(() => setRecords(sampleDns(ar)), [ar]);
  const save = useCallback(async (input: DnsRecordInput) => {
    await wait(700);
    if (input.content.includes("blocked.example")) return { error: "The provider rejected this value." };
    setRecords((list) => {
      const next: DnsRecord = {
        id: input.id ?? String(Date.now()),
        type: input.type,
        name: input.name,
        content: input.content,
        ttl: input.ttl,
        proxied: input.proxied,
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.comment ? { comment: input.comment } : {}),
      };
      return input.id ? list.map((r) => (r.id === input.id ? next : r)) : [next, ...list];
    });
  }, []);
  const remove = useCallback(async (id: string) => {
    await wait(600);
    setRecords((list) => list.filter((r) => r.id !== id));
  }, []);
  const toggle = useCallback(async (id: string, proxied: boolean) => {
    await wait(500);
    setRecords((list) => list.map((r) => (r.id === id ? { ...r, proxied } : r)));
  }, []);
  return { records, save, remove, toggle };
}

export function DnsDemo({ loading = false }: { loading?: boolean }) {
  const ar = useAr();
  const { records, save, remove, toggle } = useDnsRecords(ar);
  return <DnsManagement zone={DNS_ZONE} records={records} loading={loading} onSave={save} onDelete={remove} onToggleProxy={toggle} />;
}

// ---------------------------------------------------------------------------------------------
// Backups
// ---------------------------------------------------------------------------------------------

export function sampleBackups(ar: boolean): BackupRecord[] {
  const MB = 1024 * 1024;
  return [
    { id: "b1", kind: "scheduled", status: "completed", createdAt: ago(9 * HOUR), sizeBytes: 812 * MB },
    { id: "b2", kind: "manual", status: "completed", createdAt: ago(DAY + 4 * HOUR), sizeBytes: 806 * MB, name: ar ? "قبل إطلاق الإصدار 2.4" : "Before the 2.4 release", locked: true },
    { id: "b3", kind: "scheduled", status: "failed", createdAt: ago(2 * DAY + 9 * HOUR), error: ar ? "انتهت مهلة الاتصال بقاعدة البيانات." : "The database connection timed out." },
    { id: "b4", kind: "scheduled", status: "completed", createdAt: ago(3 * DAY + 9 * HOUR), sizeBytes: 798 * MB },
    { id: "b5", kind: "pre-restore", status: "completed", createdAt: ago(5 * DAY), sizeBytes: 790 * MB },
    { id: "b6", kind: "scheduled", status: "completed", createdAt: ago(9 * DAY), sizeBytes: 771 * MB },
    { id: "b7", kind: "scheduled", status: "completed", createdAt: ago(21 * DAY), sizeBytes: 742 * MB },
  ];
}

export function useBackups(ar: boolean) {
  const [backups, setBackups] = useState<BackupRecord[]>(() => sampleBackups(ar));
  const [schedule, setSchedule] = useState<BackupSchedule>({ enabled: true, frequency: "daily", time: "02:30" });
  const [retention, setRetention] = useState<BackupRetention>({ keepLast: 7, maxAgeDays: 30 });
  const timers = useRef<ReturnType<typeof setInterval>[]>([]);
  useEffect(() => setBackups(sampleBackups(ar)), [ar]);
  useEffect(() => () => timers.current.forEach(clearInterval), []);

  /** Drives `progress` from 0 to 100, then flips the record to completed. */
  const progressTo = useCallback((id: string, finish: (b: BackupRecord) => BackupRecord) => {
    let value = 0;
    const timer = setInterval(() => {
      value = Math.min(100, value + 8 + Math.round(Math.random() * 10));
      setBackups((list) => list.map((b) => (b.id === id ? (value >= 100 ? finish(b) : { ...b, progress: value }) : b)));
      if (value >= 100) clearInterval(timer);
    }, 600);
    timers.current.push(timer);
  }, []);

  const runNow = useCallback(async () => {
    await wait(400);
    const id = `run-${Date.now()}`;
    setBackups((list) => [{ id, kind: "manual", status: "running", createdAt: Date.now(), progress: 0 }, ...list]);
    progressTo(id, (b) => {
      const { progress: _progress, ...rest } = b;
      return { ...rest, status: "completed", sizeBytes: 815 * 1024 * 1024 };
    });
  }, [progressTo]);

  const restore = useCallback(
    async (id: string) => {
      await wait(500);
      setBackups((list) => list.map((b) => (b.id === id ? { ...b, status: "restoring", progress: 0 } : b)));
      progressTo(id, (b) => {
        const { progress: _progress, ...rest } = b;
        return { ...rest, status: "completed" };
      });
    },
    [progressTo],
  );

  const save = useCallback(async (next: { schedule: BackupSchedule; retention: BackupRetention }) => {
    await wait(700);
    setSchedule(next.schedule);
    setRetention(next.retention);
  }, []);

  const remove = useCallback(async (id: string) => {
    await wait(500);
    setBackups((list) => list.filter((b) => b.id !== id));
  }, []);

  const download = useCallback(async () => {
    await wait(600);
  }, []);

  return { backups, schedule, retention, runNow, restore, save, remove, download };
}

export function BackupDemo({ loading = false }: { loading?: boolean }) {
  const ar = useAr();
  const b = useBackups(ar);
  return (
    <BackupManager
      backups={b.backups}
      schedule={b.schedule}
      retention={b.retention}
      loading={loading}
      onRunNow={b.runNow}
      onRestore={b.restore}
      onSaveSchedule={b.save}
      onDelete={b.remove}
      onDownload={b.download}
    />
  );
}

// ---------------------------------------------------------------------------------------------
// Realtime connection
// ---------------------------------------------------------------------------------------------

/** A tiny state machine: connected (with a wobbling latency) -> drop -> reconnecting with a countdown -> connected. */
export function useFakeSocket({ autoDrop = false }: { autoDrop?: boolean } = {}) {
  const [state, setState] = useState<WsState>("connecting");
  const [latencyMs, setLatency] = useState(48);
  const [retryAt, setRetryAt] = useState<number | undefined>();
  const [attempt, setAttempt] = useState(0);
  const [lastConnectedAt, setLast] = useState<number | undefined>();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const attemptRef = useRef(0);

  const connect = useCallback(() => {
    clearTimeout(timer.current);
    setRetryAt(undefined);
    setState("connecting");
    timer.current = setTimeout(() => {
      attemptRef.current = 0;
      setAttempt(0);
      setState("connected");
    }, 1200);
  }, []);

  const drop = useCallback(() => {
    clearTimeout(timer.current);
    setLast(Date.now());
    attemptRef.current += 1;
    setAttempt(attemptRef.current);
    const delay = Math.min(30, 2 ** attemptRef.current) * 1000;
    setRetryAt(Date.now() + delay);
    setState("reconnecting");
    timer.current = setTimeout(connect, delay);
  }, [connect]);

  const goOffline = useCallback(() => {
    clearTimeout(timer.current);
    setLast(Date.now());
    setRetryAt(undefined);
    setState("offline");
  }, []);

  useEffect(() => {
    connect();
    return () => clearTimeout(timer.current);
  }, [connect]);

  useEffect(() => {
    if (state !== "connected") return;
    const id = setInterval(() => setLatency(Math.round(30 + Math.random() * 90)), 2000);
    return () => clearInterval(id);
  }, [state]);

  useEffect(() => {
    if (!autoDrop || state !== "connected") return;
    const id = setTimeout(drop, 20_000);
    return () => clearTimeout(id);
  }, [autoDrop, state, drop]);

  return { state, latencyMs, retryAt, attempt, lastConnectedAt, connect, drop, goOffline, setLatency };
}

// ---------------------------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------------------------

export function sampleAlerts(ar: boolean): AlertItem[] {
  const ev = (id: string, type: NonNullable<AlertItem["timeline"]>[number]["type"], age: number, actor?: string, note?: string) => ({
    id,
    type,
    at: ago(age),
    ...(actor ? { actor } : {}),
    ...(note ? { note } : {}),
  });
  return [
    {
      id: "AL-1042",
      title: ar ? "ارتفاع معدل أخطاء واجهة الدفع إلى 8%" : "Payments API error rate is 8%",
      description: ar ? "ارتفعت أخطاء 5xx في خدمة الدفع خلال آخر 10 دقائق مقارنة بالمعتاد (0.4%)." : "5xx errors in the payments service rose over the last 10 minutes, against a usual 0.4%.",
      severity: "critical",
      status: "open",
      source: "payments-api",
      createdAt: ago(14 * MIN),
      count: 6,
      tags: ["prod", "payments"],
      timeline: [ev("e1", "created", 14 * MIN), ev("e2", "notified", 13 * MIN, undefined, ar ? "فريق المناوبة" : "On-call team"), ev("e3", "escalated", 6 * MIN, ar ? "سارة" : "Sara")],
    },
    {
      id: "AL-1041",
      title: ar ? "استخدام القرص في db-2 بلغ 91%" : "Disk usage on db-2 is 91%",
      description: ar ? "المساحة المتبقية تكفي لنحو 6 ساعات بمعدل النمو الحالي." : "About 6 hours of space left at the current growth.",
      severity: "high",
      status: "acknowledged",
      source: "db-2",
      createdAt: ago(2 * HOUR),
      tags: ["prod"],
      timeline: [ev("e1", "created", 2 * HOUR), ev("e2", "acknowledged", HOUR + 40 * MIN, ar ? "عمر" : "Omar", ar ? "سأوسّع الحجم بعد الظهر." : "Will grow the volume this afternoon.")],
    },
    {
      id: "AL-1040",
      title: ar ? "بطء استعلامات لوحة المتابعة" : "Dashboard queries are slow",
      severity: "medium",
      status: "open",
      source: "analytics",
      createdAt: ago(5 * HOUR),
      count: 3,
      timeline: [ev("e1", "created", 5 * HOUR)],
    },
    {
      id: "AL-1039",
      title: ar ? "شهادة TLS لنطاق shop تنتهي بعد 12 يومًا" : "The TLS certificate for shop expires in 12 days",
      severity: "low",
      status: "open",
      source: "certificates",
      createdAt: ago(DAY),
      timeline: [ev("e1", "created", DAY)],
    },
    {
      id: "AL-1038",
      title: ar ? "فشل مهمة النسخ الاحتياطي الليلية" : "The nightly backup job failed",
      description: ar ? "انتهت مهلة الاتصال بقاعدة البيانات. أُعيد التشغيل بنجاح." : "The database connection timed out. A retry succeeded.",
      severity: "high",
      status: "resolved",
      source: "backups",
      createdAt: ago(2 * DAY),
      timeline: [ev("e1", "created", 2 * DAY), ev("e2", "acknowledged", 2 * DAY - 10 * MIN, ar ? "لينا" : "Lina"), ev("e3", "resolved", 2 * DAY - HOUR, ar ? "لينا" : "Lina", ar ? "نجحت إعادة المحاولة." : "The retry succeeded.")],
    },
    {
      id: "AL-1037",
      title: ar ? "نشر جديد على الإنتاج" : "New deployment to production",
      severity: "info",
      status: "resolved",
      source: "deploys",
      createdAt: ago(3 * DAY),
      timeline: [ev("e1", "created", 3 * DAY)],
    },
  ];
}

export function sampleSecurityAlerts(ar: boolean): SecurityAlertItem[] {
  const ev = (id: string, type: NonNullable<AlertItem["timeline"]>[number]["type"], age: number, actor?: string, note?: string) => ({
    id,
    type,
    at: ago(age),
    ...(actor ? { actor } : {}),
    ...(note ? { note } : {}),
  });
  return [
    {
      id: "SEC-311",
      title: ar ? "محاولات دخول فاشلة متكررة" : "Repeated failed sign-in attempts",
      description: ar ? "42 محاولة دخول فاشلة على حساب المدير خلال 5 دقائق من عنوان واحد." : "42 failed sign-ins on the admin account within 5 minutes from one address.",
      severity: "critical",
      status: "open",
      source: "auth",
      category: "auth",
      ip: "198.51.100.23",
      location: ar ? "فرانكفورت، ألمانيا" : "Frankfurt, Germany",
      account: "admin@nasaq-demo.com",
      recommendation: ar ? "احظر العنوان وفعّل التحقق بخطوتين للحساب." : "Block the address and require two-factor sign-in for the account.",
      createdAt: ago(9 * MIN),
      count: 42,
      tags: ["brute-force"],
      timeline: [ev("e1", "created", 9 * MIN), ev("e2", "notified", 8 * MIN, undefined, ar ? "فريق الأمان" : "Security team")],
    },
    {
      id: "SEC-310",
      title: ar ? "تسجيل دخول من دولة جديدة" : "Sign-in from a new country",
      severity: "medium",
      status: "acknowledged",
      source: "auth",
      category: "auth",
      ip: "203.0.113.77",
      location: ar ? "ساو باولو، البرازيل" : "Sao Paulo, Brazil",
      account: "lina@nasaq-demo.com",
      recommendation: ar ? "تواصل مع المستخدمة للتأكد أن الدخول منها." : "Ask the user to confirm this sign-in.",
      createdAt: ago(3 * HOUR),
      timeline: [ev("e1", "created", 3 * HOUR), ev("e2", "acknowledged", 2 * HOUR, ar ? "سارة" : "Sara")],
    },
    {
      id: "SEC-309",
      title: ar ? "مسح منافذ على الخادم العام" : "Port scan on the public server",
      severity: "high",
      status: "open",
      source: "firewall",
      category: "network",
      ip: "192.0.2.150",
      location: ar ? "موسكو، روسيا" : "Moscow, Russia",
      recommendation: ar ? "احظر النطاق وراجع قواعد الجدار الناري." : "Block the range and review the firewall rules.",
      createdAt: ago(7 * HOUR),
      count: 210,
      timeline: [ev("e1", "created", 7 * HOUR)],
    },
    {
      id: "SEC-308",
      title: ar ? "تصدير كبير لبيانات العملاء" : "Large export of customer data",
      severity: "high",
      status: "resolved",
      source: "audit",
      category: "data",
      account: "omar@nasaq-demo.com",
      location: ar ? "الرياض، السعودية" : "Riyadh, Saudi Arabia",
      createdAt: ago(2 * DAY),
      timeline: [ev("e1", "created", 2 * DAY), ev("e2", "comment", 2 * DAY - HOUR, ar ? "سارة" : "Sara", ar ? "تصدير مصرّح به لتقرير الربع." : "Authorised export for the quarterly report."), ev("e3", "resolved", 2 * DAY - 90 * MIN, ar ? "سارة" : "Sara")],
    },
  ];
}

function useAlertState<T extends AlertItem>(initial: (ar: boolean) => T[], ar: boolean) {
  const [alerts, setAlerts] = useState<T[]>(() => initial(ar));
  useEffect(() => setAlerts(initial(ar)), [ar, initial]);
  const set = useCallback(async (id: string, status: AlertItem["status"], type: "acknowledged" | "resolved" | "reopened") => {
    await wait(600);
    setAlerts((list) =>
      list.map((a) =>
        a.id === id ? { ...a, status, updatedAt: Date.now(), timeline: [...(a.timeline ?? []), { id: `${type}-${Date.now()}`, type, at: Date.now(), actor: "Sara" }] } : a,
      ),
    );
  }, []);
  return {
    alerts,
    onAcknowledge: (id: string) => set(id, "acknowledged", "acknowledged"),
    onResolve: (id: string) => set(id, "resolved", "resolved"),
    onReopen: (id: string) => set(id, "open", "reopened"),
  };
}

export function useAlerts(ar: boolean) {
  return useAlertState<AlertItem>(sampleAlerts, ar);
}

export function AlertsDemo({ loading = false, empty = false }: { loading?: boolean; empty?: boolean }) {
  const ar = useAr();
  const s = useAlerts(ar);
  return <AlertList alerts={empty ? [] : s.alerts} loading={loading} onAcknowledge={s.onAcknowledge} onResolve={s.onResolve} onReopen={s.onReopen} />;
}

export function SecurityAlertsDemo() {
  const ar = useAr();
  const s = useAlertState<SecurityAlertItem>(sampleSecurityAlerts, ar);
  return (
    <SecurityAlerts
      alerts={s.alerts}
      onAcknowledge={s.onAcknowledge}
      onResolve={s.onResolve}
      onReopen={s.onReopen}
      onAction={async () => {
        await wait(700);
      }}
    />
  );
}
