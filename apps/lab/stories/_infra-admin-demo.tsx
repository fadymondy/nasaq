/* Shared fixtures and stateful demos for the server admin panels, finops cost page, mail and SMTP settings and the
   webhooks manager. Everything is fake: names, documentation-range IPs and domains (example.com), placeholder keys. */
import {
  type CostItem,
  type CostServer,
  FinopsCost,
  type MailDomain,
  MailDomains,
  type SmtpConfig,
  SmtpSettings,
  type JobStatus,
  JobQueueMonitor,
  PackageUpdatesPanel,
  type PackageUpdate,
  type QueueJob,
  type ServiceAction,
  type ServiceUnit,
  ServiceUnitsList,
  type SshKeyRecord,
  SshKeyManager,
  type SshServer,
  type InboundSource,
  type PushEndpoint,
  type WebhookDelivery,
  type WebhookEndpoint,
  type WebhookEvent,
  WebhooksManager,
  useNasaq,
} from "@nasaq/web";
import { useState } from "react";

export const useAr = () => useNasaq().locale.startsWith("ar");
export const wait = (ms = 600) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const MIN = 60_000;
export const HOUR = 3_600_000;
export const DAY = 86_400_000;
export const ago = (ms: number) => Date.now() - ms;

/* ------------------------------------------------------------ services */

function sampleServices(ar: boolean): ServiceUnit[] {
  const d = (en: string, arText: string) => (ar ? arText : en);
  return [
    { id: "nginx", name: "nginx.service", description: d("Web server and reverse proxy", "خادم الويب والوكيل العكسي"), state: "active", enabled: true, memoryBytes: 84 * 1024 ** 2, since: ago(12 * DAY) },
    { id: "php-fpm", name: "php8.3-fpm.service", description: d("PHP FastCGI process manager", "مدير عمليات PHP"), state: "active", enabled: true, memoryBytes: 212 * 1024 ** 2, since: ago(12 * DAY) },
    { id: "postgres", name: "postgresql.service", description: d("PostgreSQL database", "قاعدة بيانات PostgreSQL"), state: "active", enabled: true, memoryBytes: 1.4 * 1024 ** 3, since: ago(41 * DAY) },
    { id: "redis", name: "redis-server.service", description: d("In-memory data store", "مخزن بيانات في الذاكرة"), state: "active", enabled: true, memoryBytes: 96 * 1024 ** 2, since: ago(41 * DAY) },
    { id: "queue", name: "queue-worker.service", description: d("Background job worker", "عامل المهام في الخلفية"), state: "failed", enabled: true, since: ago(38 * MIN) },
    { id: "docker", name: "docker.service", description: d("Container engine", "محرك الحاويات"), state: "active", enabled: true, memoryBytes: 310 * 1024 ** 2, since: ago(41 * DAY) },
    { id: "fail2ban", name: "fail2ban.service", description: d("Bans hosts that fail to sign in", "يحظر المضيفين الذين يفشلون في الدخول"), state: "active", enabled: true, memoryBytes: 38 * 1024 ** 2, since: ago(41 * DAY) },
    { id: "cron", name: "cron.service", description: d("Scheduled tasks", "المهام المجدولة"), state: "active", enabled: true, canReload: false, memoryBytes: 4 * 1024 ** 2, since: ago(41 * DAY) },
    { id: "certbot", name: "certbot.timer", description: d("Renews TLS certificates", "يجدد شهادات TLS"), state: "inactive", enabled: false },
    { id: "mailpit", name: "mailpit.service", description: d("Local mail catcher for testing", "التقاط البريد المحلي للاختبار"), state: "inactive", enabled: false },
    { id: "supervisor", name: "supervisor.service", description: d("Process supervisor", "مشرف العمليات"), state: "active", enabled: true, memoryBytes: 22 * 1024 ** 2, since: ago(9 * DAY) },
  ];
}

const nextState = (action: ServiceAction, s: ServiceUnit): ServiceUnit => {
  if (action === "start" || action === "restart") return { ...s, state: "active", since: Date.now(), memoryBytes: s.memoryBytes ?? 48 * 1024 ** 2 };
  if (action === "stop") return { ...s, state: "inactive", memoryBytes: undefined, since: Date.now() };
  if (action === "enable") return { ...s, enabled: true };
  if (action === "disable") return { ...s, enabled: false };
  return { ...s, since: Date.now() };
};

