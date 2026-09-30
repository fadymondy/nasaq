/*
 * Fake async data shared by the team, account-control and audit stories (members, workspaces, audit log,
 * notification preferences, access grants, data privacy). Nothing here talks to a server.
 */
import type {
  AccessLevel,
  AccessResource,
  ApiKeyRecord,
  AuditEntry,
  ConnectedApp,
  DataExportRequest,
  DataExportResult,
  DestinationKind,
  GrantMatrix,
  InviteValues,
  NotificationDestination,
  NotificationKind,
  NotificationPrefs,
  PendingInvite,
  TeamMember,
  WorkspaceListItem,
} from "@nasaq/web";
import { DEFAULT_PREFS, diffRecords, NotificationPreferences } from "@nasaq/web";
import { useRef, useState } from "react";

export { ArabicScope, useAr, wait } from "./_profile-demo";
import { wait } from "./_profile-demo";

const ago = (days: number, hours = 0) => new Date(Date.now() - days * 86_400_000 - hours * 3_600_000).toISOString();
const ahead = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

/* ------------------------------------------------------------------ members */

export const memberRoles = (ar: boolean) => [
  { id: "owner", label: ar ? "مالك" : "Owner", description: ar ? "كل الصلاحيات، بما فيها الفوترة والحذف" : "Everything, including billing and deletion" },
  { id: "admin", label: ar ? "مشرف" : "Admin", description: ar ? "يدير الأعضاء والإعدادات" : "Manage members and settings" },
  { id: "member", label: ar ? "عضو" : "Member", description: ar ? "ينشئ ويعدّل المحتوى" : "Create and edit content" },
  { id: "viewer", label: ar ? "مشاهد" : "Viewer", description: ar ? "قراءة فقط" : "Read only" },
];

export const CURRENT_USER_ID = "u1";

const initialMembers = (ar: boolean): TeamMember[] => [
  { id: "u1", name: ar ? "سارة الحربي" : "Sara Alharbi", email: "sara@example.com", role: "owner", joinedAt: ago(420), lastActive: ago(0, 1) },
  { id: "u2", name: ar ? "عمر خليل" : "Omar Khalil", email: "omar@example.com", role: "admin", joinedAt: ago(300), lastActive: ago(0, 5) },
  { id: "u3", name: ar ? "ليلى المطيري" : "Layla Almutairi", email: "layla@example.com", role: "member", joinedAt: ago(210), lastActive: ago(2) },
  { id: "u4", name: ar ? "يوسف القحطاني" : "Yousef Alqahtani", email: "yousef@example.com", role: "member", joinedAt: ago(150), lastActive: ago(9) },
  { id: "u5", name: ar ? "نورة الدوسري" : "Noura Aldosari", email: "noura@example.com", role: "viewer", joinedAt: ago(64), lastActive: ago(30) },
  { id: "u6", name: ar ? "خالد الشمري" : "Khalid Alshammari", email: "khalid@example.com", role: "member", joinedAt: ago(20), lastActive: null },
];

const initialInvites = (ar: boolean): PendingInvite[] => [
  { id: "i1", email: "reem@example.com", role: "member", invitedBy: ar ? "سارة الحربي" : "Sara Alharbi", sentAt: ago(2), expiresAt: ahead(5) },
  { id: "i2", email: "tariq@example.com", role: "viewer", invitedBy: ar ? "عمر خليل" : "Omar Khalil", sentAt: ago(9), expiresAt: ahead(-2) },
];

