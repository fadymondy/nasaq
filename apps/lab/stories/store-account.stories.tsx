import { StoreAccountOrder, StoreAddressBook, StoreOrderHistory, StoreRecentlyViewed, StoreReturnRequest, StoreReturnStatus, StoreWishlist, type CommerceAddress } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { useAr } from "./_s-demo";
import { ORDERS_NOW, TRACKING_TEMPLATE, ordersSeed, returnsSeed, wishlistSeed } from "./_orders-demo";
import { STORE_CURRENCY, storeAddresses, storeProducts } from "./_store-demo";

const meta = {
  title: "Components/Storefront/Store Account",
  parameters: { layout: "padded" },
} satisfies Meta;
export default meta;
type Story = StoryObj;

const useLocale = () => (useAr() ? ("ar" as const) : ("en" as const));

/** Filter by status group, search, track or order again. Order again reports what was added, reduced or skipped. */
export const OrderHistory: Story = {
  render: () => {
    const l = useLocale();
    return <StoreOrderHistory orders={ordersSeed(l)} products={storeProducts(l)} currency={STORE_CURRENCY} trackingTemplate={TRACKING_TEMPLATE} />;
  },
};

export const OrderHistoryArabic: Story = { ...OrderHistory, globals: { locale: "ar" } };

export const OrderHistoryLoading: Story = { render: () => <StoreOrderHistory orders={[]} currency={STORE_CURRENCY} {...({ orders: [], currency: STORE_CURRENCY, loading: true } as object)} /> };

export const OrderHistoryEmpty: Story = { render: () => <StoreOrderHistory orders={[]} currency={STORE_CURRENCY} {...({ orders: [], currency: STORE_CURRENCY } as object)} /> };

export const OrderHistoryError: Story = { render: () => <StoreOrderHistory orders={[]} currency={STORE_CURRENCY} {...({ orders: [], currency: STORE_CURRENCY, error: true, onRetry: () => undefined } as object)} /> };

export const OrderPage: Story = {
  render: () => {
    const l = useLocale();
    const orders = ordersSeed(l);
    return <StoreAccountOrder order={orders[9]!} currency={STORE_CURRENCY} requests={returnsSeed(orders, l)} products={storeProducts(l)} trackingTemplate={TRACKING_TEMPLATE} now={ORDERS_NOW} />;
  },
};

export const ReturnRequest: Story = {
  render: () => {
    const l = useLocale();
    const orders = ordersSeed(l);
    const [sent, setSent] = useState("");
    return (
      <div className="flex flex-col gap-3">
        {sent ? <p role="status">{sent}</p> : null}
        <StoreReturnRequest order={orders[9]!} currency={STORE_CURRENCY} requests={returnsSeed(orders, l)} now={ORDERS_NOW} onSubmit={(s) => setSent(`${s.reason}: ${s.lines.length} line(s), ${s.photos.length} photo(s)`)} />
      </div>
    );
  },
};

export const ReturnRequestArabic: Story = { ...ReturnRequest, globals: { locale: "ar" } };

/** The five RMA steps, an open request that can be cancelled. */
export const ReturnStatus: Story = {
  render: () => {
    const l = useLocale();
    const orders = ordersSeed(l);
    const [r] = returnsSeed(orders, l);
    return <StoreReturnStatus request={r!} order={orders[9]!} currency={STORE_CURRENCY} onCancel={() => undefined} />;
  },
};

export const Wishlist: Story = {
  render: () => {
    const l = useLocale();
    const [items, setItems] = useState(() => wishlistSeed(l));
    return (
      <StoreWishlist
        items={items}
        products={storeProducts(l)}
        currency={STORE_CURRENCY}
        onToggleNotify={(i) => setItems((all) => all.map((x) => (x.id === i.id ? { ...x, notify: !x.notify } : x)))}
        onRemove={(i) => setItems((all) => all.filter((x) => x.id !== i.id))}
      />
    );
  },
};

export const WishlistArabic: Story = { ...Wishlist, globals: { locale: "ar" } };

export const AddressBook: Story = {
  render: () => {
    const l = useLocale();
    const [book, setBook] = useState<CommerceAddress[]>(() => storeAddresses(l));
    return <StoreAddressBook addresses={book} onChange={setBook} countries={["EG", "SA", "AE"]} />;
  },
};

export const AddressBookArabic: Story = { ...AddressBook, globals: { locale: "ar" } };

export const RecentlyViewed: Story = {
  render: () => {
    const l = useLocale();
    const [ids, setIds] = useState(["watch", "headphones", "mug", "plant"]);
    return <StoreRecentlyViewed ids={ids} products={storeProducts(l)} currency={STORE_CURRENCY} onRemove={(id) => setIds((x) => x.filter((y) => y !== id))} onClear={() => setIds([])} />;
  },
};

export const Mobile: Story = { ...OrderHistory, globals: { viewport: { value: "mobile" } } };
