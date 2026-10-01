/* A new quote: the customer, the line items with product pick and free lines, and the totals. */
import { Button, Input, LineItemEditor, type LineItemEditorLine, type LineOrderDiscount } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { CURRENCY, editorProducts, t, useAr, V1Page, VAT_BPS, wait } from "./_v1-demo";

const meta = { title: "Components/Billing/Pages/New Quote", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  const [lines, setLines] = useState<LineItemEditorLine[]>([
    { id: "l1", productId: "p-beans", name: t(ar, "Coffee beans 250g", "حبوب قهوة ٢٥٠ جم"), quantity: 12, unitPrice: 6500, taxBps: VAT_BPS },
    { id: "l2", productId: null, name: t(ar, "Barista training day", "يوم تدريب باريستا"), quantity: 1, unitPrice: 120000, taxBps: VAT_BPS },
  ]);
  const [order, setOrder] = useState<LineOrderDiscount | null>(null);
  const [state, setState] = useState<"idle" | "saving" | "sent">("idle");
  return (
    <V1Page
      title={t(ar, "New quote", "عرض سعر جديد")}
      description={t(ar, "Pick products or type free lines. Tax and discounts are exact.", "اختر منتجات أو اكتب بنودًا حرة. الضريبة والخصومات دقيقة.")}
      actions={
        <Button
          loading={state === "saving"}
          disabled={lines.length === 0}
          onClick={async () => {
            setState("saving");
            await wait(600);
            setState("sent");
          }}
        >
          {state === "sent" ? t(ar, "Quote sent", "تم إرسال العرض") : t(ar, "Send quote", "إرسال العرض")}
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-label text-foreground">
          {t(ar, "Customer", "العميل")}
          <Input defaultValue={t(ar, "Noor Roasters", "نور للتحميص")} />
        </label>
        <label className="flex flex-col gap-1.5 text-label text-foreground">
          {t(ar, "Valid until", "صالح حتى")}
          <Input type="date" ltr defaultValue="2026-10-15" />
        </label>
      </div>
      <LineItemEditor
        value={lines}
        onValueChange={setLines}
        products={editorProducts(ar)}
        currency={CURRENCY}
        defaultTaxBps={VAT_BPS}
        taxRates={[0, 500, VAT_BPS]}
        orderDiscount={order}
        onOrderDiscountChange={setOrder}
      />
    </V1Page>
  );
}

export const Default: Story = { render: () => <Page /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
