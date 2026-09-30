/* Fake async data and small screens shared by the admin stories. Nothing here talks to a server. */
import {
  AdminArea,
  type AdminActionResult,
  AdminPage,
  type AdminPlan,
  AdminPlans,
  AdminUsers,
  type AdminWorkspace,
  AdminWorkspaces,
  DangerZone,
  EmptyState,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SettingRow,
  type SettingsGroup,
  SettingsSection,
  SettingsSections,
  Switch,
  type ManagedRole,
  type ManagedUser,
  type NewUserValues,
  StatCard,
  StatGrid,
  useNasaq,
} from "@nasaq/web";
import { Bell, Building2, ShieldCheck, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";

export { ArabicScope, useAr, wait } from "./_profile-demo";
import { wait } from "./_profile-demo";

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

export const adminRoles = (ar: boolean): ManagedRole[] => [
  { id: "owner", label: ar ? "مالك" : "Owner", description: ar ? "صلاحيات كاملة" : "Full access" },
  { id: "admin", label: ar ? "مسؤول" : "Admin", description: ar ? "يدير المستخدمين والإعدادات" : "Manages users and settings" },
  { id: "support", label: ar ? "دعم فني" : "Support", description: ar ? "يرى الحسابات ويساعد أصحابها" : "Sees accounts and helps their owners" },
  { id: "member", label: ar ? "عضو" : "Member", description: ar ? "استخدام عادي" : "Regular use" },
];

const PEOPLE_EN = [
  ["Sara Alharbi", "sara@nasaq.dev"],
  ["Omar Khalil", "omar.khalil@example.com"],
  ["Lina Haddad", "lina@studio-haddad.com"],
  ["Yousef Nasser", "yousef@example.org"],
  ["Maya Farouk", "maya.farouk@example.com"],
  ["Khaled Mansour", "khaled@mansour.co"],
  ["Nour Saleh", "nour@example.com"],
  ["Hassan Idris", "hassan.idris@example.net"],
  ["Rania Zayed", "rania@zayed.io"],
  ["Tariq Bakr", "tariq@example.com"],
  ["Dina Samir", "dina.samir@example.com"],
  ["Fahad Otaibi", "fahad@example.sa"],
];
const PEOPLE_AR = [
  "سارة الحربي",
  "عمر خليل",
  "لينا حداد",
  "يوسف ناصر",
  "مايا فاروق",
  "خالد منصور",
  "نور صالح",
  "حسن إدريس",
  "رانيا زايد",
  "طارق بكر",
  "دينا سمير",
  "فهد العتيبي",
];
const ROLE_SETS = [["owner"], ["admin"], ["support"], ["member"], ["admin", "support"], ["member"], ["member"], ["support"], ["member"], ["member"], ["admin"], ["member"]];
const WORKSPACES = ["Nasaq Labs", "Haddad Studio", "Mansour Co", "Zayed IO", "Green Table", "Northwind Arabia", "Bakr Logistics", "Riyadh Health"];
const WORKSPACES_AR = ["مختبرات نسق", "استوديو حداد", "شركة منصور", "زايد أي أو", "الطاولة الخضراء", "نورثويند العربية", "بكر للوجستيات", "صحة الرياض"];

export const adminUsers = (ar: boolean): ManagedUser[] =>
  PEOPLE_EN.map(([en, email], i) => ({
    id: `u${i + 1}`,
    name: ar ? PEOPLE_AR[i]! : en!,
    email: email!,
    roles: ROLE_SETS[i]!,
    status: i === 6 ? "disabled" : i === 9 || i === 10 ? "invited" : "active",
    verified: i !== 3 && i !== 9 && i !== 10,
    workspace: ar ? WORKSPACES_AR[i % WORKSPACES_AR.length] : WORKSPACES[i % WORKSPACES.length],
    lastActive: i === 9 || i === 10 ? null : daysAgo(i * 2 + (i % 3)),
    createdAt: daysAgo(30 + i * 23),
  }));

export const adminPlans = (ar: boolean): AdminPlan[] => [
  {
    id: "free",
    name: ar ? "مجانية" : "Free",
    description: ar ? "للتجربة والمشاريع الصغيرة" : "For trying things out and small projects",
    priceMonthly: 0,
    seats: 3,
    storageGb: 2,
    features: ar ? ["مشروعان", "دعم عبر المجتمع"] : ["2 projects", "Community support"],
    visible: true,
    subscribers: 4,
  },
  {
    id: "team",
    name: ar ? "فريق" : "Team",
    description: ar ? "للفرق التي تنمو" : "For growing teams",
    priceMonthly: 29,
    seats: 15,
    storageGb: 100,
    features: ar ? ["مشاريع غير محدودة", "دعم بالبريد", "سجل التدقيق"] : ["Unlimited projects", "Email support", "Audit log"],
    visible: true,
    featured: true,
    subscribers: 3,
  },
  {
    id: "business",
    name: ar ? "أعمال" : "Business",
    description: ar ? "للمؤسسات التي تحتاج تحكمًا أكبر" : "For organisations that need more control",
    priceMonthly: 99,
    seats: null,
    storageGb: null,
    features: ar ? ["تسجيل دخول موحّد", "اتفاقية مستوى خدمة", "مدير حساب"] : ["Single sign-on", "Service level agreement", "Account manager"],
    visible: true,
    subscribers: 1,
  },
];

export const adminWorkspaces = (ar: boolean): AdminWorkspace[] =>
  WORKSPACES.map((name, i) => ({
    id: `w${i + 1}`,
    name: ar ? WORKSPACES_AR[i]! : name,
    slug: name.toLowerCase().replace(/\s+/g, "-"),
    owner: { name: ar ? PEOPLE_AR[i]! : PEOPLE_EN[i]![0]!, email: PEOPLE_EN[i]![1]! },
    planId: ["business", "team", "team", "free", "team", "free", "free", "free"][i]!,
    status: i === 3 ? "trial" : i === 6 ? "suspended" : "active",
    seatsUsed: [42, 11, 15, 2, 9, 3, 1, 2][i]!,
    createdAt: daysAgo(20 + i * 41),
    trialEndsAt: i === 3 ? new Date(Date.now() + 6 * 86_400_000).toISOString() : null,
  }));

const ok = async (ms = 600): Promise<AdminActionResult> => {
  await wait(ms);
};

/** Users, roles and every handler `AdminUsers` needs, with fake delays. */
export function useAdminUsersDemo(ar: boolean) {
  const [users, setUsers] = useState(() => adminUsers(ar));
  const [impersonating, setImpersonating] = useState<{ name: string; email: string } | null>(null);
  const patch = useCallback((id: string, next: Partial<ManagedUser>) => setUsers((list) => list.map((u) => (u.id === id ? { ...u, ...next } : u))), []);
  return {
    users,
    roles: adminRoles(ar),
    impersonating,
    stopImpersonating: () => setImpersonating(null),
    handlers: {
      currentUserId: "u1",
      onAddUser: async (values: NewUserValues) => {
        await wait(700);
        if (values.email.toLowerCase() === "sara@nasaq.dev") return { fieldErrors: { email: ar ? "هذا البريد مسجّل بالفعل." : "That email is already registered." } };
        setUsers((list) => [
          {
            id: `u${Date.now()}`,
            name: values.name,
            email: values.email,
            roles: values.roles,
            status: values.sendInvite ? "invited" : "active",
            verified: values.verified,
            lastActive: null,
            createdAt: new Date().toISOString(),
          },
          ...list,
        ]);
      },
      onVerify: async (u: ManagedUser) => {
        await ok();
        patch(u.id, { verified: true });
      },
      onSetDisabled: async (u: ManagedUser, disabled: boolean) => {
        await ok();
        patch(u.id, { status: disabled ? "disabled" : "active" });
      },
      onResetPassword: async () => ok(800),
      onImpersonate: async (u: ManagedUser) => {
        await ok(500);
        setImpersonating({ name: u.name, email: u.email });
      },
      onUpdateRoles: async (u: ManagedUser, roles: string[]) => {
        await ok();
        patch(u.id, { roles });
      },
    },
  };
}

/** Workspaces, plans and handlers for the tenants screens. */
export function useTenantsDemo(ar: boolean) {
  const [workspaces, setWorkspaces] = useState(() => adminWorkspaces(ar));
  const [plans, setPlans] = useState(() => adminPlans(ar));
  const withCounts = plans.map((p) => ({ ...p, subscribers: workspaces.filter((w) => w.planId === p.id).length }));
  return {
    workspaces,
    plans: withCounts,
    workspaceHandlers: {
      onChangePlan: async (w: AdminWorkspace, planId: string) => {
        await ok();
        setWorkspaces((list) => list.map((x) => (x.id === w.id ? { ...x, planId, status: x.status === "trial" ? "active" : x.status } : x)));
      },
      onSetSuspended: async (w: AdminWorkspace, suspended: boolean) => {
        await ok();
        setWorkspaces((list) => list.map((x) => (x.id === w.id ? { ...x, status: suspended ? "suspended" : "active" } : x)));
      },
    },
    onSavePlan: async (plan: Omit<AdminPlan, "id" | "subscribers"> & { id?: string }) => {
      await wait(700);
      if (plan.id) setPlans((list) => list.map((p) => (p.id === plan.id ? { ...p, ...plan, id: p.id } : p)));
      else setPlans((list) => [...list, { ...plan, id: `plan-${Date.now()}` }]);
    },
  };
}

/** A whole admin: the rail, and the users, workspaces and plans screens behind it. */
export function AdminDemo({ initial = "workspaces" }: { initial?: string }) {
  const ar = useNasaq().locale.startsWith("ar");
  const [item, setItem] = useState(initial);
  const usersDemo = useAdminUsersDemo(ar);
  const tenants = useTenantsDemo(ar);
  const me = { name: ar ? "سارة الحربي" : "Sara Alharbi", email: "sara@nasaq.dev" };

  const page = (() => {
    switch (item) {
      case "users":
        return (
          <AdminPage
            title={ar ? "المستخدمون" : "Users"}
            description={ar ? "أضف الأشخاص وتحقق من حساباتهم وتحكّم في أدوارهم." : "Add people, verify their accounts and control their roles."}
            breadcrumbs={[{ label: ar ? "الأشخاص" : "People" }, { label: ar ? "المستخدمون" : "Users" }]}
          >
            <AdminUsers users={usersDemo.users} roles={usersDemo.roles} {...usersDemo.handlers} />
          </AdminPage>
        );
      case "workspaces":
        return (
          <AdminPage
            title={ar ? "مساحات العمل" : "Workspaces"}
            description={ar ? "كل مساحة عمل وباقتها ومقاعدها." : "Every workspace with its plan and seats."}
            breadcrumbs={[{ label: ar ? "المستأجرون" : "Tenants" }, { label: ar ? "مساحات العمل" : "Workspaces" }]}
          >
            <AdminWorkspaces workspaces={tenants.workspaces} plans={tenants.plans} {...tenants.workspaceHandlers} onOpen={() => undefined} />
          </AdminPage>
        );
      case "plans":
        return (
          <AdminPage
            title={ar ? "الباقات" : "Plans"}
            description={ar ? "ما يُباع وبكم وبأي حدود." : "What you sell, for how much, and within which limits."}
            breadcrumbs={[{ label: ar ? "المستأجرون" : "Tenants" }, { label: ar ? "الباقات" : "Plans" }]}
          >
            <AdminPlans plans={tenants.plans} onSavePlan={tenants.onSavePlan} />
          </AdminPage>
        );
      case "dashboard":
        return (
          <AdminPage title={ar ? "لوحة التحكم" : "Dashboard"} breadcrumbs={[{ label: ar ? "نظرة عامة" : "Overview" }, { label: ar ? "لوحة التحكم" : "Dashboard" }]}>
            <StatGrid>
              <StatCard label={ar ? "المستخدمون" : "Users"} value={usersDemo.users.length} />
              <StatCard label={ar ? "مساحات العمل" : "Workspaces"} value={tenants.workspaces.length} />
              <StatCard label={ar ? "الباقات" : "Plans"} value={tenants.plans.length} />
            </StatGrid>
          </AdminPage>
        );
      default:
        return (
          <AdminPage title={item} breadcrumbs={[{ label: item }]}>
            <EmptyState title={ar ? "هذه الصفحة خارج العرض" : "This page is outside the demo"} description={ar ? "جرّب المستخدمين أو مساحات العمل أو الباقات." : "Try Users, Workspaces or Plans."} />
          </AdminPage>
        );
    }
  })();

  return (
    <div className="h-dvh">
      <AdminArea
        activeItem={item}
        onItemSelect={(id) => setItem(id)}
        user={me}
        environment={ar ? "الإنتاج" : "Production"}
        impersonating={usersDemo.impersonating}
        onStopImpersonating={usersDemo.stopImpersonating}
      >
        <div className="h-full overflow-y-auto">{page}</div>
      </AdminArea>
    </div>
  );
}

/* ------------------------------------------------------------------ settings demo */

type Prefs = {
  workspaceName: string;
  slug: string;
  language: string;
  timezone: string;
  emailDigest: boolean;
  mentions: boolean;
  productNews: boolean;
  twoFactor: boolean;
  sessionTimeout: string;
  apiAccess: boolean;
};

const initialPrefs: Prefs = {
  workspaceName: "Nasaq Labs",
  slug: "nasaq-labs",
  language: "en",
  timezone: "Asia/Riyadh",
  emailDigest: true,
  mentions: true,
  productNews: false,
  twoFactor: false,
  sessionTimeout: "30",
  apiAccess: true,
};

/** A settings page with real dirty tracking: edits are drafts until the save bar saves them. */
export function SettingsDemo() {
  const ar = useNasaq().locale.startsWith("ar");
  const [saved, setSaved] = useState<Prefs>(initialPrefs);
  const [draft, setDraft] = useState<Prefs>(initialPrefs);
  const set = <K extends keyof Prefs>(key: K, value: Prefs[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const dirty = (Object.keys(draft) as (keyof Prefs)[]).filter((k) => draft[k] !== saved[k]).length;
  const tr = (en: string, arText: string) => (ar ? arText : en);

  const toggle = (id: keyof Prefs, label: string, description: string) => (
    <SettingRow id={id} label={label} description={description}>
      <Switch checked={draft[id] as boolean} onCheckedChange={(on) => set(id, on as never)} aria-label={label} />
    </SettingRow>
  );

  const groups: SettingsGroup[] = [
    {
      id: "workspace",
      label: tr("Workspace", "مساحة العمل"),
      pages: [
        {
          id: "general",
          label: tr("General", "عام"),
          description: tr("The name and address of your workspace.", "اسم مساحة العمل وعنوانها."),
          icon: <Building2 />,
          keywords: ar ? ["workspace", "name"] : ["company", "brand", "اسم"],
          entries: [
            { id: "workspaceName", label: tr("Workspace name", "اسم مساحة العمل"), keywords: ["title", "اسم"] },
            { id: "slug", label: tr("Workspace address", "عنوان مساحة العمل"), keywords: ["url", "slug", "رابط"] },
            { id: "language", label: tr("Language", "اللغة"), keywords: ["locale", "arabic", "عربي"] },
            { id: "timezone", label: tr("Time zone", "المنطقة الزمنية"), keywords: ["clock", "time"] },
          ],
          content: (
            <SettingsSection title={tr("General", "عام")} description={tr("Shown to everyone in the workspace.", "تظهر لكل من في مساحة العمل.")}>
              <SettingRow id="workspaceName" label={tr("Workspace name", "اسم مساحة العمل")}>
                <Input className="sm:w-64" value={draft.workspaceName} onChange={(e) => set("workspaceName", e.currentTarget.value)} aria-label={tr("Workspace name", "اسم مساحة العمل")} />
              </SettingRow>
              <SettingRow id="slug" label={tr("Workspace address", "عنوان مساحة العمل")} description={tr("Letters, numbers and dashes.", "حروف وأرقام وشرطات.")}>
                <Input ltr className="sm:w-64" value={draft.slug} onChange={(e) => set("slug", e.currentTarget.value)} aria-label={tr("Workspace address", "عنوان مساحة العمل")} />
              </SettingRow>
              <SettingRow id="language" label={tr("Language", "اللغة")}>
                <Select
                  items={[
                    { value: "en", label: "English" },
                    { value: "ar", label: "العربية" },
                  ]}
                  value={draft.language}
                  onValueChange={(v) => set("language", String(v))}
                >
                  <SelectTrigger className="sm:w-48" aria-label={tr("Language", "اللغة")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ar">العربية</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>
              <SettingRow id="timezone" label={tr("Time zone", "المنطقة الزمنية")}>
                <Select
                  items={[
                    { value: "Asia/Riyadh", label: "Riyadh (GMT+3)" },
                    { value: "Africa/Cairo", label: "Cairo (GMT+2)" },
                    { value: "Europe/London", label: "London (GMT+0)" },
                  ]}
                  value={draft.timezone}
                  onValueChange={(v) => set("timezone", String(v))}
                >
                  <SelectTrigger className="sm:w-48" aria-label={tr("Time zone", "المنطقة الزمنية")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Riyadh">Riyadh (GMT+3)</SelectItem>
                    <SelectItem value="Africa/Cairo">Cairo (GMT+2)</SelectItem>
                    <SelectItem value="Europe/London">London (GMT+0)</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>
            </SettingsSection>
          ),
        },
        {
          id: "notifications",
          label: tr("Notifications", "الإشعارات"),
          description: tr("Choose what reaches your inbox.", "اختر ما يصل إلى بريدك."),
          icon: <Bell />,
          keywords: ["email", "mail", "بريد"],
          entries: [
            { id: "emailDigest", label: tr("Weekly digest", "الملخص الأسبوعي") },
            { id: "mentions", label: tr("Mentions", "الإشارات") },
            { id: "productNews", label: tr("Product news", "أخبار المنتج"), keywords: ["newsletter", "نشرة"] },
          ],
          content: (
            <SettingsSection title={tr("Email", "البريد")} description={tr("Sent to the address on your account.", "تُرسل إلى العنوان في حسابك.")}>
              {toggle("emailDigest", tr("Weekly digest", "الملخص الأسبوعي"), tr("A summary of what happened, every Monday.", "ملخص لما حدث، كل اثنين."))}
              {toggle("mentions", tr("Mentions", "الإشارات"), tr("When someone mentions you.", "عندما يشير إليك أحد."))}
              {toggle("productNews", tr("Product news", "أخبار المنتج"), tr("New features and tips, once a month.", "ميزات جديدة ونصائح، مرة كل شهر."))}
            </SettingsSection>
          ),
        },
      ],
    },
    {
      id: "security",
      label: tr("Security", "الأمان"),
      pages: [
        {
          id: "access",
          label: tr("Access", "الوصول"),
          description: tr("Sign-in rules for the workspace.", "قواعد تسجيل الدخول لمساحة العمل."),
          icon: <ShieldCheck />,
          keywords: ["password", "2fa", "كلمة المرور"],
          entries: [
            { id: "twoFactor", label: tr("Require two-factor sign-in", "اشتراط التحقق بخطوتين"), keywords: ["2fa", "mfa"] },
            { id: "sessionTimeout", label: tr("Session timeout", "مهلة الجلسة"), keywords: ["logout", "idle"] },
            { id: "apiAccess", label: tr("API access", "الوصول عبر API"), keywords: ["token", "key", "مفتاح"] },
          ],
          content: (
            <SettingsSection title={tr("Access", "الوصول")}>
              {toggle("twoFactor", tr("Require two-factor sign-in", "اشتراط التحقق بخطوتين"), tr("Members set it up the next time they sign in.", "يفعّله الأعضاء عند دخولهم التالي."))}
              <SettingRow id="sessionTimeout" label={tr("Session timeout", "مهلة الجلسة")} description={tr("Minutes of inactivity before sign-out.", "دقائق الخمول قبل تسجيل الخروج.")}>
                <Input ltr type="number" min={5} className="sm:w-28" value={draft.sessionTimeout} onChange={(e) => set("sessionTimeout", e.currentTarget.value)} aria-label={tr("Session timeout", "مهلة الجلسة")} />
              </SettingRow>
              {toggle("apiAccess", tr("API access", "الوصول عبر API"), tr("Lets members create API keys.", "يسمح للأعضاء بإنشاء مفاتيح API."))}
            </SettingsSection>
          ),
        },
        {
          id: "danger",
          label: tr("Danger zone", "منطقة الخطر"),
          icon: <Trash2 />,
          tone: "danger",
          entries: [{ id: "delete", label: tr("Delete workspace", "حذف مساحة العمل"), keywords: ["remove", "إزالة"] }],
          content: (
            <div data-setting-id="delete">
              <DangerZone confirmText="nasaq-labs" onDelete={() => wait(900)} />
            </div>
          ),
        },
      ],
    },
  ];

  return (
    <div className="min-h-dvh p-4 sm:p-8">
      <SettingsSections
        groups={groups}
        title={tr("Settings", "الإعدادات")}
        dirty={dirty}
        onSave={async () => {
          await wait(900);
          setSaved(draft);
        }}
        onDiscard={() => setDraft(saved)}
      />
    </div>
  );
}
