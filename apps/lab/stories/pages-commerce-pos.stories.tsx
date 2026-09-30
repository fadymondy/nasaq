/* The register screen: a shift at the till. */
import { PosRegister } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { parkedDemo } from "./_pos-demo";
import { CURRENCY, posCategories, posProducts, t, useAr, V1Page, VAT_BPS } from "./_v1-demo";

const meta = { title: "Pages/Commerce/POS Register", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  return (
    <V1Page title={t(ar, "Olaya shop register", "صندوق فرع العليا")} description={t(ar, "Sell to walk-in customers and reconcile the cash drawer at close.", "بيع للعملاء العابرين وطابق درج النقد عند الإغلاق.")}>
      <PosRegister
        products={posProducts(ar)}
        categories={posCategories(ar)}
        currency={CURRENCY}
        defaultTaxBps={VAT_BPS}
        defaultParkedSales={parkedDemo(ar).slice(0, 2)}
        cashier={t(ar, "Lina", "لينا")}
        defaultSession={{ id: "s1", cashier: t(ar, "Lina", "لينا"), openedAt: "2026-09-30T08:00:00", openingFloat: 50000 }}
      />
    </V1Page>
  );
}

export const Default: Story = { render: () => <Page /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
