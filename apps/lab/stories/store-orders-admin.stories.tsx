import { StoreAbandonedCarts, StoreOrderDetail, StoreOrderDocument, StoreOrdersList } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { useAr } from "./_s-demo";
import { ORDERS_NOW, abandonedSeed, ordersSeed, TRACKING_TEMPLATE } from "./_orders-demo";
import { STORE_CURRENCY } from "./_store-demo";

const meta = {
  title: "Components/Store Admin/Store Orders Admin",
  parameters: { layout: "padded" },
} satisfies Meta;
export default meta;
type Story = StoryObj;

function useLocale() {
  return useAr() ? ("ar" as const) : ("en" as const);
}

/** Views with live counts, search, status, payment and fulfilment filters, row selection with bulk actions. Save the current filters as a view. */
export const List: Story = {
  render: () => {
    const locale = useLocale();
    return <StoreOrdersList orders={ordersSeed(locale)} currency={STORE_CURRENCY} pageSize={8} />;
  },
};

export const ListArabic: Story = { ...List, globals: { locale: "ar" } };

export const ListLoading: Story = { render: () => <StoreOrdersList orders={[]} currency={STORE_CURRENCY} {...({ orders: [], currency: STORE_CURRENCY, loading: true } as object)} /> };

export const ListEmpty: Story = { render: () => <StoreOrdersList orders={[]} currency={STORE_CURRENCY} {...({ orders: [], currency: STORE_CURRENCY } as object)} /> };

export const ListError: Story = { render: () => <StoreOrdersList orders={[]} currency={STORE_CURRENCY} {...({ orders: [], currency: STORE_CURRENCY, error: true, onRetry: () => undefined } as object)} /> };

function DetailDemo({ index }: { index: number }) {
  const locale = useLocale();
  const [order, setOrder] = useState(() => ordersSeed(locale)[index]!);
  const [refunds, setRefunds] = useState<import("@nasaq/web").RefundRecord[]>([]);
  return (
    <StoreOrderDetail
      order={order}
      refunds={refunds}
      currency={STORE_CURRENCY}
      actor="Mona"
      trackingTemplate={TRACKING_TEMPLATE}
      now={() => ORDERS_NOW.toISOString()}
      onChange={(c) => {
        setOrder(c.order);
        setRefunds(c.refunds);
      }}
    />
  );
}

/** A part-shipped order. Fulfil the rest with a carrier and tracking number, refund by line or by amount, cancel, add a note. */
export const Detail: Story = { render: () => <DetailDemo index={8} /> };

export const DetailArabic: Story = { globals: { locale: "ar" }, render: () => <DetailDemo index={8} /> };

export const DetailDelivered: Story = { render: () => <DetailDemo index={0} /> };

export const DetailMobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <DetailDemo index={8} /> };

const seller = { name: "Bayt Store", lines: ["10 Gomhoria Street, Cairo"], email: "orders@bayt.example", phone: "+20 2 5555 0100", taxId: "123-456-789" };

/** The printable invoice. The print view hides everything else on the page. */
export const Invoice: Story = {
  render: () => <StoreOrderDocument kind="invoice" order={ordersSeed("en")[0]!} currency={STORE_CURRENCY} seller={seller} />,
};

export const PackingSlip: Story = {
  render: () => <StoreOrderDocument kind="packing-slip" order={ordersSeed("en")[8]!} currency={STORE_CURRENCY} seller={seller} />,
};

export const InvoiceArabic: Story = { globals: { locale: "ar" }, render: () => <StoreOrderDocument kind="invoice" order={ordersSeed("ar")[0]!} currency={STORE_CURRENCY} seller={{ ...seller, name: "متجر بيت" }} /> };

/** Carts left behind, with the recovery email dialog: discount is capped, and a cart is only contacted after it has been idle and outside the cooldown. */
export const AbandonedCarts: Story = {
  render: () => {
    const locale = useLocale();
    const [sent, setSent] = useState<string | null>(null);
    return (
      <div className="flex flex-col gap-3">
        {sent ? <p role="status">{sent}</p> : null}
        <StoreAbandonedCarts carts={abandonedSeed(locale)} currency={STORE_CURRENCY} now={ORDERS_NOW} onSendRecovery={(e) => setSent(`${e.cartId}: ${e.discountPercent}%`)} />
      </div>
    );
  },
};

export const AbandonedCartsArabic: Story = { ...AbandonedCarts, globals: { locale: "ar" } };