/** Members, invites and every handler of `MembersManager`, kept in state. Inviting "taken@example.com" fails. */
export function useMembersDemo(ar: boolean, { admin = false }: { admin?: boolean } = {}) {
  const [members, setMembers] = useState(() => {
    const list = initialMembers(ar);
    // As an admin (not the owner) the signed-in person is Omar.
    return list;
  });
  const [invites, setInvites] = useState(() => initialInvites(ar));
  const currentUserId = admin ? "u2" : CURRENT_USER_ID;
  return {
    members,
    invites,
    roles: memberRoles(ar),
    currentUserId,
    grantableRoles: admin ? ["member", "viewer"] : ["admin", "member", "viewer"],
    handlers: {
      onInvite: async ({ emails, role }: InviteValues) => {
        await wait(800);
        if (emails.includes("taken@example.com")) return { emailsError: ar ? "taken@example.com عضو بالفعل." : "taken@example.com is already a member." };
        setInvites((l) => [...emails.map((email, i) => ({ id: `n${Date.now()}${i}`, email, role, invitedBy: members.find((m) => m.id === currentUserId)?.name, sentAt: new Date().toISOString(), expiresAt: ahead(7) })), ...l]);
      },
      onChangeRole: async (m: TeamMember, role: string) => {
        await wait(600);
        setMembers((l) => l.map((x) => (x.id === m.id ? { ...x, role } : x)));
      },
      onRemove: async (m: TeamMember) => {
        await wait(600);
        setMembers((l) => l.filter((x) => x.id !== m.id));
      },
      onResendInvite: async (i: PendingInvite) => {
        await wait(600);
        setInvites((l) => l.map((x) => (x.id === i.id ? { ...x, sentAt: new Date().toISOString(), expiresAt: ahead(7) } : x)));
      },
      onRevokeInvite: async (i: PendingInvite) => {
        await wait(500);
        setInvites((l) => l.filter((x) => x.id !== i.id));
      },
      onTransferOwnership: async (m: TeamMember) => {
        await wait(900);
        setMembers((l) => l.map((x) => (x.id === m.id ? { ...x, role: "owner" } : x.id === currentUserId ? { ...x, role: "admin" } : x)));
      },
      onLeave: async () => {
        await wait(800);
        setMembers((l) => l.filter((x) => x.id !== currentUserId));
      },
    },
  };
}

/* ------------------------------------------------------------------ workspaces */

const TAKEN_SLUGS = ["admin", "nasaq", "sahab", "support"];

export const checkSlug = async (slug: string) => {
  await wait(500);
  return !TAKEN_SLUGS.includes(slug);
};

export const initialWorkspaces = (ar: boolean): WorkspaceListItem[] => [
  { id: "w1", name: ar ? "استوديو سحاب" : "Sahab Studio", slug: "sahab", role: ar ? "مالك" : "Owner", members: 6, current: true },
  { id: "w2", name: ar ? "مختبر نسق" : "Nasaq Labs", slug: "nasaq-labs", role: ar ? "مشرف" : "Admin", members: 14 },
  { id: "w3", name: ar ? "عميل: مطاعم الرياض" : "Client: Riyadh Eats", slug: "riyadh-eats", role: ar ? "عضو" : "Member", members: 3 },
];

/* ------------------------------------------------------------------ audit log */

export const auditActionLabels = (ar: boolean): Record<string, string> => ({
  "member.role_changed": ar ? "تغيير دور عضو" : "Member role changed",
  "member.invited": ar ? "دعوة عضو" : "Member invited",
  "workspace.renamed": ar ? "إعادة تسمية مساحة العمل" : "Workspace renamed",
  "api_key.created": ar ? "إنشاء مفتاح API" : "API key created",
  "billing.plan_changed": ar ? "تغيير الباقة" : "Plan changed",
  "agent.grant_changed": ar ? "تغيير صلاحية وكيل" : "Agent access changed",
  "settings.updated": ar ? "تحديث الإعدادات" : "Settings updated",
});

export const auditEntityLabels = (ar: boolean): Record<string, string> => ({
  member: ar ? "عضو" : "Member",
  workspace: ar ? "مساحة عمل" : "Workspace",
  api_key: ar ? "مفتاح API" : "API key",
  subscription: ar ? "اشتراك" : "Subscription",
  agent: ar ? "وكيل" : "Agent",
  settings: ar ? "إعدادات" : "Settings",
});