export function ServiceUnitsDemo({ loading = false }: { loading?: boolean }) {
  const ar = useAr();
  const [services, setServices] = useState(() => sampleServices(ar));
  return (
    <ServiceUnitsList
      services={services}
      loading={loading}
      onViewLogs={() => {}}
      onAction={async (id, action) => {
        await wait(900);
        if (id === "certbot" && action === "start") return { error: ar ? "تعذّر تشغيل certbot.timer: الوحدة مقنَّعة." : "Could not start certbot.timer: the unit is masked." };
        setServices((list) => list.map((s) => (s.id === id ? nextState(action, s) : s)));
      }}
    />
  );
}

/* ------------------------------------------------------------ package updates */

const UPDATES: PackageUpdate[] = [
  { name: "openssl", currentVersion: "3.0.13-0ubuntu3.4", newVersion: "3.0.13-0ubuntu3.5", kind: "security", sizeBytes: 1.2 * 1024 ** 2 },
  { name: "libssl3", currentVersion: "3.0.13-0ubuntu3.4", newVersion: "3.0.13-0ubuntu3.5", kind: "security", sizeBytes: 1.9 * 1024 ** 2 },
  { name: "linux-image-generic", currentVersion: "6.8.0-45.45", newVersion: "6.8.0-48.48", kind: "kernel", sizeBytes: 14.6 * 1024 ** 2 },
  { name: "nginx", currentVersion: "1.24.0-2ubuntu7", newVersion: "1.24.0-2ubuntu7.1", kind: "regular", sizeBytes: 540 * 1024 },
  { name: "postgresql-16", currentVersion: "16.3-1", newVersion: "16.4-1", kind: "regular", sizeBytes: 16.2 * 1024 ** 2 },
  { name: "curl", currentVersion: "8.5.0-2ubuntu10.3", newVersion: "8.5.0-2ubuntu10.4", kind: "security", sizeBytes: 231 * 1024 },
  { name: "git", currentVersion: "1:2.43.0-1ubuntu7", newVersion: "1:2.43.0-1ubuntu7.1", kind: "regular", sizeBytes: 3.8 * 1024 ** 2 },
  { name: "tzdata", currentVersion: "2024a-2ubuntu1", newVersion: "2024b-0ubuntu0.24.04.1", kind: "regular", sizeBytes: 274 * 1024 },
];

export function PackageUpdatesDemo({ loading = false }: { loading?: boolean }) {
  const [packages, setPackages] = useState(UPDATES);
  const [updating, setUpdating] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);
  const [checkedAt, setCheckedAt] = useState<number>(ago(3 * HOUR));
  const [reboot, setReboot] = useState(false);
  return (
    <PackageUpdatesPanel
      packages={packages}
      loading={loading}
      lastCheckedAt={checkedAt}
      rebootRequired={reboot}
      updating={updating}
      checking={checking}
      onCheck={async () => {
        setChecking(true);
        await wait(1400);
        setChecking(false);
        setCheckedAt(Date.now());
      }}
      onUpdate={async (names) => {
        setUpdating((u) => [...u, ...names]);
        await wait(500 + names.length * 400);
        setPackages((p) => p.filter((x) => !names.includes(x.name)));
        setUpdating((u) => u.filter((n) => !names.includes(n)));
        if (names.some((n) => n.startsWith("linux-image") || n === "libssl3")) setReboot(true);
      }}
      onReboot={async () => {
        await wait(1200);
        setReboot(false);
      }}
    />
  );
}

/* ------------------------------------------------------------ ssh keys */

export const SSH_SERVERS: SshServer[] = [
  { id: "web-1", name: "web-1" },
  { id: "web-2", name: "web-2" },
  { id: "db-1", name: "db-1" },
  { id: "worker-1", name: "worker-1" },
];

