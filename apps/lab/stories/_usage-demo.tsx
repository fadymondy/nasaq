/* Fake usage, limits, catalog, AI cost and routing data plus the page demos built on them. Nothing here talks to a server. */
import {
  type AdminPlan,
  type AiCostDay,
  type AiCostRow,
  type AiModel,
  AiModelPicker,
  AiUsageCost,
  BudgetBurn,
  type LimitResource,
  type LimitRules,
  LimitsEditor,
  ModelRoutingEditor,
  type PlanCatalog,
  PlanCatalogEditor,
  type RegisterProviderInput,
  type RoutingModel,
  type RoutingProvider,
  type RoutingTaskClass,
  type RoutingValue,
  TokenCostMeter,
  type UsageItem,
  UsageSummary,
} from "@nasaq/web";
import { useState } from "react";
import { BillingPage } from "./_billing-demo";
import { useAr, wait } from "./_profile-demo";

/* ------------------------------------------------------------------ usage */

export const usageItems = (ar: boolean): UsageItem[] => [
  { id: "seats", label: ar ? "المقاعد" : "Seats", used: 18, limit: 25, unit: ar ? "مقعد" : "seats" },
  { id: "storage", label: ar ? "التخزين" : "Storage", used: 92, limit: 100, unit: "GB", overageRate: 0.2 },
  { id: "calls", label: ar ? "استدعاءات الواجهة" : "API calls", used: 1_260_000, limit: 1_000_000, unit: ar ? "استدعاء" : "calls", overageRate: 0.000_4 },
  { id: "ai", label: ar ? "إنفاق الذكاء الاصطناعي" : "AI spend", used: 41.5, limit: 200, kind: "money" },
  { id: "projects", label: ar ? "المشاريع" : "Projects", used: 12, limit: null, unit: ar ? "مشروع" : "projects" },
  { id: "hours", label: ar ? "ساعات الدعم" : "Support hours", used: 6.5, limit: 10, kind: "hours" },
];

export function PlanUsageDemo() {
  const ar = useAr();
  return (
    <BillingPage title={ar ? "الاستخدام" : "Plan usage"} description={ar ? "ما استهلكته هذا الشهر مقابل حدود باقتك." : "What you have used this month against your plan limits."}>
      <UsageSummary planName={ar ? "الفريق" : "Team"} period={ar ? "١ إلى ٣٠ سبتمبر" : "1 Sep to 30 Sep"} items={usageItems(ar)} currency="USD" onUpgrade={() => undefined} />
      <BudgetBurn hours={{ used: 46, budget: 80 }} money={{ used: 1900, budget: 4000 }} elapsed={0.6} />
    </BillingPage>
  );
}

/* ------------------------------------------------------------------ limits */

export const limitResources = (ar: boolean): LimitResource[] => [
  { key: "seats", label: ar ? "المقاعد" : "Seats", unit: ar ? "مقعد" : "seats" },
  { key: "storage", label: ar ? "التخزين" : "Storage", unit: "GB" },
  { key: "calls", label: ar ? "استدعاءات الواجهة" : "API calls", unit: ar ? "استدعاء" : "calls" },
  { key: "ai", label: ar ? "إنفاق الذكاء الاصطناعي" : "AI spend", unit: "USD" },
];

export const limitRules: LimitRules = {
  seats: { mode: "limit", value: 25, price: 12, overage: 15 },
  storage: { mode: "limit", value: 100, overage: 0.2, rateLimit: 600, spendLimit: 250 },
  calls: { mode: "inherit" },
  ai: { mode: "unlimited" },
};

export function LimitsDemo({ pricing = true, keyLimits = true }: { pricing?: boolean; keyLimits?: boolean }) {
  const ar = useAr();
  return (
    <LimitsEditor
      resources={limitResources(ar)}
      defaultValue={limitRules}
      inherited={{ seats: 10, storage: 50, calls: 1_000_000, ai: 100 }}
      showPricing={pricing}
      showKeyLimits={keyLimits}
      onSave={async () => {
        await wait(600);
      }}
    />
  );
}

export function LimitsPageDemo() {
  const ar = useAr();
  return (
    <BillingPage title={ar ? "حدود الباقة" : "Plan limits"} description={ar ? "حدود الاستخدام والتسعير الزائد لباقة الفريق." : "Usage limits and overage pricing for the Team plan."}>
      <LimitsDemo />
    </BillingPage>
  );
}

/* ------------------------------------------------------------------ catalog */

export const catalogPlans = (ar: boolean): AdminPlan[] => [
  { id: "starter", name: ar ? "المبتدئ" : "Starter", priceMonthly: 0, seats: 3, storageGb: 5, features: [ar ? "مشروع واحد" : "1 project"], visible: true, subscribers: 412 },
  { id: "team", name: ar ? "الفريق" : "Team", priceMonthly: 29, seats: 25, storageGb: 100, features: [ar ? "مشاريع غير محدودة" : "Unlimited projects", ar ? "دعم بالأولوية" : "Priority support"], visible: true, subscribers: 187, featured: true },
  { id: "business", name: ar ? "الأعمال" : "Business", priceMonthly: 99, seats: null, storageGb: null, features: [ar ? "تسجيل دخول موحّد" : "SSO", ar ? "سجل التدقيق" : "Audit log"], visible: true, subscribers: 34 },
];