export function auditEntries(ar: boolean): AuditEntry[] {
  const sara = { id: "u1", name: ar ? "سارة الحربي" : "Sara Alharbi", email: "sara@example.com" };
  const omar = { id: "u2", name: ar ? "عمر خليل" : "Omar Khalil", email: "omar@example.com" };
  const layla = { id: "u3", name: ar ? "ليلى المطيري" : "Layla Almutairi", email: "layla@example.com" };
  const base: Omit<AuditEntry, "id">[] = [
    { at: ago(0, 1), actor: sara, action: "member.role_changed", entity: { type: "member", label: omar.name }, channel: "web", ip: "185.12.44.9", changes: diffRecords({ role: "member" }, { role: "admin" }) },
    { at: ago(0, 4), actor: omar, action: "member.invited", entity: { type: "member", label: "reem@example.com" }, channel: "web", ip: "185.12.44.10", changes: diffRecords({}, { email: "reem@example.com", role: "member" }) },
    { at: ago(0, 9), actor: null, action: "billing.plan_changed", entity: { type: "subscription", label: ar ? "الباقة الاحترافية" : "Pro plan" }, channel: "api", changes: diffRecords({ plan: "starter", seats: 5, billing: { cycle: "monthly" } }, { plan: "pro", seats: 10, billing: { cycle: "yearly" } }) },
    { at: ago(1, 2), actor: sara, action: "workspace.renamed", entity: { type: "workspace", label: ar ? "استوديو سحاب" : "Sahab Studio" }, channel: "web", ip: "185.12.44.9", changes: diffRecords({ name: ar ? "سحاب" : "Sahab", slug: "sahab" }, { name: ar ? "استوديو سحاب" : "Sahab Studio", slug: "sahab" }) },
    { at: ago(1, 6), actor: layla, action: "api_key.created", entity: { type: "api_key", label: "Production server" }, channel: "api", ip: "34.120.8.21", changes: diffRecords({}, { name: "Production server", scopes: ["docs:read", "docs:write"], expiresInDays: 90 }) },
    { at: ago(2), actor: { id: "agent1", name: ar ? "وكيل المراجعة" : "Review agent" }, action: "agent.grant_changed", entity: { type: "agent", label: ar ? "وكيل المراجعة" : "Review agent" }, channel: "mcp", changes: diffRecords({ docs: "read", billing: "none" }, { docs: "write", billing: "none" }) },
    { at: ago(3), actor: omar, action: "settings.updated", entity: { type: "settings", label: ar ? "الأمان" : "Security" }, channel: "web", ip: "185.12.44.10", changes: diffRecords({ sessionTimeout: 30, twoFactor: false }, { sessionTimeout: 15, twoFactor: true }) },
    { at: ago(4), actor: sara, action: "member.role_changed", entity: { type: "member", label: ar ? "نورة الدوسري" : "Noura Aldosari" }, channel: "api", changes: diffRecords({ role: "member" }, { role: "viewer" }) },
    { at: ago(6), actor: { id: "agent1", name: ar ? "وكيل المراجعة" : "Review agent" }, action: "member.invited", entity: { type: "member", label: "tariq@example.com" }, channel: "mcp", changes: diffRecords({}, { email: "tariq@example.com", role: "viewer" }) },
    { at: ago(9), actor: layla, action: "settings.updated", entity: { type: "settings", label: ar ? "الإشعارات" : "Notifications" }, channel: "web", ip: "37.8.1.77", changes: diffRecords({ digest: { enabled: false } }, { digest: { enabled: true } }) },
    { at: ago(15), actor: sara, action: "api_key.created", entity: { type: "api_key", label: "CI deploy" }, channel: "web", ip: "185.12.44.9" },
    { at: ago(40), actor: null, action: "billing.plan_changed", entity: { type: "subscription", label: ar ? "الباقة الأساسية" : "Starter plan" }, channel: "api", changes: diffRecords({ plan: "free" }, { plan: "starter" }) },
    { at: ago(75), actor: omar, action: "member.role_changed", entity: { type: "member", label: ar ? "يوسف القحطاني" : "Yousef Alqahtani" }, channel: "web", ip: "185.12.44.10", changes: diffRecords({ role: "viewer" }, { role: "member" }) },
    { at: ago(130), actor: sara, action: "workspace.renamed", entity: { type: "workspace", label: ar ? "سحاب" : "Sahab" }, channel: "web", ip: "185.12.44.9", changes: diffRecords({ name: "Cloud" }, { name: ar ? "سحاب" : "Sahab" }) },
  ];
  return base.map((e, i) => ({ ...e, id: `a${i + 1}` }));
}

