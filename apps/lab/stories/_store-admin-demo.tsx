/*
 * Demo data and stateful page shells for the store admin catalogue and settings stories.
 * Built on _store-demo.ts. Money is integer minor units (EGP piasters). Names, codes and figures are invented.
 */
import {
  bulkEditProducts,
  type CollectionDef,
  CollectionsManager,
  type CommerceProduct,
  type Discount,
  DiscountsManager,
  type GiftCard,
  GiftCardField,
  GiftCardsManager,
  type PickupLocation,
  ProductAdminList,
  ProductEditor,
  type ShippingZone,
  ShippingSettings,
  type TaxRate,
  TaxSettings,
  Tabs,
  TabsList,
  TabsPanel,
  TabsTab,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  issueGiftCard,
  redeemGiftCard,
  productToDraft,
  type ProductDraft,
  draftToProduct,
  DiscountSimulator,
  MediaManager,
  OptionsEditor,
  VariantMatrix,
  generateVariants,
} from "@nasaq/web";
import { type ReactNode, useMemo, useState } from "react";
import { useAr } from "./_s-demo";
import { STORE_CURRENCY, type StoreLocale, storeProducts } from "./_store-demo";

export type StoreAdminMode = "default" | "loading" | "empty" | "error";
export const STORE_ADMIN_NOW = new Date("2026-09-30T09:30:00Z");
const wait = (ms = 350) => new Promise<void>((r) => setTimeout(r, ms));
const shell = "min-h-dvh bg-background text-foreground";

function Page({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className={shell}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4">
        <header className="grid gap-1">
          <h1 className="m-0 text-h2 font-semibold">{title}</h1>
          {description ? <p className="m-0 text-body-sm text-muted-foreground">{description}</p> : null}
        </header>
        {children}
      </div>
    </div>
  );
}

const loc = (ar: boolean): StoreLocale => (ar ? "ar" : "en");

/* ------------------------------------------------------------------ products */

export function collectionsSeed(locale: StoreLocale): CollectionDef[] {
  const ar = locale === "ar";
  return [
    { id: "col-home", title: ar ? "المنزل" : "Home essentials", kind: "manual", productIds: ["mug", "lamp", "plant", "bottle"] },
    {
      id: "col-sale",
      title: ar ? "عروض الخريف" : "Autumn sale",
      kind: "rules",
      conditions: { kind: "group", id: "g1", join: "and", children: [{ kind: "condition", id: "c1", field: "onSale", op: "is", value: "true" }] },
    },
    {
      id: "col-nile",
      title: ar ? "نايل بيسكس" : "Nile Basics",
      kind: "rules",
      conditions: { kind: "group", id: "g2", join: "and", children: [{ kind: "condition", id: "c2", field: "brand", op: "is", value: "Nile Basics" }] },
    },
  ];
}

