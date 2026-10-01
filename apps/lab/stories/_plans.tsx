/* Sample plans shared by the pricing, plan-card and upgrade stories. Prices are illustrative. */
import { type PlanComparisonSection, type PricingPlan, useNasaq } from "@nasaq/web";

const EN: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    description: "For one person trying it out.",
    monthly: 0,
    features: ["3 projects", "Time tracking", "Feedback widget", { label: "Client portal", included: false }, { label: "AI agents on the board", included: false }],
    footnote: "No card required",
  },
  {
    id: "team",
    name: "Team",
    description: "For studios and product teams.",
    monthly: 15,
    yearly: 12,
    perSeat: true,
    highlighted: true,
    badge: "Most popular",
    trialDays: 14,
    featuresTitle: "Everything in Free, plus",
    features: ["Unlimited projects", "Client portal", "Invoices from time", { label: "AI usage billing", hint: "Pass AI cost through to clients with your markup." }, { label: "AI agents on the board", included: false }],
    footnote: "14 days free, then billed per seat",
  },
  {
    id: "agency",
    name: "Agency",
    description: "Many clients, AI agents on the board.",
    monthly: 29,
    yearly: 24,
    perSeat: true,
    featuresTitle: "Everything in Team, plus",
    features: ["MCP and AI agents", "Custom domains", "Priority support", "Audit log"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Security reviews and volume pricing.",
    custom: "Custom",
    featuresTitle: "Everything in Agency, plus",
    features: ["SSO and SCIM", "99.9% uptime SLA", "Dedicated success manager"],
  },
];

const AR: PricingPlan[] = [
  {
    id: "free",
    name: "مجاني",
    description: "لشخص واحد يجرّب المنتج.",
    monthly: 0,
    features: ["٣ مشاريع", "تتبّع الوقت", "أداة الملاحظات", { label: "بوابة العملاء", included: false }, { label: "وكلاء الذكاء الاصطناعي", included: false }],
    footnote: "لا حاجة لبطاقة",
  },
  {
    id: "team",
    name: "فريق",
    description: "للاستوديوهات وفرق المنتجات.",
    monthly: 15,
    yearly: 12,
    perSeat: true,
    highlighted: true,
    badge: "الأكثر شيوعًا",
    trialDays: 14,
    featuresTitle: "كل ما في المجاني، بالإضافة إلى",
    features: ["مشاريع غير محدودة", "بوابة العملاء", "فواتير من الوقت المسجّل", { label: "فوترة استخدام الذكاء الاصطناعي", hint: "حمّل تكلفة الذكاء الاصطناعي على عملائك مع هامشك." }, { label: "وكلاء الذكاء الاصطناعي", included: false }],
    footnote: "١٤ يومًا مجانًا، ثم الدفع لكل مقعد",
  },
  {
    id: "agency",
    name: "وكالة",
    description: "عملاء كثيرون ووكلاء ذكاء اصطناعي.",
    monthly: 29,
    yearly: 24,
    perSeat: true,
    featuresTitle: "كل ما في الفريق، بالإضافة إلى",
    features: ["MCP ووكلاء الذكاء الاصطناعي", "نطاقات مخصّصة", "دعم ذو أولوية", "سجل التدقيق"],
  },
  {
    id: "enterprise",
    name: "مؤسسة",
    description: "مراجعات أمنية وأسعار للكميات.",
    custom: "حسب الطلب",
    featuresTitle: "كل ما في الوكالة، بالإضافة إلى",
    features: ["دخول موحّد وSCIM", "اتفاقية تشغيل ٩٩٫٩٪", "مدير نجاح مخصّص"],
  },
];

const V = (free: boolean | string, team: boolean | string, agency: boolean | string, enterprise: boolean | string) => ({ free, team, agency, enterprise });

const SECTIONS_EN: PlanComparisonSection[] = [
  {
    title: "Projects",
    rows: [
      { label: "Projects", values: V("3", "Unlimited", "Unlimited", "Unlimited") },
      { label: "Guests per project", values: V("2", "10", "Unlimited", "Unlimited") },
      { label: "Client portal", values: V(false, true, true, true) },
      { label: "Custom domains", values: V(false, false, true, true) },
    ],
  },
  {
    title: "Billing",
    rows: [
      { label: "Time tracking", values: V(true, true, true, true) },
      { label: "Invoices from time", values: V(false, true, true, true) },
      { label: "AI usage billing", hint: "Pass AI cost through to clients with your markup.", values: V(false, true, true, true) },
    ],
  },
  {
    title: "AI and automation",
    rows: [
      { label: "MCP server", values: V(false, false, true, true) },
      { label: "AI agents on the board", values: V(false, false, true, true) },
    ],
  },
  {
    title: "Security and support",
    rows: [
      { label: "Audit log", values: V(false, false, "90 days", "Unlimited") },
      { label: "SSO and SCIM", hint: "SAML or OIDC sign-in, and user provisioning.", values: V(false, false, false, true) },
      { label: "Support", values: V("Community", "Email", "Priority", "Dedicated") },
    ],
  },
];

const SECTIONS_AR: PlanComparisonSection[] = [
  {
    title: "المشاريع",
    rows: [
      { label: "المشاريع", values: V("٣", "غير محدود", "غير محدود", "غير محدود") },
      { label: "الضيوف لكل مشروع", values: V("٢", "١٠", "غير محدود", "غير محدود") },
      { label: "بوابة العملاء", values: V(false, true, true, true) },
      { label: "نطاقات مخصّصة", values: V(false, false, true, true) },
    ],
  },
  {
    title: "الفوترة",
    rows: [
      { label: "تتبّع الوقت", values: V(true, true, true, true) },
      { label: "فواتير من الوقت المسجّل", values: V(false, true, true, true) },
      { label: "فوترة استخدام الذكاء الاصطناعي", values: V(false, true, true, true) },
    ],
  },
  {
    title: "الدعم",
    rows: [
      { label: "الدخول الموحّد", values: V(false, false, false, true) },
      { label: "الدعم", values: V("المجتمع", "البريد", "أولوية", "مخصّص") },
    ],
  },
];

/** The four sample plans and the comparison rows, in the lab's current language. */
export function useSamplePlans() {
  const ar = useNasaq().locale.startsWith("ar");
  return { plans: ar ? AR : EN, sections: ar ? SECTIONS_AR : SECTIONS_EN, ar };
}

/** A pretend checkout: resolves after a second so the busy state is visible. */
export const fakeCheckout = () => new Promise((resolve) => setTimeout(resolve, 1200));
