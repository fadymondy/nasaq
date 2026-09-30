/* Fake people, mention options and async callbacks shared by the batch-X1 stories (onboarding, lock, session, account cards). Nothing here talks to a server. */
import { type MentionOption, type PersonProfile, useNasaq } from "@nasaq/web";

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const useAr = () => useNasaq().locale.startsWith("ar");

/** A fixed moment so local times read the same in every screenshot. */
export const X1_NOW = new Date(Date.UTC(2026, 8, 30, 10, 41));

/** The person looking at the screen. Riyadh, so the others read as "ahead" or "behind". */
export const VIEWER_ZONE = "Asia/Riyadh";

export const people = (ar: boolean): PersonProfile[] => [
  {
    id: "u1",
    name: ar ? "سارة الناصر" : "Sara Nasser",
    handle: "sara",
    email: "sara@example.com",
    role: ar ? "قائدة التصميم" : "Design lead",
    presence: "online",
    statusText: ar ? "أعمل على النظام البصري" : "Working on the visual system",
    timeZone: "Asia/Riyadh",
    teams: ar ? ["التصميم"] : ["Design"],
    location: ar ? "الرياض" : "Riyadh",
  },
  {
    id: "u2",
    name: ar ? "عمر حداد" : "Omar Haddad",
    handle: "omar",
    email: "omar@example.com",
    role: ar ? "مهندس واجهات" : "Frontend engineer",
    presence: "busy",
    statusText: ar ? "في اجتماع" : "In a meeting",
    timeZone: "Europe/Berlin",
    teams: ar ? ["الهندسة", "المنصة"] : ["Engineering", "Platform"],
    location: ar ? "برلين" : "Berlin",
  },
  {
    id: "u3",
    name: ar ? "لينا منصور" : "Lina Mansour",
    handle: "lina",
    email: "lina@example.com",
    role: ar ? "ضمان الجودة" : "QA engineer",
    presence: "away",
    timeZone: "America/New_York",
    teams: ar ? ["الجودة"] : ["Quality"],
    location: "New York",
  },
  {
    id: "u4",
    name: ar ? "خالد سامي" : "Khaled Sami",
    handle: "khaled",
    email: "khaled@example.com",
    role: ar ? "مدير المنتج" : "Product manager",
    presence: "offline",
    timeZone: "Asia/Kolkata",
    teams: ar ? ["المنتج"] : ["Product"],
    location: ar ? "مومباي" : "Mumbai",
  },
  {
    id: "u5",
    name: ar ? "نور عادل" : "Nour Adel",
    handle: "nour",
    email: "nour@example.com",
    role: ar ? "مسؤولة العمليات" : "Operations",
    presence: "online",
    timeZone: "Asia/Riyadh",
    teams: ar ? ["العمليات"] : ["Operations"],
  },
];

/** Options for the mention picker: people, then teams and groups. */
export const mentionOptions = (ar: boolean): MentionOption[] => [
  ...people(ar).map((p): MentionOption => ({ id: p.id, name: p.name, description: p.role, handle: p.handle, presence: p.presence, keywords: p.teams })),
  { id: "t-design", name: ar ? "التصميم" : "Design", kind: "team", description: ar ? "فريق · ٤ أعضاء" : "Team · 4 members", keywords: ["ux", "ui"] },
  { id: "t-eng", name: ar ? "الهندسة" : "Engineering", kind: "team", description: ar ? "فريق · ٩ أعضاء" : "Team · 9 members", keywords: ["dev", "code"] },
  { id: "g-all", name: ar ? "الجميع" : "everyone", kind: "group", description: ar ? "كل من في مساحة العمل" : "Everyone in the workspace" },
  { id: "g-oncall", name: ar ? "المناوبون" : "on-call", kind: "group", description: ar ? "المناوب الحالي" : "Whoever is on call now" },
];

/** Finds the person or kind behind a mention id, for `MentionText`. */
export const resolveMention = (ar: boolean) => (id: string) => {
  const person = people(ar).find((p) => p.id === id);
  if (person) return { person };
  return id.startsWith("g-") ? { kind: "group" as const } : { kind: "team" as const };
};

/** Fake step save: 700ms. A workspace called "taken" is refused, to show the error path. */
export async function fakeSave(ar: boolean, refuse?: string): Promise<{ error: string } | undefined> {
  await sleep(700);
  if (refuse && refuse.toLowerCase() === "taken") return { error: ar ? "اسم مساحة العمل هذا مستخدم. جرّب اسمًا آخر." : "That workspace name is taken. Try another." };
}

export const DEMO_PASSWORD = "nasaq123";