export function StoreProductsPage({ mode = "default", startTab = "products" }: { mode?: StoreAdminMode; startTab?: "products" | "collections" }) {
  const ar = useAr();
  const locale = loc(ar);
  const [products, setProducts] = useState<CommerceProduct[]>(() => {
    const base = storeProducts(locale);
    return base.map((p, i) => (i === 5 ? { ...p, status: "draft" as const } : i === 9 ? { ...p, status: "archived" as const } : p));
  });
  const [collections, setCollections] = useState(() => collectionsSeed(locale));
  const [note, setNote] = useState<string | null>(null);
  const empty = mode === "empty";
  const err = mode === "error";

  return (
    <Page title={ar ? "المنتجات" : "Products"} description={ar ? "الكتالوج والمجموعات." : "The catalogue and its collections."}>
      {note ? (
        <p role="status" className="rounded-control bg-secondary px-3 py-2 text-body-sm">
          {note}
        </p>
      ) : null}
      <Tabs defaultValue={startTab}>
        <TabsList>
          <TabsTab value="products">{ar ? "المنتجات" : "Products"}</TabsTab>
          <TabsTab value="collections">{ar ? "المجموعات" : "Collections"}</TabsTab>
        </TabsList>
        <TabsPanel value="products" className="pt-4">
          <ProductAdminList
            products={empty ? [] : products}
            currency={STORE_CURRENCY}
            loading={mode === "loading"}
            error={err ? true : undefined}
            onRetry={() => undefined}
            onOpen={(p) => setNote(ar ? `فتح ${p.name}` : `Open ${p.name}`)}
            onCreate={() => setNote(ar ? "منتج جديد" : "New product")}
            onBulkEdit={async (ids, edit) => {
              await wait();
              setProducts((cur) => bulkEditProducts(cur, ids, edit));
            }}
            onStatusChange={async (p, status) => {
              await wait(150);
              setProducts((cur) => cur.map((x) => (x.id === p.id ? { ...x, status } : x)));
            }}
            onDelete={async (p) => {
              await wait(150);
              setProducts((cur) => cur.filter((x) => x.id !== p.id));
            }}
          />
        </TabsPanel>
        <TabsPanel value="collections" className="pt-4">
          <CollectionsManager
            collections={empty ? [] : collections}
            products={products}
            currency={STORE_CURRENCY}
            loading={mode === "loading"}
            error={err ? (ar ? "تعذّر تحميل المجموعات." : "Collections did not load.") : undefined}
            onRetry={() => undefined}
            onSave={async (c) => {
              await wait(200);
              setCollections((cur) => (cur.some((x) => x.id === c.id) ? cur.map((x) => (x.id === c.id ? c : x)) : [...cur, c]));
            }}
            onDelete={async (c) => {
              await wait(150);
              setCollections((cur) => cur.filter((x) => x.id !== c.id));
            }}
          />
        </TabsPanel>
      </Tabs>
    </Page>
  );
}

export function StoreProductEditorPage({ mode = "default" }: { mode?: "default" | "new" | "loading" | "error" }) {
  const ar = useAr();
  const locale = loc(ar);
  const initial: ProductDraft | undefined = useMemo(() => {
    if (mode === "new") return undefined;
    const p = storeProducts(locale)[0]!;
    return productToDraft(p, { cost: 15000 });
  }, [mode, locale]);
  const [saved, setSaved] = useState<string | null>(null);
  const [fail, setFail] = useState(mode === "error");

  return (
    <Page title={mode === "new" ? (ar ? "منتج جديد" : "New product") : (initial?.title ?? "")} description={ar ? "الصور والسعر والخيارات والأنواع والظهور في البحث." : "Pictures, price, options, variants and search listing."}>
      {saved ? (
        <p role="status" className="rounded-control bg-secondary px-3 py-2 text-body-sm">
          {saved}
        </p>
      ) : null}
      <ProductEditor
        {...(initial ? { initial } : {})}
        currency={STORE_CURRENCY}
        siteUrl="https://shop.example"
        loading={mode === "loading"}
        suggestions={{ brands: ["Nile Basics", "Delta Run", "Souk Goods"], categories: ["Clothing", "Shoes", "Home"], tags: ["summer", "new", "gift"] }}
        onSave={async (draft) => {
          await wait(500);
          if (fail) {
            setFail(false);
            return { error: ar ? "تعذّر الاتصال بالخادم." : "The server could not be reached." };
          }
          const p = draftToProduct(draft);
          setSaved(ar ? `تم حفظ ${p.name} بعدد ${p.variants.length} أنواع.` : `Saved ${p.name} with ${p.variants.length} variants.`);
        }}
      />
    </Page>
  );
}

/* ------------------------------------------------------------------ settings */

export function zonesSeed(locale: StoreLocale): ShippingZone[] {
  const ar = locale === "ar";
  return [
    {
      id: "z-cairo",
      name: ar ? "القاهرة والجيزة" : "Cairo and Giza",
      countries: ["EG"],
      cities: ["Cairo", "Giza"],
      rates: [
        { id: "r1", label: ar ? "توصيل اليوم التالي" : "Next-day delivery", type: "flat", amount: 4000, etaDays: [1, 1] },
        { id: "r2", label: ar ? "مجاني فوق ١٥٠٠ جنيه" : "Free over EGP 1,500", type: "free-over", freeOver: 150000, amount: 6000, etaDays: [2, 3] },
      ],
    },
    {
      id: "z-egypt",
      name: ar ? "باقي مصر" : "Rest of Egypt",
      countries: ["EG"],
      rates: [
        {
          id: "r3",
          label: ar ? "شحن حسب الوزن" : "By weight",
          type: "weight",
          etaDays: [3, 6],
          tiers: [
            { min: 0, max: 1000, amount: 6000 },
            { min: 1001, max: 5000, amount: 9000 },
            { min: 5001, amount: 15000 },
          ],
        },
        { id: "r4", label: ar ? "شحن سريع" : "Express", type: "flat", amount: 12000, etaDays: [1, 2], express: true },
      ],
    },
    {
      id: "z-gulf",
      name: ar ? "الخليج" : "Gulf",
      countries: ["SA", "AE", "KW"],
      rates: [
        {
          id: "r5",
          label: ar ? "حسب قيمة الطلب" : "By order value",
          type: "price",
          etaDays: [5, 8],
          tiers: [
            { min: 0, max: 200000, amount: 35000 },
            { min: 200001, amount: 0 },
          ],
        },
      ],
    },
  ];
}

