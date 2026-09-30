/* Fake async data and helpers shared by the connector, API-key and MCP stories. Nothing here talks to a server. */
import {
  type ApiKeyRecord,
  type ApiKeyScope,
  ApiKeys,
  type ApiKeySecretResult,
  GitHubLogo,
  IntegrationConnector,
  type IntegrationService,
  useNasaq,
} from "@nasaq/web";
import { useState } from "react";

export const wait = (ms = 700) => new Promise<void>((resolve) => setTimeout(resolve, ms));
export const useAr = () => useNasaq().locale.startsWith("ar");

const DAY = 86_400_000;
export const ago = (days: number) => Date.now() - days * DAY;
export const inDays = (days: number) => Date.now() + days * DAY;

/** A fake secret. Made per call so a demo never shows the same one twice. Not a real credential. */
export function fakeSecret(prefix = "nsq_live_") {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < 32; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}${out}`;
}

export const DEMO_MCP_URL = "https://mcp.nasaq.dev/mcp";
export const DEMO_MCP_TOKEN = "nsq_live_demo0000000000000000000000ab12";

export function apiScopes(ar: boolean): ApiKeyScope[] {
  return ar
    ? [
        { id: "read", label: "قراءة", description: "عرض البيانات دون تعديلها." },
        { id: "write", label: "كتابة", description: "إنشاء السجلات وتعديلها." },
        { id: "webhooks", label: "خطافات الويب", description: "إدارة نقاط استقبال الأحداث." },
        { id: "admin", label: "إدارة", description: "الأعضاء والفوترة." },
      ]
    : [
        { id: "read", label: "Read", description: "View data without changing it." },
        { id: "write", label: "Write", description: "Create and edit records." },
        { id: "webhooks", label: "Webhooks", description: "Manage event endpoints." },
        { id: "admin", label: "Admin", description: "Members and billing." },
      ];
}

export function sampleKeys(ar: boolean): ApiKeyRecord[] {
  return [
    { id: "k1", name: ar ? "خادم الإنتاج" : "Production server", prefix: "nsq_live_a1b2", last4: "9f3c", scopes: ["read", "write"], createdAt: ago(120), lastUsedAt: ago(0.02), expiresAt: inDays(245) },
    { id: "k2", name: ar ? "مهمة النسخ الاحتياطي" : "Nightly backup job", prefix: "nsq_live_c3d4", last4: "70aa", scopes: ["read"], createdAt: ago(60), lastUsedAt: ago(1), expiresAt: inDays(5) },
    { id: "k3", name: ar ? "تجربة قديمة" : "Old prototype", prefix: "nsq_live_e5f6", last4: "1b2d", scopes: ["read", "webhooks"], createdAt: ago(400), lastUsedAt: ago(200), expiresAt: ago(20) },
    { id: "k4", name: ar ? "مفتاح مسرَّب" : "Leaked key", prefix: "nsq_live_g7h8", last4: "ffee", scopes: ["admin"], createdAt: ago(90), lastUsedAt: ago(30), revokedAt: ago(28) },
  ];
}

/** ApiKeys wired to state: create, rotate and revoke all work against the local list. */
export function ApiKeysDemo({ empty = false }: { empty?: boolean }) {
  const ar = useAr();
  const [keys, setKeys] = useState<ApiKeyRecord[]>(empty ? [] : sampleKeys(ar));
  const secret = async (): Promise<ApiKeySecretResult> => ({ secret: fakeSecret() });
  return (
    <ApiKeys
      keys={keys}
      scopes={apiScopes(ar)}
      defaultScopes={["read"]}
      onCreate={async (input) => {
        await wait();
        if (input.name.trim().toLowerCase() === "taken") return { error: ar ? "يوجد مفتاح بهذا الاسم." : "A key with that name exists." };
        const s = fakeSecret();
        setKeys((k) => [
          {
            id: `k${Date.now()}`,
            name: input.name,
            prefix: s.slice(0, 13),
            last4: s.slice(-4),
            scopes: input.scopes,
            createdAt: Date.now(),
            lastUsedAt: null,
            expiresAt: input.expiresInDays == null ? null : inDays(input.expiresInDays),
          },
          ...k,
        ]);
        return { secret: s };
      }}
      onRotate={async () => {
        await wait();
        return secret();
      }}
      onRevoke={async (id) => {
        await wait();
        setKeys((k) => k.map((x) => (x.id === id ? { ...x, revokedAt: Date.now() } : x)));
      }}
    />
  );
}

export function sampleServices(ar: boolean): IntegrationService[] {
  const t = (en: string, arabic: string) => (ar ? arabic : en);
  return [
    {
      id: "ga",
      group: "Google",
      name: "Google Analytics",
      description: t("Traffic, audiences and conversions.", "الزيارات والجمهور والتحويلات."),
      status: "connected",
      connectedAs: "sara@example.com",
      lastSyncAt: ago(0.05),
      scopes: [{ id: "ga.read", label: t("Read your Analytics reports", "قراءة تقارير التحليلات"), required: true }],
      accounts: [
        { id: "p1", name: "Nasaq blog", detail: "GA4 property 412000111" },
        { id: "p2", name: "Nasaq docs", detail: "GA4 property 412000222" },
      ],
      accountId: "p1",
      learnMoreHref: "https://support.google.com/analytics",
    },
    {
      id: "gsc",
      group: "Google",
      name: "Search Console",
      description: t("Queries, clicks and indexing.", "عبارات البحث والنقرات والفهرسة."),
      status: "needs-reauth",
      connectedAs: "sara@example.com",
      message: t("Google asked you to sign in again.", "طلبت Google تسجيل الدخول مجددًا."),
      lastSyncAt: ago(9),
      scopes: [
        { id: "gsc.read", label: t("Read search performance", "قراءة أداء البحث"), required: true },
        { id: "gsc.inspect", label: t("Inspect URLs", "فحص الروابط") },
      ],
    },
    {
      id: "yt",
      group: "Google",
      name: "YouTube",
      description: t("Channel stats and video performance.", "إحصاءات القناة وأداء الفيديو."),
      status: "disconnected",
      scopes: [
        { id: "yt.read", label: t("View your channel analytics", "عرض تحليلات قناتك"), required: true },
        { id: "yt.comments", label: t("Read comments", "قراءة التعليقات") },
      ],
    },
    {
      id: "gh",
      group: t("Developer tools", "أدوات المطورين"),
      name: "GitHub",
      description: t("Repositories, pull requests and deploys.", "المستودعات وطلبات الدمج والنشر."),
      icon: <GitHubLogo className="size-5" />,
      status: "connected",
      connectedAs: "sara-dev",
      lastSyncAt: ago(1),
      scopes: [
        { id: "gh.repo", label: t("Read repositories", "قراءة المستودعات"), required: true },
        { id: "gh.hooks", label: t("Manage webhooks", "إدارة خطافات الويب") },
      ],
    },
    {
      id: "slack",
      group: t("Developer tools", "أدوات المطورين"),
      name: "Slack",
      description: t("Post alerts to a channel.", "إرسال التنبيهات إلى قناة."),
      status: "error",
      message: t("The workspace removed the app.", "أزالت مساحة العمل التطبيق."),
      scopes: [{ id: "slack.post", label: t("Send messages as Nasaq", "إرسال رسائل باسم نسق"), required: true }],
    },
  ];
}

/** IntegrationConnector wired to state: connect and disconnect flip the status, the picker changes the account. */
export function IntegrationDemo({ bare = false }: { bare?: boolean }) {
  const ar = useAr();
  const [services, setServices] = useState(() => sampleServices(ar));
  const patch = (id: string, next: Partial<IntegrationService>) => setServices((s) => s.map((x) => (x.id === id ? { ...x, ...next } : x)));
  return (
    <IntegrationConnector
      bare={bare}
      services={services}
      onConnect={async (id, granted) => {
        await wait(900);
        patch(id, { status: "connected", grantedScopes: granted, connectedAs: "sara@example.com", lastSyncAt: Date.now(), message: undefined });
      }}
      onDisconnect={async (id) => {
        await wait();
        patch(id, { status: "disconnected", connectedAs: undefined, grantedScopes: undefined, lastSyncAt: null, message: undefined });
      }}
      onSelectAccount={async (id, accountId) => {
        await wait(400);
        patch(id, { accountId });
      }}
    />
  );
}
