/* Order placed: the confirmation after checkout, for prepaid, cash on delivery and manual transfer. Data: ./_cart-checkout-demo. */
import { StoreOrderConfirmation } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { STORE_CURRENCY, ShopFrame, sampleOrder, useLocale } from "./_cart-checkout-demo";

const meta = { title: "Pages/Store/Order Placed", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page({ kind = "card", gift = false }: { kind?: "card" | "cod" | "local"; gift?: boolean }) {
  const locale = useLocale();
  return (
    <ShopFrame>
      <StoreOrderConfirmation order={sampleOrder(locale)} currency={STORE_CURRENCY} paymentKind={kind} gift={gift} weekend={[5, 6]} now={new Date("2026-09-30T09:00:00Z")} onTrackOrder={() => undefined} onContinueShopping={() => undefined} />
    </ShopFrame>
  );
}

export const Default: Story = { render: () => <Page /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
export const CashOnDelivery: Story = { render: () => <Page kind="cod" /> };
export const TransferBeingChecked: Story = { render: () => <Page kind="local" gift /> };