export const catalog = (ar: boolean): PlanCatalog => ({
  apps: [
    { id: "docs", name: ar ? "المستندات" : "Docs", enabled: true },
    { id: "crm", name: ar ? "إدارة العملاء" : "CRM", enabled: true },
    { id: "ai", name: ar ? "المساعد الذكي" : "AI Assistant", enabled: false },
  ],
  features: [
    { id: "sso", name: ar ? "تسجيل دخول موحّد" : "Single sign-on" },
    { id: "audit", name: ar ? "سجل التدقيق" : "Audit log" },
    { id: "pipelines", name: ar ? "مسارات المبيعات" : "Sales pipelines", appId: "crm" },
  ],
  plans: catalogPlans(ar),
  payg: [
    { id: "calls", name: ar ? "استدعاءات الواجهة" : "API calls", unit: ar ? "١٠٠٠ استدعاء" : "1K calls", unitPrice: 0.4, freeUnits: 1000 },
    { id: "storage", name: ar ? "تخزين إضافي" : "Extra storage", unit: "GB", unitPrice: 0.2 },
  ],
  bundles: [{ id: "growth", name: ar ? "حزمة النمو" : "Growth bundle", price: 59, appIds: ["docs", "crm"] }],
});

export function CatalogDemo() {
  const ar = useAr();
  const [live] = useState(() => catalog(ar));
  return (
    <PlanCatalogEditor
      catalog={live}
      onApply={async () => {
        await wait(800);
      }}
    />
  );
}

export function CatalogPageDemo() {
  const ar = useAr();
  return (
    <BillingPage wide title={ar ? "كتالوج الباقات" : "Plan catalog"} description={ar ? "عدّل المسودة، راجع المزامنة، ثم انشرها." : "Edit the draft, review the sync, then publish it."}>
      <CatalogDemo />
    </BillingPage>
  );
}

/* ------------------------------------------------------------------ AI cost */

const isoDay = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const costDays: AiCostDay[] = Array.from({ length: 14 }, (_, i) => {
  const n = 13 - i;
  const base = 14 + ((i * 7) % 11) + (i > 9 ? 6 : 0);
  return { date: isoDay(n), billed: n > 3 ? base : 0, unbilled: n > 3 ? 0 : base };
});

export const costByModel: AiCostRow[] = [
  { id: "opus", label: "Opus 5.5", tokensIn: 3_100_000, tokensOut: 420_000, cost: 118.4, previous: 96 },
  { id: "sonnet", label: "Sonnet 5.5", tokensIn: 9_800_000, tokensOut: 1_350_000, cost: 61.2, previous: 70 },
  { id: "haiku", label: "Haiku 4.5", tokensIn: 21_000_000, tokensOut: 2_900_000, cost: 22.7, previous: 19 },
  { id: "fable", label: "Fable 5.1", tokensIn: 1_200_000, tokensOut: 260_000, cost: 8.9 },
];

export const costByProduct = (ar: boolean): AiCostRow[] => [
  { id: "chat", label: ar ? "المحادثة" : "Chat", tokensIn: 14_000_000, tokensOut: 2_100_000, cost: 92 },
  { id: "search", label: ar ? "البحث الذكي" : "Smart search", tokensIn: 12_000_000, tokensOut: 900_000, cost: 48.3 },
  { id: "agents", label: ar ? "الوكلاء" : "Agents", tokensIn: 9_100_000, tokensOut: 1_930_000, cost: 70.9 },
];

export const costByRun: AiCostRow[] = [
  { id: "run_8f21", label: "run_8f21 · nightly-report", tokensIn: 1_900_000, tokensOut: 220_000, cost: 34.1 },
  { id: "run_8f18", label: "run_8f18 · triage", tokensIn: 640_000, tokensOut: 90_000, cost: 4.6 },
  { id: "run_8f10", label: "run_8f10 · import-clean", tokensIn: 2_400_000, tokensOut: 180_000, cost: 12.8 },
];

export function AiCostDemo({ loading = false }: { loading?: boolean }) {
  const ar = useAr();
  return <AiUsageCost days={costDays} byModel={costByModel} byProduct={costByProduct(ar)} byRun={costByRun} markup={0.2} previousTotal={190} loading={loading} />;
}

export function AiCostPageDemo() {
  const ar = useAr();
  return (
    <BillingPage wide title={ar ? "تكلفة الذكاء الاصطناعي" : "AI costs"} description={ar ? "الإنفاق والرموز خلال آخر ١٤ يومًا." : "Spend and tokens over the last 14 days."}>
      <AiCostDemo />
      <div className="max-w-xl">
        <TokenCostMeter tokensIn={182_000} tokensOut={24_000} cached={120_000} cost={1.42} budget={2} />
      </div>
    </BillingPage>
  );
}

