/* Shared fixtures and stateful demos for the infra stories: server card, network rules, domains, proxy hosts,
   uptime, status page, certificates and vulnerability report. Everything is fake: names, addresses (documentation
   ranges 192.0.2.x, 198.51.100.x, 203.0.113.x), CVE ids and hosts on example domains. */
import {
  type CertificateRecord,
  CertificateMonitor,
  type CheckResult,
  DomainsManager,
  type DomainRecord,
  type FirewallRule,
  type HttpRule,
  type Incident,
  type IncidentInput,
  type ManagedService,
  NetworkRules,
  type PowerAction,
  type ProxyHost,
  type ProxyHostInput,
  ProxyHosts,
  ServerCard,
  type ServerInfo,
  type ServerLimits,
  type StatusPageMaintenance,
  StatusPage,
  StatusPageManager,
  type StatusPageService,
  type StatusPageSettings,
  type UptimeMonitor,
  UptimeMonitors,
  type MonitorInput,
  type VulnFinding,
  VulnReport,
  type VulnScan,
  useNasaq,
} from "@nasaq/web";
import { useEffect, useRef, useState } from "react";

export const useAr = () => useNasaq().locale.startsWith("ar");
export const wait = (ms = 600) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const ago = (ms: number) => Date.now() - ms;
const ahead = (ms: number) => Date.now() + ms;
const uid = () => Math.random().toString(36).slice(2, 9);

/* ------------------------------------------------------------------ server */

export function sampleServer(ar: boolean): ServerInfo {
  return {
    id: "srv-1",
    name: ar ? "خادم المتجر" : "storefront-prod",
    status: "running",
    address: "203.0.113.24",
    region: ar ? "فرانكفورت" : "Frankfurt",
    os: "Ubuntu 24.04",
    limits: { cpuCores: 4, memoryMb: 8192, diskGb: 160 },
    metrics: { cpu: 42, memory: 63, disk: 71, cpuHistory: [22, 28, 25, 31, 44, 38, 52, 47, 41, 36, 49, 58, 44, 39, 42] },
    lastDeploy: { ref: "a91f3c2", at: ago(3 * HOUR), status: "success", by: ar ? "سارة" : "Sara" },
    snapshots: [
      { id: "s1", name: ar ? "قبل ترقية قاعدة البيانات" : "Before database upgrade", createdAt: ago(2 * DAY), sizeLabel: "18.4 GB", status: "ready" },
      { id: "s2", name: ar ? "أسبوعية" : "Weekly", createdAt: ago(6 * DAY), sizeLabel: "17.9 GB", status: "ready" },
    ],
  };
}

const NEXT_STATE: Record<PowerAction, ServerInfo["status"]> = { start: "running", stop: "stopped", restart: "running", "force-stop": "stopped" };
const MID_STATE: Record<PowerAction, ServerInfo["status"]> = { start: "starting", stop: "stopping", restart: "restarting", "force-stop": "stopping" };

export function ServerDemo({ initial, loading, failPower }: { initial?: Partial<ServerInfo>; loading?: boolean; failPower?: boolean } = {}) {
  const ar = useAr();
  const [server, setServer] = useState<ServerInfo>(() => ({ ...sampleServer(ar), ...initial }));
  useEffect(() => setServer((s) => ({ ...sampleServer(ar), ...initial, status: s.status, limits: s.limits })), [ar]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <ServerCard
      className="max-w-2xl"
      server={server}
      loading={loading}
      onPower={async (action) => {
        if (failPower) {
          await wait(500);
          return { error: ar ? "تعذّر الوصول إلى المزوّد. حاول مرة أخرى." : "The provider could not be reached. Try again." };
        }
        setServer((s) => ({ ...s, status: MID_STATE[action] }));
        await wait(1600);
        setServer((s) => ({ ...s, status: NEXT_STATE[action] }));
      }}
      onTakeSnapshot={async (name) => {
        await wait(700);
        setServer((s) => ({ ...s, snapshots: [{ id: uid(), name: name || (ar ? "لقطة جديدة" : "New snapshot"), createdAt: Date.now(), sizeLabel: "18.6 GB", status: "ready" }, ...s.snapshots] }));
      }}
      onRollback={async () => {
        await wait(900);
      }}
      onDeleteSnapshot={async (id) => {
        await wait(400);
        setServer((s) => ({ ...s, snapshots: s.snapshots.filter((x) => x.id !== id) }));
      }}
      onSaveLimits={async (limits: ServerLimits) => {
        await wait(600);
        setServer((s) => ({ ...s, limits }));
      }}
    />
  );
}

