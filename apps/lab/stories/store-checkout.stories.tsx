/* Store checkout: the address form per country, the summary, and the whole checkout. Data: ./_cart-checkout-demo. */
import { type CommerceAddress, StoreAddressForm, StoreCheckout, StoreOrderConfirmation, StoreOrderSummary, checkoutSummary, storeAddressLines, validateStoreAddress } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { STORE_CURRENCY, ShopFrame, fakePlaceOrder, sampleOrder, storeAddresses, storeCart, storeLocalMethods, storePaymentPolicy, storeShippingMethods, useLocale } from "./_cart-checkout-demo";

const meta = { title: "Components/Commerce/Store Checkout", parameters: { layout: "fullscreen" } } satisfies Meta;
export default meta;
type Story = StoryObj;

function AddressDemo({ country }: { country: string }) {
  const [value, setValue] = useState<Partial<CommerceAddress>>({ country });
  const [checked, setChecked] = useState(false);
  const errors = checked ? validateStoreAddress(value as CommerceAddress) : {};
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 p-6">
      <StoreAddressForm value={value} onChange={setValue} errors={errors} />
      <button type="button" className="w-fit rounded-control border border-border px-3 py-1.5 text-body-sm" onClick={() => setChecked(true)}>
        Validate
      </button>
      <p className="text-caption text-muted-foreground">{storeAddressLines(value as CommerceAddress).join(", ")}</p>
    </div>
  );
}

function Checkout({ fail = false }: { fail?: boolean }) {
  const locale = useLocale();
  return (
    <ShopFrame>
      <StoreCheckout
        lines={storeCart(locale)}
        currency={STORE_CURRENCY}
        shippingMethods={storeShippingMethods(locale)}
        savedAddresses={storeAddresses(locale)}
        paymentPolicy={storePaymentPolicy}
        localMethods={storeLocalMethods(locale)}
        onLocalSubmit={async () => undefined}
        discount={10000}
        giftWrapFee={5000}
        weekend={[5, 6]}
        now={new Date("2026-09-30T09:00:00Z")}
        onPlaceOrder={fakePlaceOrder({ fail })}
        onEditCart={() => undefined}
      />
    </ShopFrame>
  );
}

function Summary() {
  const locale = useLocale();
  const lines = storeCart(locale).filter((l) => !l.savedForLater);
  const method = storeShippingMethods(locale)[0];
  const summary = checkoutSummary({ lines, discount: 10000, ...(method ? { shippingMethod: method } : {}) });
  return (
    <div className="mx-auto max-w-sm p-6">
      <StoreOrderSummary lines={lines} currency={STORE_CURRENCY} summary={summary} shippingMethod={method} defaultOpen onEditCart={() => undefined} />
    </div>
  );
}

function Confirmation() {
  const locale = useLocale();
  return <StoreOrderConfirmation order={sampleOrder(locale)} currency={STORE_CURRENCY} paymentKind="cod" onTrackOrder={() => undefined} onContinueShopping={() => undefined} />;
}

export const AddressEgypt: Story = { render: () => <AddressDemo country="EG" /> };
export const AddressUAE: Story = { render: () => <AddressDemo country="AE" /> };
export const AddressUS: Story = { render: () => <AddressDemo country="US" /> };
export const OrderSummary: Story = { render: () => <Summary /> };
export const FullCheckout: Story = { render: () => <Checkout /> };
export const PlaceOrderFails: Story = { render: () => <Checkout fail /> };
export const ConfirmationPage: Story = { render: () => <Confirmation /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Checkout /> };