/* ------------------------------------------------------------------ models and routing */

export const pickerModels: AiModel[] = [
  { id: "opus-5.5", label: "Opus 5.5", provider: "Anthropic", tier: "flagship", efforts: ["low", "medium", "high", "max"], contextWindow: 1_000_000, price: { input: 15, output: 75 } },
  { id: "sonnet-5.5", label: "Sonnet 5.5", provider: "Anthropic", tier: "balanced", efforts: ["low", "medium", "high"], contextWindow: 500_000, price: { input: 3, output: 15 } },
  { id: "haiku-4.5", label: "Haiku 4.5", provider: "Anthropic", tier: "fast", contextWindow: 200_000, price: { input: 0.8, output: 4 } },
  { id: "fable-5.1", label: "Fable 5.1", provider: "Anthropic", tier: "balanced", efforts: ["low", "high"], contextWindow: 300_000, price: { input: 2, output: 10 } },
  { id: "open-large", label: "Open Large 70B", provider: "Self-hosted", tier: "balanced", contextWindow: 128_000 },
];

export const pickerAgents = (ar: boolean) => [
  { id: "reviewer", label: ar ? "مراجع الشيفرة" : "Code reviewer", description: ar ? "يراجع التغييرات" : "Reviews changes" },
  { id: "analyst", label: ar ? "محلل البيانات" : "Data analyst" },
  { id: "writer", label: ar ? "كاتب المحتوى" : "Content writer" },
];

export const routingModels: RoutingModel[] = [
  { id: "opus-5.5", label: "Opus 5.5", modalities: ["text", "vision"] },
  { id: "sonnet-5.5", label: "Sonnet 5.5", modalities: ["text", "vision"] },
  { id: "haiku-4.5", label: "Haiku 4.5", modalities: ["text"] },
  { id: "fable-5.1", label: "Fable 5.1", modalities: ["text", "image"] },
  { id: "embed-small", label: "Embed Small", modalities: ["embedding"] },
  { id: "open-large", label: "Open Large 70B", modalities: ["text"] },
];

export const routingTasks = (ar: boolean): RoutingTaskClass[] => [
  { id: "chat", label: ar ? "المحادثة" : "Chat", description: ar ? "ردود تفاعلية للمستخدمين" : "Interactive replies to users" },
  { id: "summaries", label: ar ? "الملخصات" : "Summaries", description: ar ? "تلخيص المستندات الطويلة" : "Condensing long documents" },
  { id: "vision", label: ar ? "فهم الصور" : "Image understanding", modality: "vision" },
  { id: "search", label: ar ? "فهرسة البحث" : "Search indexing", modality: "embedding" },
];

export const routingProviders: RoutingProvider[] = [
  { id: "cloud", name: "Anthropic API", kind: "cloud", endpoint: "https://api.anthropic.com", modalities: ["text", "vision"], status: "online" },
  { id: "node-1", name: "gpu-node-01", kind: "node", endpoint: "http://10.0.4.12:8080", modalities: ["text", "embedding"], status: "online" },
  { id: "node-2", name: "gpu-node-02", kind: "node", endpoint: "http://10.0.4.13:8080", modalities: ["text"], status: "offline" },
];

export const routingValue: RoutingValue = {
  auto: false,
  routes: {
    chat: { model: "sonnet-5.5", fallback: "haiku-4.5" },
    summaries: { model: "haiku-4.5" },
    vision: { model: "opus-5.5", fallback: "sonnet-5.5" },
    search: { model: "embed-small" },
  },
  backend: "cloud",
};

export function RoutingDemo() {
  const ar = useAr();
  const [providers, setProviders] = useState<RoutingProvider[]>(routingProviders);
  return (
    <ModelRoutingEditor
      taskClasses={routingTasks(ar)}
      models={routingModels}
      providers={providers}
      defaultValue={routingValue}
      onSave={async () => {
        await wait(600);
      }}
      onRegisterProvider={async (input: RegisterProviderInput) => {
        await wait(500);
        setProviders((list) => [...list, { id: `p-${list.length + 1}`, name: input.name, kind: input.kind, endpoint: input.endpoint, modalities: input.modalities, status: "online" }]);
      }}
      onRemoveProvider={(id) => setProviders((list) => list.filter((p) => p.id !== id))}
    />
  );
}

export function RoutingPageDemo() {
  const ar = useAr();
  return (
    <BillingPage wide title={ar ? "توجيه النماذج" : "Model routing"} description={ar ? "حدّد أي نموذج يتولى كل مهمة وأين يعمل." : "Choose which model handles each task and where it runs."}>
      <RoutingDemo />
      <div className="flex flex-col gap-2">
        <h2 className="text-h3 text-foreground">{ar ? "تشغيل تجريبي" : "Test run"}</h2>
        <AiModelPicker variant="compact" models={pickerModels} agents={pickerAgents(ar)} />
      </div>
    </BillingPage>
  );
}