/* ----------------------------------------------------------------- network */

export const sampleFirewall: FirewallRule[] = [
  { id: "f1", action: "allow", protocol: "tcp", port: "22", source: "198.51.100.0/24", note: "Office" },
  { id: "f2", action: "allow", protocol: "tcp", port: "443", source: "any" },
  { id: "f3", action: "allow", protocol: "tcp", port: "80", source: "any" },
  { id: "f4", action: "deny", protocol: "tcp", port: "3306", source: "any", note: "Database stays private" },
  { id: "f5", action: "allow", protocol: "icmp", port: "", source: "any" },
];

export const sampleHttpRules: HttpRule[] = [
  { id: "h1", type: "redirect", path: "/old-shop", target: "https://shop.example.com/", status: 301 },
  { id: "h2", type: "header", path: "/", name: "X-Frame-Options", value: "DENY" },
  { id: "h3", type: "basic-auth", path: "/staging", username: "preview" },
  { id: "h4", type: "ip-deny", path: "/admin", cidr: "192.0.2.0/24" },
];

export function NetworkDemo({ withHttp = true, loading, defaultTab }: { withHttp?: boolean; loading?: boolean; defaultTab?: "firewall" | "http" } = {}) {
  const [fw, setFw] = useState<FirewallRule[]>(sampleFirewall);
  const [http, setHttp] = useState<HttpRule[]>(sampleHttpRules);
  return (
    <NetworkRules
      firewall={fw}
      http={withHttp ? http : undefined}
      loading={loading}
      defaultTab={defaultTab}
      onApplyFirewall={async (rules) => {
        await wait(800);
        setFw(rules);
      }}
      onApplyHttp={async (rules) => {
        await wait(800);
        setHttp(rules.map((r) => ({ ...r, password: undefined })));
      }}
    />
  );
}

/* ----------------------------------------------------------------- domains */

export function sampleDomains(ar: boolean): DomainRecord[] {
  return [
    { id: "d1", host: "shop.example.com", check: "verified", primary: true, addedAt: ago(90 * DAY) },
    { id: "d2", host: "www.example.com", check: "verified", addedAt: ago(90 * DAY) },
    { id: "d3", host: "store.example.org", check: "pending", addedAt: ago(1 * DAY) },
    { id: "d4", host: "sale.example.net", check: "failed", addedAt: ago(3 * DAY), error: ar ? "لم يُعثر على سجل CNAME." : "No CNAME record found." },
  ];
}

export function DomainsDemo({ loading }: { loading?: boolean } = {}) {
  const ar = useAr();
  const [rows, setRows] = useState<DomainRecord[]>(() => sampleDomains(ar));
  return (
    <DomainsManager
      domains={rows}
      loading={loading}
      cnameTarget="edge.nasaq-demo.com"
      onAdd={async (host) => {
        if (rows.some((r) => r.host === host)) return { error: ar ? "هذا النطاق مضاف بالفعل." : "That domain is already added." };
        await wait(600);
        setRows((r) => [...r, { id: uid(), host, check: "pending", addedAt: Date.now() }]);
      }}
      onRemove={async (id) => {
        await wait(400);
        setRows((r) => r.filter((x) => x.id !== id));
      }}
      onRecheck={async (id) => {
        setRows((r) => r.map((x) => (x.id === id ? { ...x, check: "checking", error: undefined } : x)));
        await wait(1400);
        setRows((r) => r.map((x) => (x.id === id ? { ...x, check: x.host.endsWith(".net") ? "failed" : "verified", error: x.host.endsWith(".net") ? (ar ? "لم يُعثر على سجل CNAME." : "No CNAME record found.") : undefined } : x)));
      }}
      onMakePrimary={async (id) => {
        await wait(400);
        setRows((r) => r.map((x) => ({ ...x, primary: x.id === id })));
      }}
    />
  );
}

