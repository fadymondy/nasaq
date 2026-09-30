/* Fake data and handlers for the project-level tabs beyond the board: memory, vault, GitHub and the settings pages. Nothing here talks to a server. */
import {
  type EnvVariable,
  type GithubCommit,
  type GithubPull,
  type GithubRun,
  type IssuePerson,
  type MemberRoleOption,
  type PendingInvite,
  type PickerBranch,
  type PickerRepo,
  type ProjectIntegration,
  type ProjectMemoryInput,
  type ProjectMemoryItem,
  type ProjectViewProps,
  type RepositoryPickerValue,
  type TeamMember,
  type VaultAccessEvent,
  type VaultSecret,
  type VaultSecretInput,
} from "@nasaq/web";
import { Bell, Calendar, GitBranch, MessageSquare } from "lucide-react";
import { useRef, useState } from "react";
import { wait } from "./_profile-demo";

const HOUR = 3_600_000;
const DAY = 86_400_000;
const ago = (ms: number) => Date.now() - ms;
const iso = (offsetDays: number) => new Date(ago(-offsetDays * DAY)).toISOString().slice(0, 10);

const memories = (ar: boolean): ProjectMemoryItem[] => [
  { id: "m1", kind: "decision", text: ar ? "نستخدم Stripe للدفع، ولا نخزّن بيانات البطاقات عندنا أبدًا." : "We use Stripe for payments and never store card data ourselves.", tags: ["payments", "security"], source: ar ? "اجتماع الانطلاق" : "Kickoff meeting", at: ago(30 * DAY) },
  { id: "m2", kind: "fact", text: ar ? "يعيد Stripe إرسال الـ webhooks ثلاث مرات خلال 24 ساعة، فيجب أن يكون المعالج idempotent." : "Stripe retries webhooks three times within 24 hours, so the handler must be idempotent.", tags: ["payments", "api"], source: "docs.stripe.com", at: ago(12 * DAY) },
  { id: "m3", kind: "decision", text: ar ? "يُقرَّب مجموع الطلب لكل سطر لا للمجموع الكلي، حسب طلب المحاسبة." : "Order totals round per line, not on the grand total, as accounting asked.", tags: ["checkout", "accounting"], source: ar ? "ليلى الحداد" : "Layla Haddad", at: ago(5 * DAY) },
  { id: "m4", kind: "fact", text: ar ? "العميل يعمل بتوقيت الرياض ولا يردّ خارج ساعات الدوام." : "The client works on Riyadh time and does not reply outside office hours.", tags: ["client"], at: ago(3 * DAY) },
];

const secrets = (ar: boolean): VaultSecret[] => [
  { id: "s1", name: "STRIPE_SECRET_KEY", group: ar ? "الدفع" : "Payments", kind: "api-key", description: ar ? "مفتاح الإنتاج" : "Live key", hint: "…4f2a", updatedAt: ago(20 * DAY), lastAccessedAt: ago(2 * HOUR) },
  { id: "s2", name: "STRIPE_WEBHOOK_SECRET", group: ar ? "الدفع" : "Payments", kind: "token", hint: "…9c1e", updatedAt: ago(20 * DAY), expiresAt: ago(-9 * DAY) },
  { id: "s3", name: "DATABASE_URL", group: ar ? "البنية" : "Infrastructure", kind: "password", hint: "…x7Kp", updatedAt: ago(45 * DAY) },
  { id: "s4", name: "DEPLOY_SSH_KEY", group: ar ? "البنية" : "Infrastructure", kind: "ssh-key", updatedAt: ago(90 * DAY), expiresAt: ago(3 * DAY) },
];

