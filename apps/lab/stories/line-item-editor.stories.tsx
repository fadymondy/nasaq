import { LineItemEditor, type LineItemEditorLine, type LineItemEditorProps, type LineOrderDiscount } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { CURRENCY, editorProducts, useAr, VAT_BPS } from "./_v1-demo";

const meta = { title: "Components/Billing/Line Item Editor", component: LineItemEditor, parameters: { layout: "padded" } } satisfies Meta<typeof LineItemEditor>;
export default meta;
type Story = StoryObj;

const startingLines = (ar: boolean): LineItemEditorLine[] => [
  { id: "l1", productId: "p-beans", name: ar ? "حبوب قهوة ٢٥٠ جم" : "Coffee beans 250g", quantity: 4, unitPrice: 6500, taxBps: VAT_BPS },
  { id: "l2", productId: "p-tumbler", name: ar ? "كوب ستانلس" : "Steel tumbler", quantity: 2, unitPrice: 8900, discountBps: 1000, taxBps: VAT_BPS },
  { id: "l3", productId: null, name: ar ? "رسوم توصيل" : "Delivery fee", quantity: 1, unitPrice: 2500, taxBps: VAT_BPS },
];

function Demo({ start, discount = false, ...props }: { start?: LineItemEditorLine[]; discount?: boolean } & Partial<LineItemEditorProps>) {
  const ar = useAr();
  const [lines, setLines] = useState<LineItemEditorLine[]>(start ?? startingLines(ar));
  const [order, setOrder] = useState<LineOrderDiscount | null>(null);
  return (
    <div className="mx-auto max-w-4xl">
      <LineItemEditor
        value={lines}
        onValueChange={setLines}
        products={editorProducts(ar)}
        currency={CURRENCY}
        defaultTaxBps={VAT_BPS}
        taxRates={[0, 500, VAT_BPS]}
        orderDiscount={order}
        onOrderDiscountChange={discount ? setOrder : undefined}
        {...props}
      />
    </div>
  );
}

/** Pick a product to fill its name, price and tax, or type a free line. Totals are integer minor units. */
export const Default: Story = { render: () => <Demo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Demo discount /> };
/** Tax is part of every price: the total never changes, the tax is split out of it. */
export const TaxInclusive: Story = { render: () => <Demo taxMode="inclusive" /> };
/** Tax is rounded once per rate on the whole basket instead of per line. */
export const InvoiceRounding: Story = { render: () => <Demo taxRounding="invoice" discount /> };
export const OrderDiscount: Story = { render: () => <Demo discount /> };
export const Empty: Story = { render: () => <Demo start={[]} /> };
export const ProductsOnly: Story = { render: () => <Demo allowFreeLines={false} /> };
export const ReadOnly: Story = { render: () => <Demo readOnly /> };