export const manyDomains: Pick<DomainRecord, "id" | "host" | "check" | "primary">[] = [
  { id: "m1", host: "shop.example.com", check: "verified", primary: true },
  { id: "m2", host: "www.example.com", check: "verified" },
  { id: "m3", host: "store.example.org", check: "pending" },
  { id: "m4", host: "sale.example.net", check: "failed" },
  { id: "m5", host: "outlet.example.com", check: "verified" },
  { id: "m6", host: "deals.example.com", check: "checking" },
  { id: "m7", host: "promo.example.com", check: "verified" },
];

/* ------------------------------------------------------------- proxy hosts */

export const sampleProxyHosts: ProxyHost[] = [
  { id: "p1", hosts: ["shop.example.com", "www.example.com"], upstream: "http://10.0.0.5:3000", tlsMode: "auto", websockets: true, enabled: true, status: "online" },
  { id: "p2", hosts: ["api.example.com"], upstream: "http://10.0.0.6:8080", tlsMode: "auto", websockets: false, enabled: true, status: "online" },
  { id: "p3", hosts: ["admin.example.com", "ops.example.com", "panel.example.com", "console.example.com", "manage.example.com"], upstream: "https://10.0.0.7:8443", tlsMode: "custom", websockets: true, enabled: true, status: "offline" },
  { id: "p4", hosts: ["mail.example.com"], upstream: "http://10.0.0.9:25", tlsMode: "passthrough", websockets: false, enabled: false, status: "unknown" },
];

export function ProxyDemo({ loading }: { loading?: boolean } = {}) {
  const [rows, setRows] = useState<ProxyHost[]>(sampleProxyHosts);
  return (
    <ProxyHosts
      hosts={rows}
      loading={loading}
      onSave={async (input: ProxyHostInput, id) => {
        await wait(600);
        setRows((r) => (id ? r.map((x) => (x.id === id ? { ...x, ...input } : x)) : [...r, { ...input, id: uid(), status: "unknown" }]));
      }}
      onDelete={async (id) => {
        await wait(400);
        setRows((r) => r.filter((x) => x.id !== id));
      }}
      onToggle={async (id, enabled) => {
        await wait(300);
        setRows((r) => r.map((x) => (x.id === id ? { ...x, enabled } : x)));
      }}
    />
  );
}

/* ------------------------------------------------------------------ uptime */

/** Deterministic history: mostly up, a few slow checks and one outage window. */
export function makeChecks(count: number, seed: number, outageAt?: number): CheckResult[] {
  return Array.from({ length: count }, (_, i) => {
    if (outageAt !== undefined && i >= outageAt && i < outageAt + 2) return "down";
    const r = Math.sin((i + 1) * (seed + 3)) * 10000;
    const f = r - Math.floor(r);
    return f > 0.94 ? "degraded" : "up";
  });
}

