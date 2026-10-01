/*
 * Validation screen (brief item 18): a CircleXO App Store inside the shared product shell, built only
 * from catalogue components (Spotlight, ProductCard, BundleCard, ProductList, ChipGroup, InstallButton…)
 * and the real product identities. Taglines and CircleXO app prices come from the products' own landing
 * copy; ratings, install counts, bundle prices and the prices of Mahaam, Zekra, Moharrik and Hosbah are
 * illustrative.
 */
import {
  AppGlyph,
  AppMain,
  AppShell,
  Badge,
  BundleCard,
  Button,
  Chip,
  ChipGroup,
  EmptyState,
  Price,
  ProductArtwork,
  ProductCard,
  ProductGrid,
  ProductList,
  ProductListItem,
  Rating,
  SectionHeader,
  Spotlight,
  Status,
  toast,
  Ltr,
  Num,
  ProductMark,
} from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { SearchX, Sparkles } from "lucide-react";
import { useState } from "react";
import { MahaamPage } from "./_mahaam";
import { DemoSidebar, Palette } from "./_shell";
import {
  BUNDLES,
  BUSINESS_APPS,
  type Bi,
  CATEGORIES,
  type CategoryId,
  InstallProvider,
  product,
  PRODUCTS,
  S,
  StoreHeader,
  StoreInstall,
  useLang,
} from "./_store";

