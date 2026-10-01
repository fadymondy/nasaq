/* Stock control: what is on hand where, the movement trail, and recording a receive, issue, adjustment or transfer. */
import { StockLedger, type StockMovement } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { stockMovements, stockProducts, stockWarehouses, t, useAr, V1Page, wait } from "./_v1-demo";

const meta = { title: "Components/Store Admin/Pages/Stock", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  const [movements, setMovements] = useState<StockMovement[]>(() => stockMovements(ar));
  return (
    <V1Page title={t(ar, "Stock", "المخزون")} description={t(ar, "On hand in three locations, from every movement.", "المتوفر في ثلاثة مواقع من كل الحركات.")}>
      <StockLedger
        products={stockProducts(ar)}
        warehouses={stockWarehouses(ar)}
        movements={movements}
        onRecord={async (added) => {
          await wait(400);
          setMovements((all) => [...all, ...added]);
        }}
      />
    </V1Page>
  );
}

export const Default: Story = { render: () => <Page /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