/* ------------------------------------------------------------------ notification preferences */

export const notificationKinds = (ar: boolean): NotificationKind[] => {
  const activity = ar ? "النشاط" : "Activity";
  const account = ar ? "الحساب" : "Account";
  const product = ar ? "المنتج" : "Product";
  return [
    { id: "mentions", group: activity, label: ar ? "الإشارات" : "Mentions", description: ar ? "عندما يشير إليك أحد" : "When someone mentions you" },
    { id: "comments", group: activity, label: ar ? "التعليقات" : "Comments", description: ar ? "الردود على ما تتابعه" : "Replies on what you follow" },
    { id: "assignments", group: activity, label: ar ? "المهام المسندة" : "Assignments", description: ar ? "عندما تُسند إليك مهمة" : "When a task is assigned to you" },
    { id: "security", group: account, label: ar ? "تنبيهات الأمان" : "Security alerts", description: ar ? "تسجيل دخول جديد وتغيير كلمة المرور" : "New sign-ins and password changes", locked: ["email"] },
    { id: "billing", group: account, label: ar ? "الفواتير" : "Billing", description: ar ? "الفواتير الجديدة وفشل الدفع" : "New invoices and failed payments" },
    { id: "news", group: product, label: ar ? "أخبار المنتج" : "Product news", description: ar ? "ميزات جديدة ونصائح" : "New features and tips" },
  ];
};

export const initialPrefs = (): NotificationPrefs => ({
  ...DEFAULT_PREFS,
  matrix: {
    mentions: { email: true, push: true, desktop: true },
    comments: { email: true },
    assignments: { email: true, push: true },
    security: { email: true, push: true },
    billing: { email: true },
    news: {},
  },
  quietHours: { enabled: true, from: "22:00", to: "07:00" },
  dailyCap: null,
  batching: "instant",
  digest: { enabled: true, frequency: "weekly", time: "08:00", day: 1 },
});

export const initialDestinations = (ar: boolean): NotificationDestination[] => [
  { id: "d1", kind: "email", target: "team@sahab.example", label: ar ? "بريد الفريق" : "Team inbox", verified: true },
  { id: "d2", kind: "email", target: "ops@sahab.example", verified: false },
  { id: "d3", kind: "webhook", target: "https://hooks.example.com/nasaq/notify", label: "Slack relay" },
];

/**
 * Preferences and destinations with fake saves. Turning WhatsApp on for Billing fails, to show the rollback.
 * A test to the ops address fails.
 */
export function useNotificationsDemo(ar: boolean) {
  const [prefs, setPrefs] = useState(initialPrefs);
  const [destinations, setDestinations] = useState(() => initialDestinations(ar));
  const [permission, setPermission] = useState<"default" | "granted" | "denied" | "unsupported">("default");
  return {
    prefs,
    destinations,
    permission,
    onChange: async (next: NotificationPrefs) => {
      await wait(700);
      if (next.matrix.billing?.whatsapp) return { error: ar ? "تعذّر حفظ واتساب للفواتير الآن." : "WhatsApp for Billing could not be saved right now." };
      setPrefs(next);
    },
    onRequestPush: async () => {
      await wait(900);
      setPermission("granted");
      return "granted" as const;
    },
    onAddDestination: async ({ kind, target }: { kind: DestinationKind; target: string }) => {
      await wait(700);
      setDestinations((l) => [...l, { id: `d${Date.now()}`, kind, target, verified: kind === "email" ? false : undefined }]);
    },
    onRemoveDestination: async (d: NotificationDestination) => {
      await wait(500);
      setDestinations((l) => l.filter((x) => x.id !== d.id));
    },
    onTestDestination: async (d: NotificationDestination) => {
      await wait(900);
      return d.target.startsWith("ops@") ? { ok: false, message: ar ? "رفض الخادم العنوان." : "The mail server rejected this address." } : { ok: true };
    },
  };
}