function sampleKeys(ar: boolean): SshKeyRecord[] {
  return [
    { id: "k1", name: ar ? "حاسوب فادي" : "Fady laptop", type: "ed25519", fingerprint: "SHA256:uNiVztksCsDhcc0u9e8BujQXVUpKZIDTMczCvj3tD2s", addedAt: ago(210 * DAY), lastUsedAt: ago(2 * HOUR), installedOn: ["web-1", "web-2", "db-1", "worker-1"] },
    { id: "k2", name: ar ? "خادم النشر (CI)" : "Deploy key (CI)", type: "ed25519", fingerprint: "SHA256:nThbg6kXUpJWGl7E1IGOCspRomTxdCARLviKw6E5SY8", addedAt: ago(96 * DAY), lastUsedAt: ago(35 * MIN), installedOn: ["web-1", "web-2", "worker-1"] },
    { id: "k3", name: ar ? "نسخ احتياطي" : "Backup agent", type: "rsa", fingerprint: "SHA256:3Vt4gSEcPfIYeHlxkUkzQpsZLkpe0ewHMN0hEsFK3rE", addedAt: ago(400 * DAY), lastUsedAt: ago(9 * HOUR), installedOn: ["db-1"] },
    { id: "k4", name: ar ? "مفتاح مقاول قديم" : "Old contractor key", type: "rsa", fingerprint: "SHA256:xQfKiHwJ2S0mGd5Ew5eXbT7cuTP9rZ1vUoR3aY6Nk8M", addedAt: ago(700 * DAY), lastUsedAt: null, installedOn: ["web-1"] },
  ];
}

export function SshKeysDemo({ loading = false }: { loading?: boolean }) {
  const ar = useAr();
  const [keys, setKeys] = useState(() => sampleKeys(ar));
  return (
    <SshKeyManager
      servers={SSH_SERVERS}
      keys={keys}
      loading={loading}
      onInstallChange={async (keyId, serverId, installed) => {
        await wait(600);
        setKeys((list) => list.map((k) => (k.id === keyId ? { ...k, installedOn: installed ? [...k.installedOn, serverId] : k.installedOn.filter((s) => s !== serverId) } : k)));
      }}
      onAdd={async ({ name, publicKey }) => {
        await wait(700);
        const type = publicKey.startsWith("ssh-rsa") ? "rsa" : "ed25519";
        setKeys((list) => [...list, { id: `k${Date.now()}`, name, type, fingerprint: "SHA256:Zk3pY0uJ7hQm1RcEwVt5Ns8LbGd2oXaIfHyT4rUeC9A", addedAt: Date.now(), lastUsedAt: null, installedOn: [] }]);
      }}
      onRemove={async (id) => {
        await wait(600);
        setKeys((list) => list.filter((k) => k.id !== id));
      }}
    />
  );
}

/* ------------------------------------------------------------ job queue */

const STACK = "Error: SMTP connection refused (127.0.0.1:1025)\n    at Mailer.send (app/Mail/Mailer.php:88)\n    at SendInvoiceEmail.handle (app/Jobs/SendInvoiceEmail.php:41)\n    at Queue.process (vendor/queue/Worker.php:213)";

const json = (value: unknown) => JSON.stringify(value, null, 2);

function sampleJobs(): QueueJob[] {
  return [
    { id: "job_9f2a01", name: "SendInvoiceEmail", queue: "mail", status: "failed", attempts: 3, maxAttempts: 3, at: ago(14 * MIN), error: STACK, payload: json({ invoiceId: "INV-2041", to: "billing@example.com" }) },
    { id: "job_9f2a02", name: "SendInvoiceEmail", queue: "mail", status: "failed", attempts: 3, maxAttempts: 3, at: ago(16 * MIN), error: STACK, payload: json({ invoiceId: "INV-2040", to: "ops@example.com" }) },
    { id: "job_9f2a03", name: "GenerateMonthlyReport", queue: "reports", status: "failed", attempts: 2, maxAttempts: 5, at: ago(50 * MIN), error: "Timeout: query exceeded 30s\n    at Report.build (app/Reports/Monthly.php:120)", payload: json({ month: "2026-08" }) },
    { id: "job_9f2a04", name: "ResizeImage", queue: "media", status: "active", attempts: 1, maxAttempts: 3, at: ago(20_000) },
    { id: "job_9f2a05", name: "ResizeImage", queue: "media", status: "waiting", attempts: 0, maxAttempts: 3, at: ago(8_000) },
    { id: "job_9f2a06", name: "ResizeImage", queue: "media", status: "waiting", attempts: 0, maxAttempts: 3, at: ago(6_000) },
    { id: "job_9f2a07", name: "SyncInventory", queue: "default", status: "delayed", attempts: 1, maxAttempts: 4, at: ago(2 * MIN) },
    { id: "job_9f2a08", name: "PruneExpiredSessions", queue: "default", status: "completed", attempts: 1, at: ago(30 * MIN) },
    { id: "job_9f2a09", name: "SendWelcomeEmail", queue: "mail", status: "completed", attempts: 1, at: ago(3 * HOUR) },
    { id: "job_9f2a10", name: "SendWelcomeEmail", queue: "mail", status: "completed", attempts: 1, at: ago(3 * HOUR + 10 * MIN) },
  ];
}

