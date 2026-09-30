import { StockLedger, type StockMovement, StockOnHand } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { stockMovements, stockProducts, stockWarehouses, useAr, wait } from "./_v1-demo";

const meta = { title: "Components/Commerce/Stock Ledger", component: StockLedger, parameters: { layout: "padded" } } satisfies Meta<typeof StockLedger>;
export default meta;
type Story = StoryObj;

function Ledger({ readOnly = false, drain = false }: { readOnly?: boolean; drain?: boolean }) {
  const ar = useAr();
  const [movements, setMovements] = useState<StockMovement[]>(() => {
    const base = stockMovements(ar);
    // Sell the beans down to 11 in total (reorder point 12) so a low flag shows.
    return drain
      ? [
          ...base,
          { id: "mv-x1", date: "2026-09-29T10:00:00", productId: "p-beans", warehouseId: "wh-main", type: "issue", quantity: -32, reference: "SO-5540" },
          { id: "mv-x2", date: "2026-09-29T11:00:00", productId: "p-beans", warehouseId: "wh-shop", type: "issue", quantity: -15, reference: "POS-9100" },
        ]
      : base;
  });
  return (
    <div className="mx-auto w-full max-w-5xl">
      <StockLedger
        products={stockProducts(ar)}
        warehouses={stockWarehouses(ar)}
        movements={movements}
        onRecord={
          readOnly
            ? undefined
            : async (added) => {
                await wait(400);
                setMovements((all) => [...all, ...added]);
              }
        }
      />
    </div>
  );
}

function Matrix() {
  const ar = useAr();
  return (
    <div className="mx-auto w-full max-w-4xl">
      <StockOnHand products={stockProducts(ar)} warehouses={stockWarehouses(ar)} movements={stockMovements(ar)} onSelectProduct={() => {}} onRecordFor={() => {}} />
    </div>
  );
}

/** On-hand per warehouse, the movements of the picked product, and a record dialog. Context-click a product for its actions. */
export const Default: Story = { render: () => <Ledger /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Ledger /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Ledger /> };
/** Coffee beans are down to 11 against a reorder point of 12, so they are flagged low. */
export const LowStock: Story = { render: () => <Ledger drain /> };
export const ReadOnly: Story = { render: () => <Ledger readOnly /> };
export const OnHandOnly: Story = { name: "On-hand only", render: () => <Matrix /> };