const envs = (): Record<string, EnvVariable[]> => ({
  development: [
    { key: "NEXT_PUBLIC_API_URL", value: "http://localhost:4000" },
    { key: "STRIPE_SECRET_KEY", value: "sk_test_51Nasaq0000demo", secret: true },
  ],
  production: [
    { key: "NEXT_PUBLIC_API_URL", value: "https://api.oasis.example" },
    { key: "STRIPE_SECRET_KEY", value: "sk_live_51Nasaq0000demo", secret: true, description: "Live key" },
    { key: "DATABASE_URL", value: "postgres://oasis:demo@db.internal/oasis", secret: true },
  ],
});

const REPOS: PickerRepo[] = [
  { id: "r1", fullName: "nasaq/checkout", description: "Checkout and payments", private: true, language: "TypeScript", defaultBranch: "main", stars: 12, updatedAt: ago(5 * HOUR) },
  { id: "r2", fullName: "nasaq/storefront", description: "Public storefront", private: false, language: "TypeScript", defaultBranch: "main", stars: 48, updatedAt: ago(3 * DAY) },
  { id: "r3", fullName: "nasaq/admin", description: "Back office", private: true, language: "TypeScript", defaultBranch: "develop", updatedAt: ago(9 * DAY) },
];

const roles = (ar: boolean): MemberRoleOption[] => [
  { id: "owner", label: ar ? "مالك" : "Owner" },
  { id: "manager", label: ar ? "مدير" : "Manager", description: ar ? "يدير المهام والأعضاء" : "Manages issues and members" },
  { id: "member", label: ar ? "عضو" : "Member", description: ar ? "يعمل على المهام" : "Works on issues" },
  { id: "viewer", label: ar ? "مشاهد" : "Viewer", description: ar ? "قراءة فقط" : "Read only" },
];

const teamMembers = (ar: boolean, people: IssuePerson[]): TeamMember[] =>
  people.map((p, i) => ({ id: p.id, name: p.name, email: `${["layla", "omar", "nora", "sami"][i] ?? `user${i}`}@nasaq.example`, role: i === 0 ? "owner" : i === 1 ? "manager" : "member", joinedAt: ago((60 - i * 10) * DAY), lastActive: ago((i + 1) * 3 * HOUR) }));

const integrations = (ar: boolean): ProjectIntegration[] => [
  { id: "github", name: "GitHub", description: ar ? "الإيداعات وطلبات الدمج وتشغيلات المسارات." : "Commits, pull requests and workflow runs.", connected: true, icon: <GitBranch /> },
  { id: "slack", name: "Slack", description: ar ? "إشعارات المهام في قناة الفريق." : "Issue updates in the team channel.", connected: false, icon: <MessageSquare /> },
  { id: "calendar", name: ar ? "التقويم" : "Calendar", description: ar ? "مواعيد الاستحقاق في تقويمك." : "Due dates in your calendar.", connected: false, icon: <Calendar /> },
  { id: "push", name: ar ? "إشعارات الجوال" : "Mobile push", description: ar ? "تنبيهات فورية للإشارات." : "Instant alerts for mentions.", connected: true, icon: <Bell /> },
];