const meta = {
  title: "Components/Storefront/Pages/CircleXO App Store",
  parameters: { layout: "fullscreen", nasaq: { fullBleed: true } },
  globals: { brand: "circlexo" },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

// ─── Hero ─────────────────────────────────────────────────────────────────────

const GLIMPSE: { key: string; title: Bi; tone: "success" | "warning" | "info"; status: Bi }[] = [
  { key: "MH-731", title: { en: "Client portal: invoice view", ar: "بوابة العميل: عرض الفاتورة" }, tone: "info", status: { en: "In review", ar: "قيد المراجعة" } },
  { key: "MH-728", title: { en: "Feedback widget on acme.coffee", ar: "أداة الملاحظات على acme.coffee" }, tone: "warning", status: { en: "In progress", ar: "قيد التنفيذ" } },
  { key: "MH-740", title: { en: "Agent: triage the backlog", ar: "وكيل: فرز المهام المتراكمة" }, tone: "success", status: { en: "Done", ar: "مكتمل" } },
];

/** A glimpse of the product itself, drawn with the same primitives, instead of a screenshot. */
function MahaamGlimpse() {
  const lang = useLang();
  return (
    <div aria-hidden className="w-full max-w-sm rounded-floating border border-border bg-nq-surface-overlay p-2 shadow-floating">
      <div className="flex items-center gap-2 px-2 pb-2 pt-1">
        <ProductMark brand="mahaam" size={16} title="" />
        <span className="text-label">{lang === "ar" ? "مهامي" : "My issues"}</span>
        <span className="ms-auto text-caption text-muted-foreground">
          <Num value={15.75} format={{ style: "unit", unit: "hour", unitDisplay: "short" }} />
        </span>
      </div>
      <ul className="flex flex-col">
        {GLIMPSE.map((row) => (
          <li key={row.key} className="flex items-center gap-3 rounded-control px-2 py-2 text-body-sm odd:bg-nq-hover">
            <Ltr className="font-mono text-caption text-muted-foreground">{row.key}</Ltr>
            <span className="min-w-0 flex-1 truncate">{row.title[lang]}</span>
            <Status tone={row.tone}>{row.status[lang]}</Status>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Hero({ onOpenMahaam }: { onOpenMahaam: () => void }) {
  const lang = useLang();
  const mahaam = product("mahaam");
  return (
    <div className="grid gap-4 @5xl:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
      <Spotlight
        brand="mahaam"
        eyebrow={
          <Badge variant="accent">
            <Sparkles />
            {S.editorsPick[lang]}
          </Badge>
        }
        title={mahaam.name[lang]}
        description={
          <div className="flex flex-col gap-2">
            <p className="text-balance text-h3">{mahaam.tagline[lang]}</p>
            <p className="text-body-sm text-muted-foreground">
              {lang === "ar"
                ? "مع أداة ملاحظات لمواقع عملائك، وبوابة للعملاء، ووكلاء ذكاء اصطناعي يعملون على لوحة المهام عبر MCP."
                : "With a feedback widget for your clients' sites, a customer portal, and AI agents that work your issue board over MCP."}
            </p>
          </div>
        }
        actions={
          <>
            <StoreInstall id="mahaam" appName={mahaam.name[lang]} variant="primary" size="lg" />
            <Button size="lg" variant="ghost" onClick={onOpenMahaam}>
              {S.details[lang]}
            </Button>
          </>
        }
        meta={
          <>
            <Price amount={mahaam.price.monthly} period="seat-month" size="sm" className="text-foreground" />
            <span aria-hidden>·</span>
            <span>{S.freeTrial[lang]}</span>
            <span aria-hidden>·</span>
            <Rating value={mahaam.rating} count={mahaam.installs} countLabel={S.workspaces[lang]} />
          </>
        }
        media={<MahaamGlimpse />}
      />
      <div className="grid gap-4 @xl:grid-cols-2 @5xl:grid-cols-1">
        {[product("zekra"), product("health-debug")].map((p) => (
          <Spotlight
            key={p.id}
            brand={p.brand}
            size="md"
            titleAs="h3"
            eyebrow={p.badge === "new" ? <Badge variant="accent">{S.new[lang]}</Badge> : <Badge variant="brand">{S.free[lang]}</Badge>}
            title={p.name[lang]}
            description={p.tagline[lang]}
            meta={<Price amount={p.price.monthly} period="month" size="sm" />}
            actions={<StoreInstall id={p.id} appName={p.name[lang]} free={p.price.monthly === 0} />}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function DiscoverPage({ onOpenMahaam }: { onOpenMahaam: () => void }) {
  const lang = useLang();
  const [category, setCategory] = useState<CategoryId>("all");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const match = (b: Bi, t: Bi) => !q || [b.en, b.ar, t.en, t.ar].some((s) => s.toLowerCase().includes(q));
  const products = PRODUCTS.filter((p) => (category === "all" || category === p.category) && match(p.name, p.tagline));
  const apps = BUSINESS_APPS.filter((a) => (category === "all" || category === "business") && match(a.name, a.tagline));
  const filtered = category !== "all" || q !== "";

  return (
    <>
      <StoreHeader query={query} onQueryChange={setQuery} />
      <AppMain>
        <div className="@container mx-auto flex max-w-6xl flex-col gap-10">
          {!filtered && <Hero onOpenMahaam={onOpenMahaam} />}

          <section aria-labelledby="store-recommended" className="flex flex-col gap-5">
            <ChipGroup value={category} onValueChange={(v) => setCategory(v as CategoryId)} aria-label={S.categories[lang]}>
              {CATEGORIES.map((c) => (
                <Chip key={c.id} value={c.id} icon={<c.icon />}>
                  {c.label[lang]}
                </Chip>
              ))}
            </ChipGroup>
            {filtered ? (
              <h2 id="store-recommended" className="sr-only">
                {S.recommended[lang]}
              </h2>
            ) : (
              <SectionHeader
                headingId="store-recommended"
                title={S.recommended[lang]}
                description={S.recommendedHint[lang]}
                action={
                  <Button variant="link" size="sm" onClick={() => setCategory("all")}>
                    {S.seeAll[lang]}
                  </Button>
                }
              />
            )}
            {products.length > 0 && (
              <ProductGrid>
                {products.map((p) => (
                  <ProductCard
                    key={p.id}
                    artwork={<ProductArtwork brand={p.brand} markSize={44} />}
                    name={p.name[lang]}
                    category={CATEGORIES.find((c) => c.id === p.category)!.label[lang]}
                    badge={p.badge === "new" ? <Badge variant="accent">{S.new[lang]}</Badge> : undefined}
                    description={p.tagline[lang]}
                    meta={<Rating value={p.rating} count={p.installs} countLabel={S.workspaces[lang]} />}
                    price={<Price amount={p.price.monthly} period="month" size="sm" />}
                    action={<StoreInstall id={p.id} appName={p.name[lang]} free={p.price.monthly === 0} />}
                    onClick={p.id === "mahaam" ? onOpenMahaam : undefined}
                    className={p.id === "mahaam" ? "cursor-pointer" : undefined}
                  />
                ))}
              </ProductGrid>
            )}
          </section>

          {!filtered && (
            <section aria-labelledby="store-bundles" className="flex flex-col gap-5">
              <SectionHeader headingId="store-bundles" title={S.bundles[lang]} description={S.bundlesHint[lang]} />
              <div className="grid grid-cols-1 gap-4 @6xl:grid-cols-2">
                {BUNDLES.map((b) => {
                  const ps = b.products.map(product);
                  const as = b.apps.map((id) => BUSINESS_APPS.find((a) => a.id === id)!);
                  const separately = ps.reduce((n, p) => n + p.price.monthly, 0) + as.reduce((n, a) => n + a.price, 0);
                  return (
                    <BundleCard
                      key={b.id}
                      items={[
                        ...ps.map((p) => <ProductArtwork key={p.id} brand={p.brand} markSize={26} />),
                        ...as.map((a) => <AppGlyph key={a.id} icon={a.icon} brand="circlexo" size="lg" />),
                      ]}
                      title={b.name[lang]}
                      description={b.pitch[lang]}
                      includes={[...ps.map((p) => p.name[lang]), ...as.map((a) => a.name[lang])].join(lang === "ar" ? "، " : ", ")}
                      price={b.price}
                      compareAt={separately}
                      action={
                        <Button variant="secondary" onClick={() => toast(`${S.getBundle[lang]}: ${b.name[lang]}`)}>
                          {S.getBundle[lang]}
                        </Button>
                      }
                    />
                  );
                })}
              </div>
            </section>
          )}

          {apps.length > 0 && (
            <section aria-labelledby="store-essentials" className="flex flex-col gap-5">
              <SectionHeader headingId="store-essentials" title={S.essentials[lang]} description={S.essentialsHint[lang]} />
              <ProductList>
                {apps.map((a) => (
                  <ProductListItem
                    key={a.id}
                    icon={<AppGlyph icon={a.icon} brand="circlexo" />}
                    name={a.name[lang]}
                    description={a.tagline[lang]}
                    price={<Price amount={a.price} period="month" size="sm" />}
                    action={<StoreInstall id={a.id} appName={a.name[lang]} free={a.price === 0} />}
                  />
                ))}
              </ProductList>
            </section>
          )}

          {products.length === 0 && apps.length === 0 && <EmptyState icon={SearchX} title={S.noResults[lang]} />}
        </div>
      </AppMain>
    </>
  );
}

/** The store and the Mahaam page share one install state, so installing on either shows on both. */
function Store({ initial = "discover" }: { initial?: "discover" | "mahaam" }) {
  const [view, setView] = useState(initial);
  return (
    <AppShell sidebar={<DemoSidebar active="store" />}>
      <InstallProvider>
        {view === "mahaam" ? <MahaamPage onBack={() => setView("discover")} /> : <DiscoverPage onOpenMahaam={() => setView("mahaam")} />}
      </InstallProvider>
      <Palette />
    </AppShell>
  );
}

/**
 * The store, reached from "App Store" in the product sidebar, under the CircleXO brand. Every tile is
 * tinted by its own product's manifest. Try the chips, search ("memory", "مخزون"), Install / Get (a toast
 * confirms), "Details" on Mahaam, and the toolbar for theme, Arabic and the mobile viewport.
 */
export const Discover: Story = { render: () => <Store /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Store /> };

export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Store /> };