export function JobQueueDemo({ loading = false }: { loading?: boolean }) {
  const [jobs, setJobs] = useState(sampleJobs);
  return (
    <JobQueueMonitor
      jobs={jobs}
      loading={loading}
      onRetry={async (ids) => {
        await wait(800);
        setJobs((list) => list.map((j) => (ids.includes(j.id) ? { ...j, status: "waiting" as JobStatus, attempts: 0, error: undefined, at: Date.now() } : j)));
      }}
      onForget={async (ids) => {
        await wait(600);
        setJobs((list) => list.filter((j) => !ids.includes(j.id)));
      }}
    />
  );
}

/* ------------------------------------------------------------ finops cost */

function sampleCostServers(): CostServer[] {
  return [
    { id: "web-1", name: "web-1", plan: "4 vCPU / 8 GB", region: "fra1", monthlyPrice: 48, usage: { cpu: 62, memory: 71, disk: 44 }, smallerPlan: { name: "2 vCPU / 4 GB", monthlyPrice: 24 }, largerPlan: { name: "8 vCPU / 16 GB", monthlyPrice: 96 } },
    { id: "web-2", name: "web-2", plan: "4 vCPU / 8 GB", region: "fra1", monthlyPrice: 48, usage: { cpu: 12, memory: 19, disk: 31 }, smallerPlan: { name: "2 vCPU / 4 GB", monthlyPrice: 24 }, largerPlan: { name: "8 vCPU / 16 GB", monthlyPrice: 96 } },
    { id: "db-1", name: "db-1", plan: "8 vCPU / 32 GB", region: "fra1", monthlyPrice: 168, usage: { cpu: 88, memory: 91, disk: 78 }, smallerPlan: { name: "4 vCPU / 16 GB", monthlyPrice: 84 }, largerPlan: { name: "16 vCPU / 64 GB", monthlyPrice: 336 } },
    { id: "worker-1", name: "worker-1", plan: "2 vCPU / 4 GB", region: "ams3", monthlyPrice: 24, usage: { cpu: 41, memory: 52, disk: 22 } },
    { id: "staging", name: "staging", plan: "2 vCPU / 4 GB", region: "ams3", monthlyPrice: 24, usage: { cpu: 6, memory: 14, disk: 18 }, smallerPlan: { name: "1 vCPU / 2 GB", monthlyPrice: 12 } },
  ];
}

function sampleCostItems(ar: boolean): CostItem[] {
  return [
    { id: "i1", name: ar ? "تجديد النطاق example.com" : "example.com renewal", category: ar ? "النطاقات" : "Domains", amount: 15, period: "yearly" },
    { id: "i2", name: ar ? "نسخ احتياطي خارجي" : "Off-site backups", category: ar ? "النسخ الاحتياطي" : "Backups", amount: 19, period: "monthly" },
    { id: "i3", name: ar ? "ترخيص المراقبة" : "Monitoring licence", category: ar ? "التراخيص" : "Licences", amount: 348, period: "yearly" },
    { id: "i4", name: ar ? "إعداد لمرة واحدة" : "One-off setup", category: ar ? "الدعم" : "Support", amount: 200, period: "once" },
  ];
}

function sampleCostHistory() {
  const start = new Date();
  start.setDate(start.getDate() - 29);
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return { date: d.toISOString().slice(0, 10), cost: Number((10.4 + Math.sin(i / 4) * 0.6 + (i > 20 ? 0.9 : 0)).toFixed(2)) };
  });
}

export function FinopsCostDemo({ loading = false, empty = false }: { loading?: boolean; empty?: boolean }) {
  const ar = useAr();
  const [servers, setServers] = useState<CostServer[]>(() => (empty ? [] : sampleCostServers()));
  const [items, setItems] = useState<CostItem[]>(() => (empty ? [] : sampleCostItems(ar)));
  return (
    <FinopsCost
      servers={servers}
      items={items}
      loading={loading}
      currency="USD"
      previousTotal={318}
      budget={420}
      history={empty ? undefined : sampleCostHistory()}
      onAddItem={async (input) => {
        await wait(700);
        setItems((list) => [...list, { id: `i${Date.now()}`, ...input }]);
      }}
      onRemoveItem={async (id) => {
        await wait(600);
        setItems((list) => list.filter((i) => i.id !== id));
      }}
      onChangePlan={async (serverId, plan) => {
        await wait(800);
        setServers((list) => list.map((s) => (s.id === serverId ? { ...s, plan: plan.name, monthlyPrice: plan.monthlyPrice, smallerPlan: undefined, largerPlan: undefined, usage: { cpu: 45, memory: 50, disk: s.usage.disk } } : s)));
      }}
    />
  );
}

