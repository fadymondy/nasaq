import { BRANDS, type BrandKey } from "@nasaq/brands";
import {
  Badge,
  Button,
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Num,
  ProductLogo,
  SidebarItem,
  Status,
  Switch,
  useNasaq,
} from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { FolderKanban, Inbox, TrendingUp } from "lucide-react";

const meta = {
  title: "Brand/Brand matrix",
  parameters: { layout: "fullscreen" },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** The product manifests the design system ships for. Nasaq and fadymondy are the house brands, not products. */
const PRODUCTS: BrandKey[] = ["circlexo", "mahaam", "moharrik", "seatfor", "health-debug", "zekra", "orchestra", "hosbah"];

/** Upstream actions that miss 4.5:1 (tokens test KNOWN_ACTION_EXCEPTIONS). Not Nasaq's to recolour: decision B15. */
const KNOWN_BELOW_AA = new Set(["circlexo:light", "health-debug:dark"]);

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

/** WCAG 2 contrast ratio of two #rrggbb colours. */
function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

function Swatch({ label, color }: { label: string; color: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="size-3 rounded-[3px] border border-border" style={{ background: color }} />
      <span className="text-muted-foreground">{label}</span>
      <span dir="ltr" className="font-mono uppercase">
        {color}
      </span>
    </span>
  );
}

function BrandCell({ brand }: { brand: BrandKey }) {
  const { locale, resolvedTheme } = useNasaq();
  const ar = locale.startsWith("ar");
  const { color } = BRANDS[brand];
  const action = color.action[resolvedTheme];
  const onAction = color.onAction[resolvedTheme];
  const ratio = contrast(action, onAction);
  return (
    // A nested data-brand scope re-derives every brand token locally, exactly as a product root would.
    <section data-brand={brand} aria-label={BRANDS[brand].name.en} className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4 text-foreground">
      <div className="flex items-center justify-between gap-2">
        <ProductLogo brand={brand} />
        <span className="font-mono text-caption text-muted-foreground">{brand}</span>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-caption">
        <Swatch label={ar ? "العلامة" : "brand"} color={color.brand[resolvedTheme]} />
        <Swatch label={ar ? "الإجراء" : "action"} color={action} />
        <span className={ratio >= 4.5 ? "text-muted-foreground" : "font-medium text-nq-danger-text"}>
          <span dir="ltr">{(Math.floor(ratio * 100) / 100).toFixed(2)}:1</span>{" "}
          {ratio >= 4.5 ? "AA" : ar ? "أقل من AA" : "below AA"}
          {ratio < 4.5 && KNOWN_BELOW_AA.has(`${brand}:${resolvedTheme}`) && (
            <span className="font-normal text-muted-foreground"> · {ar ? "لون المنتج الأصلي (B15)" : "upstream colour (B15)"}</span>
          )}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary">{ar ? "إنشاء مهمة" : "Create issue"}</Button>
        <Button>{ar ? "تصدير" : "Export"}</Button>
        <Button variant="ghost">{ar ? "إلغاء" : "Cancel"}</Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="brand">Pro</Badge>
        <Badge variant="accent">{ar ? "جديد" : "New"}</Badge>
        <Status tone="success">{ar ? "مكتمل" : "Done"}</Status>
        <Status tone="warning">{ar ? "متأخر" : "Overdue"}</Status>
      </div>

      <div className="flex items-center gap-4 text-body-sm">
        <label className="flex items-center gap-2">
          <Switch defaultChecked /> {ar ? "إشعارات" : "Notify"}
        </label>
        <label className="flex items-center gap-2">
          <Checkbox defaultChecked /> {ar ? "نسخة" : "Copy me"}
        </label>
      </div>

      <Input aria-label={ar ? "بحث" : "Search"} placeholder={ar ? "ابحث في المهام…" : "Search issues…"} />

      <nav aria-label={ar ? "تنقل تجريبي" : "Sample navigation"} className="flex flex-col gap-0.5">
        <SidebarItem href="#" active icon={<Inbox />}>
          {ar ? "الوارد" : "Inbox"}
        </SidebarItem>
        <SidebarItem href="#" icon={<FolderKanban />}>
          {ar ? "المشاريع" : "Projects"}
        </SidebarItem>
      </nav>

      <Card className="gap-2 py-3.5">
        <CardHeader>
          <CardDescription>{ar ? "الإيرادات" : "Revenue"}</CardDescription>
          <CardTitle className="text-h2 leading-tight">
            <Num value={48210} format={{ style: "currency", currency: "USD", maximumFractionDigits: 0 }} />
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TrendingUp />
              <span dir="ltr">+12.4%</span>
            </Badge>
          </CardAction>
        </CardHeader>
      </Card>
    </section>
  );
}

/**
 * The same primitives under each product's manifest, side by side. Use the toolbar for theme, locale,
 * direction, density and platform: every cell follows them. The ratio is the primary button's label
 * on its fill for the current theme.
 */
export const Products: Story = {
  render: () => (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(19rem,1fr))] gap-4 p-6">
      {PRODUCTS.map((brand) => (
        <BrandCell key={brand} brand={brand} />
      ))}
    </div>
  ),
};
