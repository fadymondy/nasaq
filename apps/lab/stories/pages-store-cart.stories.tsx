/* Cart page: lines, promo, shipping estimate, summary, cross-sell, plus loading, empty and error. Data: ./_cart-checkout-demo. */
import { StoreCartPage, StoreCrossSell, cartItemFromProduct, useStoreCart } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { STORE_CURRENCY, ShopFrame, useDemoPromo, storeCart, storeProducts, storeZones, useLocale } from "./_cart-checkout-demo";

const meta = { title: "Components/Storefront/Pages/Cart", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page({ empty = false, loading = false, error = false }: { empty?: boolean; loading?: boolean; error?: boolean }) {
  const locale = useLocale();
  const cart = useStoreCart({ initialLines: empty ? [] : storeCart(locale), feedback: "toast" });
  const promo = useDemoPromo();
  const products = storeProducts(locale);
  return (
    <ShopFrame>
      <StoreCartPage
        lines={cart.lines}
        currency={STORE_CURRENCY}
        loading={loading}
        error={error}
        onRetry={() => undefined}
        message={cart.message}
        onQuantityChange={cart.setQuantity}
        onRemove={cart.remove}
        onSaveForLater={cart.saveForLater}
        onMoveToCart={cart.moveToCart}
        onFixStock={cart.fixStock}
        removed={cart.removed}
        onUndo={cart.undo}
        onDismissRemoved={cart.dismissRemoved}
        freeShippingThreshold={150000}
        zones={storeZones(locale)}
        promo={promo}
        crossSell={
          <StoreCrossSell
            products={products.slice(4, 9)}
            currency={STORE_CURRENCY}
            onAdd={(p) => {
              const item = cartItemFromProduct(p);
              if (item) cart.add(item);
            }}
          />
        }
        onCheckout={() => undefined}
        onContinueShopping={() => undefined}
      />
    </ShopFrame>
  );
}

export const Default: Story = { render: () => <Page /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
export const Loading: Story = { render: () => <Page loading /> };
export const Empty: Story = { render: () => <Page empty /> };
export const ErrorState: Story = { render: () => <Page error /> };
