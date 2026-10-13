/* The shell every Nasaq product shares: the standard menu order, the Connect pill and the phone tab bar. */
import { AppPageHeader, Card, CardDescription, CardHeader, CardTitle, McpConnectApps, McpConnectSheet, ProductMark, ProductShell, type ProductNavInput, UserMenu, WorkspaceSwitcher, useNasaq } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { BarChart3, Boxes, CreditCard, Globe, LayoutDashboard, Palette, Plug, Settings, ShoppingBag, Star, Tag, Users } from "lucide-react";
import { useState } from "react";

const meta = { title: "Components/Layout/Pages/Product Shell", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

const useAr = () => useNasaq().locale.startsWith("ar");

function nav(ar: boolean): ProductNavInput {
  const t = (en: string, arabic: string) => (ar ? arabic : en);
  return {
    dashboard: { id: "dashboard", label: t("Dashboard", "لوحة التحكم"), href: "/admin", icon: LayoutDashboard },
    core: [
      {
        id: "sales",
        label: t("Sales", "المبيعات"),
        items: [
          { id: "orders", label: t("Orders", "الطلبات"), href: "/admin/orders", icon: ShoppingBag, badge: 3 },
          { id: "customers", label: t("Customers", "العملاء"), href: "/admin/customers", icon: Users },
          { id: "reviews", label: t("Reviews", "التقييمات"), href: "/admin/reviews", icon: Star },
        ],
      },
      {
        id: "catalog",
        label: t("Catalog", "الكتالوج"),
        items: [
          { id: "products", label: t("Products", "المنتجات"), href: "/admin/products", icon: Tag },
          { id: "stock", label: t("Stock", "المخزون"), href: "/admin/stock", icon: Boxes },
        ],
      },
    ],
    reports: [{ id: "reports", label: t("Reports", "التقارير"), href: "/admin/reports", icon: BarChart3 }],
    integrations: [
      { id: "payments", label: t("Payments", "المدفوعات"), href: "/admin/payments", icon: CreditCard },
      { id: "mcp", label: t("AI & MCP", "الذكاء الاصطناعي و MCP"), href: "/admin/mcp", icon: Plug },
    ],
    settings: [
      { id: "billing", label: t("Plan", "الباقة"), href: "/admin/plan", icon: CreditCard },
      { id: "domains", label: t("Domains", "النطاقات"), href: "/admin/domains", icon: Globe },
      { id: "settings", label: t("Store settings", "إعدادات المتجر"), href: "/admin/settings", icon: Settings },
      { id: "branding", label: t("Branding", "الهوية"), href: "/admin/branding", icon: Palette },
      { id: "team", label: t("Team", "الفريق"), href: "/admin/team", icon: Users },
    ],
  };
}

function Demo({ start = "/admin" }: { start?: string }) {
  const ar = useAr();
  const [path, setPath] = useState(start);
  const [store, setStore] = useState("3x1");
  const product = ar ? "متجر" : "Matjar";
  return (
    <ProductShell
      brand={{ label: product, href: "/admin", logo: <span className="inline-flex items-center gap-2 text-label"><ProductMark brand="matjar" size={20} />{product}</span>, mark: <ProductMark brand="matjar" size={22} /> }}
      nav={nav(ar)}
      pathname={path}
      onNavigate={setPath}
      workspace={
        <WorkspaceSwitcher
          className="mt-2"
          value={store}
          onValueChange={setStore}
          workspaces={[
            { id: "3x1", name: ar ? "ثري إكس ون" : "3x1 Store" },
            { id: "cafe", name: ar ? "مقهى البن" : "Bean Café" },
          ]}
        />
      }
      account={<UserMenu user={{ name: ar ? "فادي مندي" : "Fady Mondy", email: "fady@example.com" }} />}
      connect={
        <McpConnectSheet
          types={[{ value: "mcp", label: "MCP", content: <McpConnectApps product={product} server={{ name: "matjar", url: "https://3x1.matjar.app/api/mcp" }} /> }]}
        />
      }
    >
      <AppPageHeader title={nav(ar).core.flatMap((g) => g.items).find((i) => i.href === path)?.label ?? (ar ? "لوحة التحكم" : "Dashboard")} description={path} />
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((n) => (
          <Card key={n}>
            <CardHeader>
              <CardTitle>{ar ? `بطاقة ${n}` : `Card ${n}`}</CardTitle>
              <CardDescription>{ar ? "محتوى الصفحة" : "Page content"}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </ProductShell>
  );
}

/** Dashboard → Sales, Catalog → Reports → Integrations (AI & MCP first) → Settings (fixed order), whatever order the product passes. */
export const Default: Story = { render: () => <Demo /> };
export const ChildPage: Story = { name: "Active child page", render: () => <Demo start="/admin/orders/1042" /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Demo /> };
