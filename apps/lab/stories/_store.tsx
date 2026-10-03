/*
 * Shared fixtures for the store screens (CircleXO App Store, Mahaam product page): the product family as
 * listed in the store, CircleXO's own apps, bundles, install state and the store header. The pieces
 * themselves are catalogue components (ProductCard, Spotlight, InstallButton…); this file is only data and
 * wiring. Names and taglines come from each product's landing; ratings, install counts, bundle prices and
 * the prices of Mahaam, Zekra, Moharrik and Hosbah are illustrative.
 */
import type { BrandKey } from "@nasaq/brands";
import {
  AppHeader,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Input,
  InstallButton,
  type InstallButtonProps,
  type InstallState,
  Separator,
  SidebarTrigger,
  toast,
  useNasaq,
} from "@nasaq/web";
import {
  BookOpenCheck,
  CalendarCheck,
  ChartColumn,
  Code,
  Contact,
  CreditCard,
  HeartPulse,
  LayoutGrid,
  type LucideIcon,
  Package,
  PackageCheck,
  ReceiptText,
  Search,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Store,
  Truck,
  UsersRound,
  Warehouse,
  Workflow,
} from "lucide-react";
import { createContext, type ReactNode, use, useMemo, useState } from "react";

export type Bi = { en: string; ar: string };
export type Lang = keyof Bi;

export function useLang(): Lang {
  return useNasaq().locale.startsWith("ar") ? "ar" : "en";
}

export const S = {
  workspace: { en: "3x1", ar: "3x1" },
  store: { en: "App Store", ar: "متجر التطبيقات" },
  categories: { en: "Categories", ar: "الفئات" },
  search: { en: "Search apps", ar: "ابحث في التطبيقات" },
  editorsPick: { en: "Editor's pick", ar: "اختيار المحرّر" },
  details: { en: "Details", ar: "التفاصيل" },
  installedToast: { en: "installed in 3x1", ar: "ثُبّت في 3x1" },
  freeTrial: { en: "14-day trial", ar: "تجربة 14 يومًا" },
  workspaces: { en: "workspaces", ar: "مساحة عمل" },
  recommended: { en: "Recommended for 3x1", ar: "مقترحة لـ 3x1" },
  recommendedHint: { en: "Based on Sales and POS, which you use every day.", ar: "بناءً على المبيعات ونقاط البيع التي تستخدمها يوميًا." },
  seeAll: { en: "See all", ar: "عرض الكل" },
  bundles: { en: "Bundles", ar: "الباقات" },
  bundlesHint: { en: "Apps that work better together, for less.", ar: "تطبيقات تعمل معًا بشكل أفضل، بسعر أقل." },
  getBundle: { en: "Get the bundle", ar: "احصل على الباقة" },
  essentials: { en: "Business essentials by CircleXO", ar: "أساسيات الأعمال من CircleXO" },
  essentialsHint: {
    en: "Every app is priced on its own. Dependencies install automatically.",
    ar: "كل تطبيق بسعره الخاص، والاعتماديات تُثبَّت تلقائيًا.",
  },
  new: { en: "New", ar: "جديد" },
  free: { en: "Free", ar: "مجاني" },
  noResults: { en: "No apps match. Try another category or search.", ar: "لا توجد تطبيقات مطابقة. جرّب فئة أو بحثًا آخر." },
} satisfies Record<string, Bi>;

export type CategoryId = "all" | "business" | "productivity" | "ai" | "automation" | "developer" | "bookings" | "health";

export const CATEGORIES: { id: CategoryId; icon: LucideIcon; label: Bi }[] = [
  { id: "all", icon: LayoutGrid, label: { en: "All", ar: "الكل" } },
  { id: "business", icon: Store, label: { en: "Business essentials", ar: "أساسيات الأعمال" } },
  { id: "productivity", icon: BookOpenCheck, label: { en: "Productivity", ar: "الإنتاجية" } },
  { id: "ai", icon: Sparkles, label: { en: "AI & agents", ar: "الذكاء الاصطناعي والوكلاء" } },
  { id: "automation", icon: Workflow, label: { en: "Automation & CRM", ar: "الأتمتة وإدارة العملاء" } },
  { id: "developer", icon: Code, label: { en: "Developer tools", ar: "أدوات المطوّرين" } },
  { id: "bookings", icon: CalendarCheck, label: { en: "Bookings", ar: "الحجوزات" } },
  { id: "health", icon: HeartPulse, label: { en: "Health", ar: "الصحة" } },
];

/** A price in USD per month; 0 is free. `trial` shows a trial line under paid apps. */
export type Price = { monthly: number; trial?: boolean };

export type Product = {
  id: string;
  brand: BrandKey;
  name: Bi;
  category: Exclude<CategoryId, "all" | "business">;
  tagline: Bi;
  price: Price;
  rating: number;
  installs: number;
  badge?: "new";
};