export const pickupsSeed = (locale: StoreLocale): PickupLocation[] => [
  { id: "p1", name: locale === "ar" ? "فرع المعادي" : "Maadi store", address: locale === "ar" ? "٧ شارع ٩، المعادي" : "7 Road 9, Maadi", country: "EG", city: "Cairo", fee: 0, readyInHours: 2, active: true },
];

export const taxSeed = (locale: StoreLocale): TaxRate[] => [
  { id: "t1", name: locale === "ar" ? "ضريبة القيمة المضافة" : "VAT", country: "EG", bps: 1400, inclusive: true, onShipping: true, active: true },
  { id: "t2", name: locale === "ar" ? "ضريبة القيمة المضافة" : "VAT", country: "SA", bps: 1500, inclusive: false, onShipping: true, active: true },
  { id: "t3", name: locale === "ar" ? "ضريبة الإمارات" : "UAE VAT", country: "AE", bps: 500, inclusive: false, active: false },
];

export function discountsSeed(locale: StoreLocale): Discount[] {
  const ar = locale === "ar";
  return [
    { id: "d1", title: ar ? "خريف ١٠٪" : "Autumn 10%", method: "code", code: "AUTUMN10", kind: "percentage", value: 1000, maxDiscount: 30000, combinesWith: { shipping: true }, startsAt: "2026-09-01T00:00:00Z", endsAt: "2026-10-31T23:59:59Z", limits: { total: 500, perCustomer: 1 } },
    { id: "d2", title: ar ? "اشترِ ٢ واحصل على ١ مجانًا (أكواب)" : "Buy 2 get 1 free (mugs)", method: "automatic", kind: "bxgy", bxgy: { buyQty: 2, getQty: 1, buyScope: { productIds: ["mug"] }, getPercentBps: 10000, maxSets: 3 } },
    { id: "d3", title: ar ? "شحن مجاني فوق ١٠٠٠ جنيه" : "Free shipping over EGP 1,000", method: "automatic", kind: "free-shipping", minSubtotal: 100000, combinesWith: { product: true, order: true } },
    { id: "d4", title: ar ? "٥٠ جنيهًا خصم للطلب الأول" : "EGP 50 off first order", method: "code", code: "WELCOME50", kind: "fixed", value: 5000, firstOrderOnly: true, minSubtotal: 30000 },
    { id: "d5", title: ar ? "عرض الصيف" : "Summer flash", method: "automatic", kind: "percentage", value: 2000, active: true, startsAt: "2026-06-01T00:00:00Z", endsAt: "2026-06-30T23:59:59Z", excludeOnSale: true },
    { id: "d6", title: ar ? "عملاء VIP" : "VIP members", method: "code", code: "VIP15", kind: "percentage", value: 1500, customers: { mode: "segments", segments: ["vip"] }, active: false },
  ];
}