export function sampleMonitors(ar: boolean): UptimeMonitor[] {
  return [
    { id: "u1", name: ar ? "المتجر" : "Storefront", target: "https://shop.example.com", kind: "http", status: "up", uptime: { "24h": 100, "7d": 99.98, "30d": 99.95 }, checks: makeChecks(48, 1), responseMs: 184, lastCheckAt: ago(2 * MIN), intervalSec: 60 },
    { id: "u2", name: ar ? "واجهة API" : "API", target: "https://api.example.com/health", kind: "http", status: "degraded", uptime: { "24h": 99.2, "7d": 99.71, "30d": 99.88 }, checks: makeChecks(48, 2), responseMs: 1420, lastCheckAt: ago(1 * MIN), intervalSec: 60 },
    { id: "u3", name: ar ? "قاعدة البيانات" : "Database", target: "10.0.0.8:5432", kind: "tcp", status: "up", uptime: { "24h": 100, "7d": 100, "30d": 99.99 }, checks: makeChecks(48, 3), responseMs: 12, lastCheckAt: ago(3 * MIN), intervalSec: 300 },
    { id: "u4", name: ar ? "الدفع" : "Payments", target: "https://pay.example.com/ping", kind: "keyword", status: "down", uptime: { "24h": 96.4, "7d": 98.9, "30d": 99.4 }, checks: makeChecks(48, 4, 44), responseMs: undefined, lastCheckAt: ago(1 * MIN), intervalSec: 30 },
    { id: "u5", name: ar ? "البريد" : "Mail", target: "mail.example.com:25", kind: "tcp", status: "paused", uptime: { "24h": null, "7d": null, "30d": 99.7 }, checks: [], lastCheckAt: ago(4 * DAY), intervalSec: 900 },
  ];
}

export function sampleIncidents(ar: boolean): Incident[] {
  return [
    {
      id: "i1",
      title: ar ? "فشل معالجة المدفوعات" : "Payment processing failures",
      status: "identified",
      impact: "major",
      startedAt: ago(50 * MIN),
      services: [ar ? "الدفع" : "Payments"],
      updates: [
        { at: ago(50 * MIN), status: "investigating", body: ar ? "نلاحظ ارتفاعًا في أخطاء الدفع." : "We see a spike in payment errors." },
        { at: ago(25 * MIN), status: "identified", body: ar ? "حددنا السبب في مزوّد البوابة ونعمل على التحويل." : "We traced it to the gateway provider and are failing over." },
      ],
    },
    {
      id: "i2",
      title: ar ? "بطء في واجهة API" : "Slow API responses",
      status: "resolved",
      impact: "minor",
      startedAt: ago(3 * DAY),
      resolvedAt: ago(3 * DAY - 95 * MIN),
      services: ["API"],
      updates: [
        { at: ago(3 * DAY), status: "investigating", body: ar ? "زمن الاستجابة أعلى من المعتاد." : "Response times are higher than usual." },
        { at: ago(3 * DAY - 95 * MIN), status: "resolved", body: ar ? "عاد كل شيء إلى طبيعته بعد توسيع القدرة." : "Back to normal after adding capacity." },
      ],
    },
  ];
}

export function UptimeDemo({ loading, empty }: { loading?: boolean; empty?: boolean } = {}) {
  const ar = useAr();
  const [rows, setRows] = useState<UptimeMonitor[]>(() => sampleMonitors(ar));
  const [incidents] = useState<Incident[]>(() => sampleIncidents(ar));
  const mount = useRef(true);
  useEffect(() => {
    if (mount.current) mount.current = false;
    else setRows(sampleMonitors(ar));
  }, [ar]);
  return (
    <UptimeMonitors
      monitors={empty ? [] : rows}
      incidents={empty ? [] : incidents}
      loading={loading}
      onSave={async (input: MonitorInput, id) => {
        await wait(500);
        setRows((r) => (id ? r.map((x) => (x.id === id ? { ...x, ...input } : x)) : [...r, { id: uid(), ...input, status: "unknown", uptime: {}, checks: [] }]));
      }}
      onDelete={async (id) => {
        await wait(400);
        setRows((r) => r.filter((x) => x.id !== id));
      }}
      onPause={async (id) => {
        setRows((r) => r.map((x) => (x.id === id ? { ...x, status: "paused" } : x)));
      }}
      onResume={async (id) => {
        setRows((r) => r.map((x) => (x.id === id ? { ...x, status: "up" } : x)));
      }}
      onCheckNow={async (id) => {
        await wait(900);
        setRows((r) => r.map((x) => (x.id === id ? { ...x, lastCheckAt: Date.now() } : x)));
      }}
    />
  );
}