/* ------------------------------------------------------------ mail settings */

export function SmtpSettingsDemo({ failAuth = false }: { failAuth?: boolean }) {
  const [value, setValue] = useState<SmtpConfig>({ host: "smtp.example.com", port: 587, encryption: "starttls", username: "mailer@example.com", fromName: "Nasaq", fromAddress: "no-reply@example.com", passwordSet: true });
  return (
    <SmtpSettings
      value={value}
      defaultTestTo="admin@example.com"
      onSave={async (input) => {
        await wait(700);
        setValue({ host: input.host, port: input.port, encryption: input.encryption, username: input.username, fromName: input.fromName, fromAddress: input.fromAddress, passwordSet: value.passwordSet || Boolean(input.password) });
      }}
      onTest={async (input) => {
        await wait(1500);
        if (failAuth || input.host.includes("bad")) {
          return { ok: false, steps: [{ id: "connect", ok: true }, { id: "tls", ok: true }, { id: "auth", ok: false, message: "535 5.7.8 Authentication credentials invalid" }] };
        }
        return { ok: true, steps: [{ id: "connect", ok: true }, { id: "tls", ok: true }, { id: "auth", ok: true }, { id: "send", ok: true }] };
      }}
    />
  );
}

function sampleMailDomains(): MailDomain[] {
  return [
    {
      id: "d1",
      name: "example.com",
      checkedAt: ago(12 * MIN),
      checks: [
        { kind: "spf", status: "pass", name: "example.com", expected: "v=spf1 include:_spf.example.net -all", found: "v=spf1 include:_spf.example.net -all" },
        { kind: "dkim", status: "pass", name: "mail._domainkey.example.com", expected: "v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxample", found: "v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxample" },
        { kind: "dmarc", status: "pass", name: "_dmarc.example.com", expected: "v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com", found: "v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com" },
      ],
      mailboxes: [
        { id: "m1", local: "info", quotaMb: 2048, usedMb: 610 },
        { id: "m2", local: "support", quotaMb: 5120, usedMb: 4870 },
        { id: "m3", local: "billing", quotaMb: 1024, usedMb: 88 },
      ],
      aliases: [
        { id: "a1", source: "sales", destination: "info@example.com" },
        { id: "a2", source: "*", destination: "support@example.com" },
      ],
    },
    {
      id: "d2",
      name: "example.org",
      checkedAt: ago(3 * HOUR),
      checks: [
        { kind: "spf", status: "fail", name: "example.org", expected: "v=spf1 include:_spf.example.net -all", found: "v=spf1 +all" },
        { kind: "dkim", status: "missing", name: "mail._domainkey.example.org", expected: "v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAyample" },
        { kind: "dmarc", status: "pending", name: "_dmarc.example.org", expected: "v=DMARC1; p=none; rua=mailto:dmarc@example.org" },
      ],
      mailboxes: [{ id: "m4", local: "hello", quotaMb: 1024, usedMb: 12 }],
      aliases: [],
    },
  ];
}

export function MailDomainsDemo({ loading = false }: { loading?: boolean }) {
  const [domains, setDomains] = useState<MailDomain[]>(sampleMailDomains);
  const patch = (id: string, fn: (d: MailDomain) => MailDomain) => setDomains((list) => list.map((d) => (d.id === id ? fn(d) : d)));
  return (
    <MailDomains
      domains={domains}
      loading={loading}
      onRecheck={async (id) => {
        await wait(1400);
        patch(id, (d) => ({ ...d, checkedAt: Date.now() }));
      }}
      onAddMailbox={async (id, input) => {
        await wait(700);
        if (input.local === "admin") return { error: "That name is reserved." };
        patch(id, (d) => ({ ...d, mailboxes: [...d.mailboxes, { id: `m${Date.now()}`, local: input.local, quotaMb: input.quotaMb, usedMb: 0 }] }));
      }}
      onRemoveMailbox={async (id, mid) => {
        await wait(600);
        patch(id, (d) => ({ ...d, mailboxes: d.mailboxes.filter((m) => m.id !== mid) }));
      }}
      onAddAlias={async (id, input) => {
        await wait(600);
        patch(id, (d) => ({ ...d, aliases: [...d.aliases, { id: `a${Date.now()}`, ...input }] }));
      }}
      onRemoveAlias={async (id, aid) => {
        await wait(600);
        patch(id, (d) => ({ ...d, aliases: d.aliases.filter((a) => a.id !== aid) }));
      }}
    />
  );
}