function giftSeed(): GiftCard[] {
  const now = new Date("2026-08-15T10:00:00Z");
  const mk = (id: string, code: string, amount: number, extra: Parameters<typeof issueGiftCard>[0] extends infer I ? Partial<I> : never = {}) => {
    const c = issueGiftCard({ id, code, amount, currency: STORE_CURRENCY, now, by: "demo", ...extra } as Parameters<typeof issueGiftCard>[0]);
    return "error" in c ? null : c;
  };
  const list: GiftCard[] = [];
  const a = mk("g1", "7KQM-2XPR-4TVW-9HDF", 100000, { recipient: { name: "Sara Ahmed", email: "sara@example.com" } });
  const b = mk("g2", "4ZNB-8CFG-3JKM-5PTK", 50000, { expiresAt: "2027-01-31T23:59:59Z" });
  const c = mk("g3", "9WVD-6HYX-2RNQ-7BEE", 25000, { expiresAt: "2026-09-01T23:59:59Z" });
  for (const x of [a, b, c]) if (x) list.push(x);
  if (list[0]) {
    const r = redeemGiftCard(list[0], 35000, { now: new Date("2026-09-02T12:00:00Z"), currency: STORE_CURRENCY, orderId: "NQ-10428", by: "checkout" });
    if (r.ok) list[0] = r.card;
  }
  return list;
}

export function StoreSettingsPage({ mode = "default", startTab = "shipping" }: { mode?: StoreAdminMode; startTab?: "shipping" | "taxes" | "gift-cards" }) {
  const ar = useAr();
  const locale = loc(ar);
  const [zones, setZones] = useState(() => zonesSeed(locale));
  const [pickups, setPickups] = useState(() => pickupsSeed(locale));
  const [rates, setRates] = useState(() => taxSeed(locale));
  const [cards, setCards] = useState(() => giftSeed());
  const empty = mode === "empty";
  const err = mode === "error";
  const upsert = <T extends { id: string }>(set: (f: (c: T[]) => T[]) => void, item: T) => set((cur) => (cur.some((x) => x.id === item.id) ? cur.map((x) => (x.id === item.id ? item : x)) : [...cur, item]));

  return (
    <Page title={ar ? "الإعدادات" : "Settings"} description={ar ? "الشحن والضرائب وبطاقات الهدايا." : "Shipping, taxes and gift cards."}>
      <Tabs defaultValue={startTab}>
        <TabsList>
          <TabsTab value="shipping">{ar ? "الشحن" : "Shipping"}</TabsTab>
          <TabsTab value="taxes">{ar ? "الضرائب" : "Taxes"}</TabsTab>
          <TabsTab value="gift-cards">{ar ? "بطاقات الهدايا" : "Gift cards"}</TabsTab>
        </TabsList>
        <TabsPanel value="shipping" className="pt-4">
          <ShippingSettings
            zones={empty ? [] : zones}
            pickups={empty ? [] : pickups}
            currency={STORE_CURRENCY}
            loading={mode === "loading"}
            error={err ? (ar ? "تعذّر تحميل مناطق الشحن." : "Shipping zones did not load.") : undefined}
            onRetry={() => undefined}
            onSaveZone={async (z) => (await wait(), upsert(setZones, z))}
            onDeleteZone={async (z) => (await wait(150), setZones((c) => c.filter((x) => x.id !== z.id)))}
            onSavePickup={async (p) => (await wait(), upsert(setPickups, p))}
            onDeletePickup={async (p) => (await wait(150), setPickups((c) => c.filter((x) => x.id !== p.id)))}
          />
        </TabsPanel>
        <TabsPanel value="taxes" className="pt-4">
          <TaxSettings
            rates={empty ? [] : rates}
            currency={STORE_CURRENCY}
            loading={mode === "loading"}
            error={err ? (ar ? "تعذّر تحميل الضرائب." : "Taxes did not load.") : undefined}
            onRetry={() => undefined}
            onSave={async (r) => (await wait(), upsert(setRates, r))}
            onDelete={async (r) => (await wait(150), setRates((c) => c.filter((x) => x.id !== r.id)))}
          />
        </TabsPanel>
        <TabsPanel value="gift-cards" className="grid gap-6 pt-4">
          <GiftCardsManager
            cards={empty ? [] : cards}
            currency={STORE_CURRENCY}
            now={STORE_ADMIN_NOW}
            actor="demo"
            loading={mode === "loading"}
            error={err ? (ar ? "تعذّر تحميل البطاقات." : "Gift cards did not load.") : undefined}
            onRetry={() => undefined}
            onIssue={async (c) => (await wait(), setCards((cur) => [c, ...cur]))}
            onUpdate={async (c) => (await wait(200), setCards((cur) => cur.map((x) => (x.id === c.id ? c : x))))}
          />
          <GiftCheckoutDemo cards={cards} />
        </TabsPanel>
      </Tabs>
    </Page>
  );
}