/** The product family, as listed in CircleXO. Names and taglines from each product's landing. */
export const PRODUCTS: Product[] = [
  {
    id: "mahaam",
    brand: "mahaam",
    name: { en: "Mahaam", ar: "مهام" },
    category: "productivity",
    tagline: { en: "Projects, tasks, time and invoices in one place.", ar: "المشاريع والمهام والوقت والفواتير في مكان واحد." },
    price: { monthly: 12, trial: true },
    rating: 4.8,
    installs: 2140,
  },
  {
    id: "moharrik",
    brand: "moharrik",
    name: { en: "Moharrik", ar: "محرّك" },
    category: "automation",
    tagline: {
      en: "Watches what happens around your business, acts on it and talks to your customers.",
      ar: "يراقب ما يحدث حول أعمالك، ويتصرّف بناءً عليه، ويتحدث إلى عملائك.",
    },
    price: { monthly: 19, trial: true },
    rating: 4.7,
    installs: 1380,
  },
  {
    id: "zekra",
    brand: "zekra",
    name: { en: "Zekra", ar: "ذكرى" },
    category: "ai",
    tagline: {
      en: "A memory organ for AI agents: what one session learns, the next one already knows.",
      ar: "عضو ذاكرة لوكلاء الذكاء الاصطناعي: ما تتعلّمه جلسة تعرفه التالية.",
    },
    price: { monthly: 9, trial: true },
    rating: 4.9,
    installs: 860,
    badge: "new",
  },
  {
    id: "seatfor",
    brand: "seatfor",
    name: { en: "SeatFor", ar: "SeatFor" },
    category: "bookings",
    tagline: {
      en: "Your own booking site and admin panel in minutes. Free until you grow.",
      ar: "موقع حجز خاص بنشاطك ولوحة إدارة خلال دقائق. مجاناً حتى تكبر.",
    },
    price: { monthly: 0 },
    rating: 4.6,
    installs: 3920,
  },
  {
    id: "hosbah",
    brand: "hosbah",
    name: { en: "Hosbah", ar: "حوسبة" },
    category: "developer",
    tagline: {
      en: "Bring a server, push your code. Zero-downtime deploys, rolled back in seconds.",
      ar: "أحضر خادمًا وادفع شيفرتك. نشر دون توقّف وتراجع في ثوانٍ.",
    },
    price: { monthly: 15, trial: true },
    rating: 4.7,
    installs: 640,
  },
  {
    id: "orchestra",
    brand: "orchestra",
    name: { en: "Orchestra", ar: "اوركيسترا" },
    category: "developer",
    tagline: {
      en: "The AI-agentic IDE framework: 290+ MCP tools for ten IDEs.",
      ar: "إطار بيئة التطوير الوكيلة: أكثر من 290 أداة MCP لعشر بيئات تطوير.",
    },
    price: { monthly: 0 },
    rating: 4.8,
    installs: 1210,
  },
  {
    id: "health-debug",
    brand: "health-debug",
    name: { en: "Health Debug", ar: "Health Debug" },
    category: "health",
    tagline: {
      en: "Debug your body. Proactive health tracking for people who sit at a desk all day.",
      ar: "صحّح جسدك. تتبّع صحي استباقي لمن يجلس أمام مكتبه طوال اليوم.",
    },
    price: { monthly: 0 },
    rating: 4.9,
    installs: 5310,
  },
];

export const product = (id: string) => PRODUCTS.find((p) => p.id === id)!;

export type BusinessApp = { id: string; icon: LucideIcon; name: Bi; tagline: Bi; price: number };

/** CircleXO's own apps, prices as published on its landing. They have no marks, so they show as glyphs. */
export const BUSINESS_APPS: BusinessApp[] = [
  { id: "contacts", icon: Contact, name: { en: "Contacts", ar: "جهات الاتصال" }, tagline: { en: "Customers, suppliers & people", ar: "العملاء والموردون والأشخاص" }, price: 0 },
  { id: "catalog", icon: Package, name: { en: "Catalog", ar: "الكتالوج" }, tagline: { en: "Products, variants & prices", ar: "المنتجات والمتغيّرات والأسعار" }, price: 0 },
  { id: "inventory", icon: Warehouse, name: { en: "Inventory", ar: "المخزون" }, tagline: { en: "Stock across warehouses", ar: "المخزون عبر المستودعات" }, price: 19 },
  { id: "sales", icon: ShoppingCart, name: { en: "Sales", ar: "المبيعات" }, tagline: { en: "Orders from every channel", ar: "طلبات من كل القنوات" }, price: 29 },
  { id: "pos", icon: ShoppingBag, name: { en: "POS", ar: "نقاط البيع" }, tagline: { en: "Touch point of sale", ar: "نقاط بيع باللمس" }, price: 39 },
  { id: "purchasing", icon: PackageCheck, name: { en: "Purchasing", ar: "المشتريات" }, tagline: { en: "Suppliers & goods receipts", ar: "الموردون وإيصالات الاستلام" }, price: 19 },
  { id: "invoicing", icon: ReceiptText, name: { en: "Invoicing", ar: "الفوترة" }, tagline: { en: "Receivables & payables", ar: "المدينون والدائنون" }, price: 19 },
  { id: "accounting", icon: BookOpenCheck, name: { en: "Accounting", ar: "المحاسبة" }, tagline: { en: "Double-entry ledger", ar: "قيد مزدوج" }, price: 29 },
  { id: "hr", icon: UsersRound, name: { en: "HR", ar: "الموارد البشرية" }, tagline: { en: "Employees, attendance, payroll", ar: "الموظفون والحضور والرواتب" }, price: 29 },
  { id: "reports", icon: ChartColumn, name: { en: "Reports", ar: "التقارير" }, tagline: { en: "Dashboards over your apps", ar: "لوحات فوق تطبيقاتك" }, price: 0 },
  { id: "payments", icon: CreditCard, name: { en: "Payments", ar: "المدفوعات" }, tagline: { en: "Gateways for your customers", ar: "بوابات لعملائك" }, price: 0 },
  { id: "shipping", icon: Truck, name: { en: "Shipping", ar: "الشحن" }, tagline: { en: "Carriers, called from Sales", ar: "شركات النقل من داخل المبيعات" }, price: 9 },
];