/* ------------------------------------------------------------ webhooks */

const WEBHOOK_EVENTS = (ar: boolean): WebhookEvent[] => [
  { id: "order.created", label: ar ? "إنشاء طلب" : "Order created", group: ar ? "الطلبات" : "Orders" },
  { id: "order.paid", label: ar ? "دفع طلب" : "Order paid", group: ar ? "الطلبات" : "Orders" },
  { id: "order.refunded", label: ar ? "استرداد طلب" : "Order refunded", group: ar ? "الطلبات" : "Orders" },
  { id: "user.created", label: ar ? "إنشاء مستخدم" : "User created", group: ar ? "المستخدمون" : "Users" },
  { id: "user.deleted", label: ar ? "حذف مستخدم" : "User deleted", group: ar ? "المستخدمون" : "Users" },
  { id: "backup.completed", label: ar ? "اكتمال نسخة احتياطية" : "Backup completed", group: ar ? "الخادم" : "Server" },
  { id: "backup.failed", label: ar ? "فشل نسخة احتياطية" : "Backup failed", group: ar ? "الخادم" : "Server" },
];

const ORDER_PAYLOAD = json({ id: "evt_1042", type: "order.paid", data: { orderId: "ORD-5531", total: 129.0, currency: "USD" } });

function sampleEndpoints(ar: boolean): WebhookEndpoint[] {
  return [
    { id: "e1", name: ar ? "تحديثات الطلبات" : "Order updates", url: "https://hooks.example.com/nasaq/orders", channel: "Custom HTTP", events: ["order.created", "order.paid", "order.refunded"], enabled: true, secretLast4: "k3Fq", lastDeliveryAt: ago(4 * MIN), lastDeliveryStatus: "success" },
    { id: "e2", name: ar ? "تنبيهات الفريق" : "Team alerts", url: "https://chat.example.com/api/webhooks/T0001", channel: "Slack", events: ["backup.completed", "backup.failed"], enabled: true, secretLast4: "9aZ1", lastDeliveryAt: ago(2 * HOUR), lastDeliveryStatus: "failed" },
    { id: "e3", name: ar ? "مزامنة المستخدمين" : "User sync", url: "https://crm.example.com/inbound/users", channel: "Custom HTTP", events: ["user.created", "user.deleted"], enabled: false, secretLast4: "Tt07" },
  ];
}

function sampleDeliveries(): WebhookDelivery[] {
  return [
    { id: "dl1", endpointId: "e1", event: "order.paid", status: "success", code: 200, durationMs: 182, at: ago(4 * MIN), attempt: 1, request: ORDER_PAYLOAD, response: json({ received: true }) },
    { id: "dl2", endpointId: "e1", event: "order.created", status: "success", code: 204, durationMs: 96, at: ago(19 * MIN), attempt: 1, request: json({ id: "evt_1041", type: "order.created", data: { orderId: "ORD-5531" } }) },
    { id: "dl3", endpointId: "e2", event: "backup.failed", status: "failed", code: 500, durationMs: 1204, at: ago(2 * HOUR), attempt: 3, request: json({ id: "evt_1039", type: "backup.failed", data: { database: "app", reason: "disk full" } }), response: "Internal Server Error", error: "Receiver answered 500 after 3 attempts." },
    { id: "dl4", endpointId: "e2", event: "backup.completed", status: "failed", durationMs: 10000, at: ago(26 * HOUR), attempt: 2, request: json({ id: "evt_1020", type: "backup.completed" }), error: "Timed out after 10 seconds." },
    { id: "dl5", endpointId: "e1", event: "order.refunded", status: "pending", at: ago(20_000), attempt: 1, request: json({ id: "evt_1043", type: "order.refunded" }) },
    { id: "dl6", endpointId: "e3", event: "user.created", status: "success", code: 200, durationMs: 240, at: ago(3 * DAY), attempt: 1, request: json({ id: "evt_0990", type: "user.created", data: { userId: "u_88" } }), response: json({ ok: true }) },
  ];
}