/* ------------------------------------------------------------- status page */

export function sampleStatusServices(ar: boolean, mode: "ok" | "incident" = "incident"): StatusPageService[] {
  const days = (seed: number, outage?: number) => makeChecks(90, seed, outage);
  return [
    { id: "w1", name: ar ? "المتجر" : "Storefront", description: ar ? "الموقع وسلة الشراء" : "Website and checkout", status: "up", days: days(11), uptime: 99.98 },
    { id: "w2", name: "API", description: ar ? "واجهة المطورين" : "Developer API", status: mode === "incident" ? "degraded" : "up", days: days(12, 88), uptime: 99.71 },
    { id: "w3", name: ar ? "الدفع" : "Payments", status: mode === "incident" ? "down" : "up", days: days(13, 87), uptime: 99.4 },
    { id: "w4", name: ar ? "لوحة التحكم" : "Dashboard", status: "up", days: days(14), uptime: 99.99 },
  ];
}

export function sampleMaintenance(ar: boolean): StatusPageMaintenance[] {
  return [{ id: "mt1", title: ar ? "ترقية قاعدة البيانات" : "Database upgrade", description: ar ? "قد تتوقف الطلبات لدقائق." : "Requests may pause for a few minutes.", startsAt: ahead(2 * DAY), endsAt: ahead(2 * DAY + 45 * MIN) }];
}

export function sampleManagerSettings(ar: boolean): StatusPageSettings {
  return {
    title: ar ? "حالة نسق التجريبية" : "Nasaq Demo Status",
    slug: "nasaq-demo",
    domain: "status.nasaq-demo.com",
    services: sampleStatusServices(ar).map((s): ManagedService => ({ id: s.id, name: s.name, visible: s.id !== "w4" })),
  };
}

export function StatusManagerDemo() {
  const ar = useAr();
  const [settings, setSettings] = useState<StatusPageSettings>(() => sampleManagerSettings(ar));
  const [incidents, setIncidents] = useState<Incident[]>(() => sampleIncidents(ar));
  return (
    <StatusPageManager
      settings={settings}
      incidents={incidents}
      publicUrl="#"
      onSave={async (next) => {
        await wait(700);
        setSettings(next);
      }}
      onPostIncident={async (input: IncidentInput) => {
        await wait(600);
        setIncidents((list) => [
          { id: uid(), title: input.title, status: input.status, impact: input.impact, startedAt: Date.now(), services: settings.services.filter((s) => input.serviceIds.includes(s.id)).map((s) => s.name), updates: [{ at: Date.now(), status: input.status, body: input.body }] },
          ...list,
        ]);
      }}
    />
  );
}

/* ------------------------------------------------------------ certificates */

export function sampleCerts(): CertificateRecord[] {
  return [
    { id: "c1", host: "shop.example.com", issuer: "Let's Encrypt R11", validTo: ahead(72 * DAY), autoRenew: true },
    { id: "c2", host: "api.example.com", issuer: "Let's Encrypt R11", validTo: ahead(24 * DAY), autoRenew: true },
    { id: "c3", host: "*.internal.example.com", issuer: "Internal CA", validTo: ahead(5 * DAY), autoRenew: false },
    { id: "c4", host: "legacy.example.org", issuer: "Example Trust CA", validTo: ago(2 * DAY), autoRenew: false },
    { id: "c5", host: "vpn.example.net", error: "Connection timed out" },
    { id: "c6", host: "www.example.com", issuer: "Let's Encrypt R11", validTo: ahead(140 * DAY), autoRenew: true },
  ];
}