/* ------------------------------------------------------------------ access grants */

export const scopeLabels = (ar: boolean): Record<string, string> => ({
  "docs:read": ar ? "قراءة المستندات" : "Read documents",
  "docs:write": ar ? "تعديل المستندات" : "Edit documents",
  "tasks:read": ar ? "قراءة المهام" : "Read tasks",
  "tasks:write": ar ? "تعديل المهام" : "Edit tasks",
  "billing:read": ar ? "قراءة الفواتير" : "Read billing",
  "profile:read": ar ? "قراءة الملف الشخصي" : "Read profile",
});

export const accessOrgs = (ar: boolean) => [
  { id: "w1", name: ar ? "استوديو سحاب" : "Sahab Studio" },
  { id: "w2", name: ar ? "مختبر نسق" : "Nasaq Labs" },
];

const initialApps = (ar: boolean): ConnectedApp[] => [
  { id: "app1", name: "Calendar Sync", kind: "app", publisher: "Calendar Sync Ltd", orgId: "w1", scopes: ["profile:read", "tasks:read"], authorizedAt: ago(120), lastUsedAt: ago(0, 2) },
  { id: "app2", name: "Invoice Exporter", kind: "app", publisher: "Ledger Tools", orgId: "w1", scopes: ["billing:read", "docs:read", "profile:read", "tasks:read"], authorizedAt: ago(45), lastUsedAt: ago(6) },
  { id: "ag1", name: ar ? "وكيل المراجعة" : "Review agent", kind: "agent", publisher: "MCP", orgId: "w1", scopes: ["docs:read", "docs:write", "tasks:read"], authorizedAt: ago(30), lastUsedAt: ago(0, 1) },
  { id: "ag2", name: ar ? "وكيل النشر" : "Deploy agent", kind: "agent", publisher: "MCP", orgId: "w2", scopes: ["tasks:read", "tasks:write"], authorizedAt: ago(12), lastUsedAt: null },
  { id: "ag3", name: ar ? "وكيل الفواتير" : "Billing agent", kind: "agent", publisher: "MCP", orgId: "w1", scopes: ["billing:read"], authorizedAt: ago(5), lastUsedAt: ago(1) },
];

export const accessResources = (ar: boolean): AccessResource[] => [
  { id: "docs", label: ar ? "المستندات" : "Documents" },
  { id: "tasks", label: ar ? "المهام" : "Tasks" },
  { id: "billing", label: ar ? "الفواتير" : "Billing" },
];

export const agentKeyScopes = (ar: boolean) => Object.entries(scopeLabels(ar)).map(([id, label]) => ({ id, label }));