export type Bundle = { id: string; name: Bi; pitch: Bi; products: string[]; apps: string[]; price: number };

/** Bundle prices are illustrative. */
export const BUNDLES: Bundle[] = [
  {
    id: "retail",
    name: { en: "Retail starter", ar: "باقة التجزئة" },
    pitch: {
      en: "Catalog, stock, orders and a touch till, sharing one product list from day one.",
      ar: "الكتالوج والمخزون والطلبات ونقطة بيع باللمس، على قائمة منتجات واحدة من اليوم الأول.",
    },
    products: [],
    apps: ["catalog", "inventory", "sales", "pos"],
    price: 69,
  },
  {
    id: "agency",
    name: { en: "AI-native agency", ar: "وكالة بالذكاء الاصطناعي" },
    pitch: {
      en: "Run client projects, remember every decision and answer customers, with agents working over MCP.",
      ar: "أدر مشاريع العملاء، وتذكّر كل قرار، وأجب عملاءك، مع وكلاء يعملون عبر MCP.",
    },
    products: ["mahaam", "zekra", "moharrik"],
    apps: [],
    price: 32,
  },
];

// ─── Install state ────────────────────────────────────────────────────────────

const InstallContext = createContext<{ state: (id: string) => InstallState; install: (id: string, name: string) => void } | null>(null);

/** Holds which apps the workspace runs. 3x1 already runs Contacts, Catalog, Sales, POS and Mahaam. */
export function InstallProvider({ children }: { children: ReactNode }) {
  const lang = useLang();
  const [states, setStates] = useState<Record<string, InstallState>>({
    contacts: "installed",
    catalog: "installed",
    sales: "installed",
    pos: "installed",
  });
  const value = useMemo(
    () => ({
      state: (id: string) => states[id] ?? "available",
      install: (id: string, name: string) => {
        setStates((s) => ({ ...s, [id]: "installing" }));
        setTimeout(() => {
          setStates((s) => ({ ...s, [id]: "installed" }));
          toast.success(`${name} ${S.installedToast[lang]}`);
        }, 900);
      },
    }),
    [states, lang],
  );
  return <InstallContext value={value}>{children}</InstallContext>;
}

/** `InstallButton` wired to the workspace's install state. */
export function StoreInstall({ id, appName, ...props }: { id: string } & Omit<InstallButtonProps, "state" | "onInstall" | "onUpdate">) {
  const ctx = use(InstallContext);
  if (!ctx) throw new Error("<StoreInstall> outside <InstallProvider>");
  return <InstallButton state={ctx.state(id)} appName={appName} onInstall={() => ctx.install(id, appName)} onOpen={() => toast(`→ ${appName}`)} {...props} />;
}

// ─── Header ───────────────────────────────────────────────────────────────────

/** The shell header for store pages: sidebar trigger, "3x1 / App Store / …" and the store search. */
export function StoreHeader({ page, query, onQueryChange, onStore }: { page?: string; query?: string; onQueryChange?: (q: string) => void; onStore?: () => void }) {
  const lang = useLang();
  return (
    <AppHeader>
      <SidebarTrigger />
      <Separator orientation="vertical" className="me-1" />
      <Breadcrumb className="min-w-0">
        <BreadcrumbList>
          <BreadcrumbItem className="hidden sm:inline-flex">
            <BreadcrumbLink href="#">{S.workspace[lang]}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="hidden sm:block" />
          {page ? (
            <>
              <BreadcrumbItem className="hidden sm:inline-flex">
                <BreadcrumbLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    onStore?.();
                  }}
                >
                  {S.store[lang]}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden sm:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{page}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          ) : (
            <BreadcrumbItem>
              <BreadcrumbPage>{S.store[lang]}</BreadcrumbPage>
            </BreadcrumbItem>
          )}
        </BreadcrumbList>
      </Breadcrumb>
      {onQueryChange && (
        <div className="relative ms-auto w-full max-w-56 sm:max-w-xs">
          <Search aria-hidden className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" value={query} onChange={(e) => onQueryChange(e.target.value)} placeholder={S.search[lang]} aria-label={S.search[lang]} className="ps-8" />
        </div>
      )}
    </AppHeader>
  );
}
