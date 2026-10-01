/* Checkout page: contact, address, delivery, payment, summary, place order with loading and failure. Data: ./_cart-checkout-demo. */
import { StoreCheckout } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { STORE_CURRENCY, ShopFrame, fakePlaceOrder, storeAddresses, storeCart, storeLocalMethods, storePaymentPolicy, storeShippingMethods, useLocale } from "./_cart-checkout-demo";

const meta = { title: "Components/Storefront/Pages/Checkout", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page({ fail = false, empty = false, signedIn = true, saved = true }: { fail?: boolean; empty?: boolean; signedIn?: boolean; saved?: boolean }) {
  const locale = useLocale();
  const ar = locale === "ar";
  return (
    <ShopFrame>
      <StoreCheckout
        lines={empty ? [] : storeCart(locale)}
        currency={STORE_CURRENCY}
        shippingMethods={storeShippingMethods(locale)}
        {...(saved ? { savedAddresses: storeAddresses(locale) } : {})}
        {...(signedIn ? { account: { name: ar ? "سارة أحمد" : "Sara Ahmed", email: "sara@example.com" } } : {})}
        onSignIn={() => undefined}
        paymentPolicy={storePaymentPolicy}
        localMethods={storeLocalMethods(locale)}
        onLocalSubmit={async () => undefined}
        discount={10000}
        giftWrapFee={5000}
        weekend={[5, 6]}
        now={new Date("2026-09-30T09:00:00Z")}
        onPlaceOrder={fakePlaceOrder({ fail })}
        onEditCart={() => undefined}
        onContinueShopping={() => undefined}
        onTrackOrder={() => undefined}
      />
    </ShopFrame>
  );
}

export const Default: Story = { render: () => <Page /> };
export const Guest: Story = { render: () => <Page signedIn={false} saved={false} /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
export const PlaceOrderFails: Story = { render: () => <Page fail /> };
export const Empty: Story = { render: () => <Page empty /> };