function sampleSources(ar: boolean): InboundSource[] {
  return [
    { id: "s1", name: ar ? "الفوترة" : "Billing feed", target: "https://billing.example.com/events", intervalSeconds: 300, lastStatus: "ok", lastAt: ago(2 * MIN) },
    { id: "s2", name: ar ? "نظام التذاكر" : "Ticketing", target: "https://support.example.com/api/changes", intervalSeconds: 900, lastStatus: "error", lastAt: ago(14 * MIN), lastError: "HTTP 401 Unauthorized" },
    { id: "s3", name: ar ? "المستودع" : "Repository", target: "https://git.example.com/api/events", intervalSeconds: 60, lastStatus: "ok", lastAt: ago(20 * MIN) },
    { id: "s4", name: ar ? "مصدر جديد" : "New source", target: "https://new.example.com/feed", intervalSeconds: 3600 },
  ];
}

export function WebhooksDemo({ loading = false, empty = false, withPush = true }: { loading?: boolean; empty?: boolean; withPush?: boolean }) {
  const ar = useAr();
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>(() => (empty ? [] : sampleEndpoints(ar)));
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>(() => (empty ? [] : sampleDeliveries()));
  const [sources, setSources] = useState<InboundSource[]>(() => (empty ? [] : sampleSources(ar)));
  const [push, setPush] = useState<PushEndpoint | null>(withPush ? { url: "https://hooks.nasaq.example.com/in/p_7Hk29xQ", token: "pt_live_4f8c1e9b7a2d40c6b53e" } : null);
  return (
    <WebhooksManager
      loading={loading}
      events={WEBHOOK_EVENTS(ar)}
      endpoints={endpoints}
      deliveries={deliveries}
      sources={sources}
      pushEndpoint={push}
      onDismissPush={() => setPush(null)}
      onSaveEndpoint={async (input) => {
        await wait(800);
        if (input.name.toLowerCase() === "taken") return { error: ar ? "الاسم مستخدم بالفعل." : "That name is already used." };
        if (input.id) {
          setEndpoints((list) => list.map((e) => (e.id === input.id ? { ...e, name: input.name, url: input.url, channel: input.channel, events: input.events } : e)));
          return undefined;
        }
        setEndpoints((list) => [...list, { id: `e${Date.now()}`, name: input.name, url: input.url, channel: input.channel, events: input.events, enabled: true, secretLast4: "Xy12" }]);
        return { secret: "whsec_8d1f0c6a5b3e49f2a7c04e1b9d5f3a62Xy12" };
      }}
      onDeleteEndpoint={async (id) => {
        await wait(600);
        setEndpoints((list) => list.filter((e) => e.id !== id));
      }}
      onToggleEndpoint={async (id, enabled) => {
        await wait(400);
        setEndpoints((list) => list.map((e) => (e.id === id ? { ...e, enabled } : e)));
      }}
      onRotateSecret={async (id) => {
        await wait(800);
        setEndpoints((list) => list.map((e) => (e.id === id ? { ...e, secretLast4: "Rt55" } : e)));
        return { secret: "whsec_2b7e91d3c0a84f5e96b1d7a34c8f0e5aRt55" };
      }}
      onTest={async (id) => {
        await wait(1000);
        if (id === "e2") return { ok: false, error: ar ? "انتهت مهلة الاتصال بعد 10 ثوانٍ." : "The connection timed out after 10 seconds." };
        return { ok: true, code: 200, durationMs: 143 };
      }}
      onReplay={async (id) => {
        await wait(900);
        setDeliveries((list) => list.map((d) => (d.id === id ? { ...d, status: "success" as const, code: 200, error: undefined, attempt: d.attempt + 1, at: Date.now(), durationMs: 210 } : d)));
      }}
      onSetInterval={async (id, seconds) => {
        await wait(400);
        setSources((list) => list.map((s) => (s.id === id ? { ...s, intervalSeconds: seconds } : s)));
      }}
      onPollNow={async (id) => {
        await wait(1200);
        setSources((list) => list.map((s) => (s.id === id ? { ...s, lastStatus: "ok" as const, lastAt: Date.now(), lastError: undefined } : s)));
      }}
    />
  );
}

/* @@INFRA-ADMIN-DEMO-END@@ */