export function CertsDemo({ loading }: { loading?: boolean } = {}) {
  const [rows, setRows] = useState<CertificateRecord[]>(sampleCerts);
  return (
    <CertificateMonitor
      certificates={rows}
      loading={loading}
      onAdd={async (host) => {
        await wait(700);
        setRows((r) => [...r, { id: uid(), host, issuer: "Let's Encrypt R11", validTo: ahead(88 * DAY), autoRenew: true }]);
      }}
      onRecheck={async () => {
        await wait(800);
      }}
      onRenew={async (id) => {
        await wait(1200);
        setRows((r) => r.map((x) => (x.id === id ? { ...x, validTo: ahead(90 * DAY), error: undefined } : x)));
      }}
      onRemove={async (id) => {
        await wait(300);
        setRows((r) => r.filter((x) => x.id !== id));
      }}
    />
  );
}

/* ----------------------------------------------------------------- vuln */

export const sampleFindings: VulnFinding[] = [
  { id: "CVE-2024-38001", severity: "critical", cvss: 9.8, title: "Remote code execution in image parser", package: "imagelib", installedVersion: "2.4.1", fixedVersion: "2.4.9" },
  { id: "CVE-2024-27114", severity: "high", cvss: 8.1, title: "Path traversal in static file handler", package: "webserver", installedVersion: "1.18.0", fixedVersion: "1.18.3" },
  { id: "CVE-2023-51902", severity: "high", cvss: 7.5, title: "Denial of service through crafted headers", package: "httpcore", installedVersion: "0.9.2" },
  { id: "CVE-2024-11873", severity: "medium", cvss: 6.1, title: "Cross-site scripting in error page", package: "templating", installedVersion: "5.0.0", fixedVersion: "5.0.2" },
  { id: "CVE-2023-40455", severity: "medium", cvss: 5.3, title: "Information leak in debug output", package: "logger", installedVersion: "3.3.0", fixedVersion: "3.4.0" },
  { id: "CVE-2022-90210", severity: "low", cvss: 3.1, title: "Weak default cipher order", package: "tlskit", installedVersion: "1.2.0", fixedVersion: "1.3.0" },
  { id: "CVE-2022-88123", severity: "low", cvss: 2.4, title: "Verbose version banner", package: "webserver", installedVersion: "1.18.0", fixedVersion: "1.18.3" },
];

export const sampleScanHistory: VulnScan[] = [
  { id: "h1", at: ago(35 * DAY), counts: { critical: 2, high: 4, medium: 6, low: 3 } },
  { id: "h2", at: ago(28 * DAY), counts: { critical: 2, high: 3, medium: 6, low: 3 } },
  { id: "h3", at: ago(21 * DAY), counts: { critical: 1, high: 3, medium: 5, low: 4 } },
  { id: "h4", at: ago(14 * DAY), counts: { critical: 1, high: 3, medium: 5, low: 3 } },
  { id: "h5", at: ago(7 * DAY), counts: { critical: 1, high: 2, medium: 4, low: 3 } },
  { id: "h6", at: ago(1 * DAY), counts: { critical: 1, high: 2, medium: 2, low: 2 } },
];

export function VulnDemo({ clean, empty }: { clean?: boolean; empty?: boolean } = {}) {
  const [scanning, setScanning] = useState(false);
  if (empty) return <VulnReport findings={[]} onScan={async () => undefined} />;
  return (
    <VulnReport
      findings={clean ? [] : sampleFindings}
      history={clean ? sampleScanHistory.slice(0, 2).concat({ id: "h9", at: ago(1 * DAY), counts: {} }) : sampleScanHistory}
      lastScanAt={ago(1 * DAY)}
      scanning={scanning}
      onScan={async () => {
        setScanning(true);
        await wait(1800);
        setScanning(false);
      }}
    />
  );
}

export function StatusPageDemo({ mode }: { mode: "ok" | "incident" }) {
  const ar = useAr();
  const incidents = sampleIncidents(ar);
  return (
    <StatusPage
      title={ar ? "حالة نسق التجريبية" : "Nasaq Demo Status"}
      services={sampleStatusServices(ar, mode)}
      incidents={mode === "incident" ? incidents : incidents.filter((i) => i.status === "resolved")}
      maintenance={sampleMaintenance(ar)}
      updatedAt={Date.now() - 60_000}
    />
  );
}