const feeds = (ar: boolean) => ({
  pulls: [
    { id: "pr1", number: 412, title: ar ? "ملخص الدفع الجديد" : "New checkout summary", author: { login: "nora-s" }, state: "open", createdAt: ago(1 * DAY), head: "feat/summary", base: "main" },
    { id: "pr2", number: 405, title: ar ? "توحيد أنماط الجدول" : "Unify table styles", author: { login: "layla-h" }, state: "merged", createdAt: ago(6 * DAY), mergedAt: ago(4 * DAY), mergedBy: { login: "omar-n" }, head: "chore/tables", base: "main" },
  ] as GithubPull[],
  commits: [
    { id: "9f2c1d47a0b8e5c3d6f1a2b3c4d5e6f708192a3b", message: "feat(summary): add discount and tax lines\n\nCloses NSQ-101", author: { login: "nora-s" }, date: ago(5 * HOUR), branch: "feat/summary", checks: "success" },
    { id: "3ab8e5d10c2f4a67b8c9d0e1f2a3b4c5d6e7f809", message: "fix(summary): keep total visible while scrolling", author: { login: "nora-s" }, date: ago(1 * DAY), branch: "feat/summary", checks: "pending" },
    { id: "b71e09c2d4f65a8390b1c2d3e4f5a6b7c8d9e0f1", message: "chore: bump stripe sdk", author: { login: "omar-n" }, date: ago(3 * DAY), branch: "main", checks: "success" },
  ] as GithubCommit[],
  runs: [
    { id: "r1", name: "CI", number: 1873, status: "success", branch: "feat/summary", sha: "9f2c1d4", event: "push", actor: { login: "nora-s" }, startedAt: ago(5 * HOUR), durationMs: 184_000 },
    { id: "r2", name: "CI", number: 1869, status: "failure", branch: "main", sha: "b71e09c", event: "push", actor: { login: "omar-n" }, startedAt: ago(3 * DAY), durationMs: 96_000 },
  ] as GithubRun[],
});

type Extras = Pick<ProjectViewProps, "memory" | "vault" | "github" | "settings">;