let keyCounter = 0;
/** Apps, grants and agent keys with fake saves. Giving the Deploy agent write on Billing fails, to show the rollback. */
export function useAccessDemo(ar: boolean) {
  const [apps, setApps] = useState(() => initialApps(ar));
  const [grants, setGrants] = useState<GrantMatrix>({
    ag1: { docs: "write", tasks: "read", billing: "none" },
    ag2: { tasks: "write" },
    ag3: { billing: "read" },
  });
  const [keys, setKeys] = useState<ApiKeyRecord[]>(() => [
    { id: "k1", name: ar ? "وكيل المراجعة (إنتاج)" : "Review agent (production)", prefix: "nsq_agt_r1v2", last4: "9f3a", scopes: ["docs:read", "docs:write"], createdAt: ago(30), expiresAt: ahead(60), lastUsedAt: ago(0, 1) },
  ]);
  const secret = () => `nsq_agt_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 26)}`;
  return {
    apps,
    grants,
    keys,
    onRevoke: async (app: ConnectedApp) => {
      await wait(700);
      setApps((l) => l.filter((x) => x.id !== app.id));
    },
    onChangeGrant: async (agentId: string, resourceId: string, level: AccessLevel) => {
      await wait(700);
      if (agentId === "ag2" && resourceId === "billing" && level === "write") return { error: ar ? "لا يمكن منح وكيل النشر الكتابة على الفواتير." : "The Deploy agent cannot be given write access to billing." };
      setGrants((g) => ({ ...g, [agentId]: { ...g[agentId], [resourceId]: level } }));
    },
    agentKeys: {
      keys,
      scopes: agentKeyScopes(ar),
      onCreate: async (input: { name: string; scopes: string[]; expiresInDays: number | null }) => {
        await wait(800);
        keyCounter += 1;
        const id = `k${Date.now()}${keyCounter}`;
        setKeys((l) => [{ id, name: input.name, prefix: `nsq_agt_${id.slice(-4)}`, last4: "0000", scopes: input.scopes, createdAt: new Date().toISOString(), expiresAt: input.expiresInDays ? ahead(input.expiresInDays) : null, lastUsedAt: null }, ...l]);
        return { secret: secret() };
      },
      onRotate: async () => {
        await wait(800);
        return { secret: secret() };
      },
      onRevoke: async (id: string) => {
        await wait(600);
        setKeys((l) => l.filter((k) => k.id !== id));
      },
    },
  };
}

/* ------------------------------------------------------------------ data privacy */

/**
 * A data export that moves on each poll: queued, processing (30%, 70%), ready. Requesting a new one starts over.
 */
export function useExportDemo(initial: "none" | "ready" = "none") {
  const polls = useRef(0);
  const [request] = useState<DataExportRequest | null>(() =>
    initial === "ready" ? { id: "x0", status: "ready", requestedAt: ago(1), completedAt: ago(1, -0.2), expiresAt: ahead(6), sizeBytes: 48_300_000 } : null,
  );
  return {
    request,
    onRequest: async (): Promise<DataExportResult> => {
      await wait(700);
      polls.current = 0;
      return { request: { id: `x${Date.now()}`, status: "queued", requestedAt: new Date().toISOString() } };
    },
    poll: async (id: string): Promise<DataExportRequest> => {
      await wait(400);
      polls.current += 1;
      const requestedAt = new Date(Date.now() - 20_000).toISOString();
      if (polls.current === 1) return { id, status: "processing", requestedAt, progress: 0.3 };
      if (polls.current === 2) return { id, status: "processing", requestedAt, progress: 0.7 };
      return { id, status: "ready", requestedAt, completedAt: new Date().toISOString(), expiresAt: ahead(7), sizeBytes: 48_300_000 };
    },
    onDownload: async () => {
      await wait(800);
    },
    pollInterval: 1500,
  };
}

/** The whole notification preferences section, with its fake saves. Used by the notification stories and the settings page. */
export function NotificationsDemo({ ar, sections }: { ar: boolean; sections?: readonly ("matrix" | "quiet" | "limits" | "digest" | "destinations")[] }) {
  const d = useNotificationsDemo(ar);
  return (
    <NotificationPreferences
      kinds={notificationKinds(ar)}
      unavailable={{ whatsapp: ar ? "اربط واتساب من صفحة الاتصالات أولاً." : "Connect WhatsApp on the Connections page first." }}
      value={d.prefs}
      onChange={d.onChange}
      pushPermission={d.permission}
      onRequestPush={d.onRequestPush}
      destinations={d.destinations}
      onAddDestination={d.onAddDestination}
      onRemoveDestination={d.onRemoveDestination}
      onTestDestination={d.onTestDestination}
      sections={sections}
    />
  );
}