/** The checkout side of gift cards: type a code from the list above. */
function GiftCheckoutDemo({ cards: given }: { cards?: GiftCard[] }) {
  const ar = useAr();
  const cards = useMemo(() => given ?? giftSeed(), [given]);
  const [entered, setEntered] = useState<GiftCard[]>([]);
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle as="h3">{ar ? "كما يراها العميل عند الدفع" : "What the customer sees at checkout"}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-body-sm text-muted-foreground">{ar ? "الإجمالي ٥٠٠ جنيه. جرّب الرمز 7KQM-2XPR-4TVW-9HDF." : "Total EGP 500. Try the code 7KQM-2XPR-4TVW-9HDF."}</p>
        <GiftCardField
          className="max-w-md"
          cards={entered}
          total={50000}
          currency={STORE_CURRENCY}
          now={STORE_ADMIN_NOW}
          onCardsChange={setEntered}
          onLookup={async (code) => {
            await wait(300);
            return cards.find((c) => c.code === code) ?? { error: "not-found" };
          }}
        />
      </CardContent>
    </Card>
  );
}

export function StoreDiscountsPage({ mode = "default" }: { mode?: StoreAdminMode }) {
  const ar = useAr();
  const locale = loc(ar);
  const products = useMemo(() => storeProducts(locale), [locale]);
  const [discounts, setDiscounts] = useState(() => discountsSeed(locale));
  const empty = mode === "empty";
  const collections = useMemo(() => [{ id: "col-home", title: ar ? "المنزل" : "Home essentials", productIds: ["mug", "lamp", "plant", "bottle"] }], [ar]);
  return (
    <Page title={ar ? "الخصومات" : "Discounts"} description={ar ? "خصومات تلقائية وبرموز، مع محاكاة للسلة." : "Automatic and code discounts, with a basket simulator."}>
      <DiscountsManager
        discounts={empty ? [] : discounts}
        currency={STORE_CURRENCY}
        products={products}
        collections={collections}
        segments={["vip", "wholesale"]}
        usage={{ d1: 212, d4: 40, d5: 87 }}
        now={STORE_ADMIN_NOW}
        loading={mode === "loading"}
        error={mode === "error" ? (ar ? "تعذّر تحميل الخصومات." : "Discounts did not load.") : undefined}
        onRetry={() => undefined}
        onSave={async (d) => (await wait(), setDiscounts((cur) => (cur.some((x) => x.id === d.id) ? cur.map((x) => (x.id === d.id ? d : x)) : [d, ...cur])))}
        onDelete={async (d) => (await wait(150), setDiscounts((cur) => cur.filter((x) => x.id !== d.id)))}
      />
    </Page>
  );
}

/* ------------------------------------------------------------------ single-component demos */

export function MediaManagerDemo() {
  const p = storeProducts("en")[0]!;
  const [images, setImages] = useState(() => p.images.slice(0, 4).map((i, n) => (n === 2 ? { ...i, alt: "" } : n === 3 ? { ...i, src: "https://invalid.example/missing.jpg" } : i)));
  return <MediaManager images={images} onImagesChange={setImages} />;
}

export function VariantMatrixDemo() {
  const p = storeProducts("en")[0]!;
  const [options, setOptions] = useState(() => p.options);
  const [variants, setVariants] = useState(() => p.variants);
  return (
    <div className="grid gap-6">
      <OptionsEditor
        options={options}
        onOptionsChange={(next) => {
          setOptions(next);
          setVariants((cur) => generateVariants(next, cur, { defaults: { price: 34900, stock: 0 } }).variants);
        }}
      />
      <VariantMatrix options={options} variants={variants} onVariantsChange={setVariants} currency={STORE_CURRENCY} images={p.images} />
    </div>
  );
}

export function SimulatorDemo() {
  const products = useMemo(() => storeProducts("en"), []);
  return <DiscountSimulator discounts={discountsSeed("en")} products={products} currency={STORE_CURRENCY} now={STORE_ADMIN_NOW} />;
}

export { GiftCheckoutDemo };