/** The state and handlers behind the Memory, Vault, GitHub and Settings tabs. */
export function useProjectExtras(ar: boolean, people: IssuePerson[], me: IssuePerson): Extras {
  const [memory, setMemory] = useState(() => memories(ar));
  const [list, setList] = useState(() => secrets(ar));
  const [log, setLog] = useState<VaultAccessEvent[]>(() => [{ id: "l1", secretName: "STRIPE_SECRET_KEY", actor: people[2]?.name ?? "Nora", action: "reveal", at: ago(2 * HOUR), address: "10.0.4.12" }]);
  const values = useRef<Record<string, string>>({ s1: "sk_demo_0000nasaq4f2a", s2: "whsec_demo9c1e", s3: "postgres://oasis:demo@db.internal/oasis", s4: "-----BEGIN OPENSSH PRIVATE KEY-----demo" });
  const [env, setEnv] = useState(envs);
  const [environment, setEnvironment] = useState("production");
  const [repo, setRepo] = useState<RepositoryPickerValue>({ repo: REPOS[0]!, branch: "main" });
  const [members, setMembers] = useState(() => teamMembers(ar, people));
  const [invites, setInvites] = useState<PendingInvite[]>(() => [{ id: "iv1", email: "client@oasis.example", role: "viewer", invitedBy: people[0]?.name, sentAt: ago(2 * DAY), expiresAt: ago(-5 * DAY) }]);
  const [tools, setTools] = useState(() => integrations(ar));
  const n = useRef(100);
  const next = (p: string) => `${p}${n.current++}`;

  const record = (secretName: string, action: VaultAccessEvent["action"]) => setLog((all) => [{ id: next("l"), secretName, actor: me.name, action, at: Date.now(), address: "10.0.4.12" }, ...all]);
  const feed = feeds(ar);
  const slug = (r: PickerRepo | null) => (r ? { owner: r.fullName.split("/")[0]!, name: r.fullName.split("/")[1]! } : null);

  return {
    memory: {
      items: memory,
      onSave: async (input: ProjectMemoryInput, id?: string) => {
        await wait(350);
        setMemory((all) => (id ? all.map((m) => (m.id === id ? { ...m, ...input } : m)) : [{ id: next("m"), ...input, at: Date.now() }, ...all]));
      },
      onForget: async (id: string) => {
        await wait(300);
        setMemory((all) => all.filter((m) => m.id !== id));
      },
    },
    vault: {
      secrets: list,
      accessLog: log,
      onReveal: async (id, purpose) => {
        await wait(350);
        const s = list.find((x) => x.id === id);
        if (!s) return { error: ar ? "لم يُعثر على السر" : "Secret not found" };
        record(s.name, purpose === "copy" ? "copy" : "reveal");
        return { value: values.current[id] ?? "" };
      },
      onSave: async (input: VaultSecretInput, id?: string) => {
        await wait(400);
        if (id) {
          const cur = list.find((s) => s.id === id);
          if (input.value) values.current[id] = input.value;
          setList((all) => all.map((s) => (s.id === id ? { ...s, name: input.name, group: input.group, kind: input.kind, description: input.description, expiresAt: input.expiresAt, updatedAt: Date.now(), hint: input.value ? `…${input.value.slice(-4)}` : s.hint } : s)));
          record(cur?.name ?? input.name, "update");
        } else {
          const sid = next("s");
          values.current[sid] = input.value;
          setList((all) => [{ id: sid, name: input.name, group: input.group, kind: input.kind, description: input.description, expiresAt: input.expiresAt, updatedAt: Date.now(), hint: `…${input.value.slice(-4)}` }, ...all]);
          record(input.name, "create");
        }
      },
      onDelete: async (id) => {
        await wait(300);
        const s = list.find((x) => x.id === id);
        setList((all) => all.filter((x) => x.id !== id));
        if (s) record(s.name, "delete");
      },
      env: {
        variables: env[environment] ?? [],
        environments: [
          { id: "development", label: ar ? "التطوير" : "Development" },
          { id: "production", label: ar ? "الإنتاج" : "Production" },
        ],
        environment,
        onEnvironmentChange: setEnvironment,
        onSave: async (variable, previousKey) => {
          await wait(300);
          setEnv((all) => {
            const cur = all[environment] ?? [];
            return { ...all, [environment]: previousKey ? cur.map((v) => (v.key === previousKey ? variable : v)) : [...cur, variable] };
          });
        },
        onDelete: async (key) => {
          await wait(250);
          setEnv((all) => ({ ...all, [environment]: (all[environment] ?? []).filter((v) => v.key !== key) }));
        },
      },
    },
    github: {
      repo: slug(repo.repo),
      picker: {
        value: repo,
        onChange: setRepo,
        searchRepositories: async (q) => {
          await wait(300);
          return REPOS.filter((r) => r.fullName.includes(q.trim().toLowerCase()));
        },
        loadBranches: async (r): Promise<PickerBranch[]> => {
          await wait(250);
          return [{ name: r.defaultBranch ?? "main", default: true, protected: true }, { name: "develop" }, { name: "feat/summary" }];
        },
        account: { login: "nasaq" },
        onConfigure: () => undefined,
      },
      commits: repo.repo ? feed.commits : [],
      pulls: repo.repo ? feed.pulls : [],
      runs: repo.repo ? feed.runs : [],
      onRefresh: async () => {
        await wait(600);
      },
    },
    settings: {
      members: {
        members,
        invites,
        roles: roles(ar),
        currentUserId: people[0]?.id,
        canManage: true,
        onInvite: async ({ emails, role }) => {
          await wait(400);
          setInvites((all) => [...emails.map((email) => ({ id: next("iv"), email, role, invitedBy: people[0]?.name, sentAt: Date.now(), expiresAt: iso(7) })), ...all]);
        },
        onChangeRole: async (member, role) => {
          await wait(300);
          setMembers((all) => all.map((m) => (m.id === member.id ? { ...m, role } : m)));
        },
        onRemove: async (member) => {
          await wait(300);
          setMembers((all) => all.filter((m) => m.id !== member.id));
        },
        onResendInvite: async () => {
          await wait(300);
        },
        onRevokeInvite: async (invite) => {
          await wait(300);
          setInvites((all) => all.filter((i) => i.id !== invite.id));
        },
      },
      integrations: tools,
      onToggleIntegration: async (id, connected) => {
        await wait(400);
        setTools((all) => all.map((t) => (t.id === id ? { ...t, connected } : t)));
      },
      onArchive: async () => {
        await wait(500);
      },
      onDelete: async () => {
        await wait(500);
      },
    },
  };
}
