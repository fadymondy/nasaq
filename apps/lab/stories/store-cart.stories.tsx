/* Store cart: the mini cart drawer with an add-to-cart toast, and the full cart page. Data: ./_cart-checkout-demo. */
import { Button, StoreCartButton, StoreCartPage, StoreCrossSell, StoreMiniCart, cartItemFromProduct, useStoreCart } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { STORE_CURRENCY, ShopFrame, useDemoPromo, storeCart, storeProducts, storeZones, useLocale } from "./_cart-checkout-demo";

const meta = { title: "Components/Storefront/Store Cart", parameters: { layout: "fullscreen" } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Drawer() {
  const locale = useLocale();
  const ar = locale === "ar";
  const cart = useStoreCart({ initialLines: storeCart(locale).slice(0, 2), feedback: "both" });
  const products = storeProducts(locale);
  return (
    <ShopFrame
      header={
        <StoreMiniCart
          open={cart.drawerOpen}
          onOpenChange={cart.setDrawerOpen}
          lines={cart.lines}
          currency={STORE_CURRENCY}
          freeShippingThreshold={150000}
          onQuantityChange={cart.setQuantity}
          onRemove={cart.remove}
          removed={cart.removed}
          onUndo={cart.undo}
          onDismissRemoved={cart.dismissRemoved}
          onCheckout={() => cart.setDrawerOpen(false)}
          onContinueShopping={() => cart.setDrawerOpen(false)}
          trigger={<StoreCartButton count={cart.count} />}
        />
      }
    >
      <div className="mx-auto flex max-w-xl flex-col gap-3 p-6">
        <p className="text-body-sm text-muted-foreground">{ar ? "اضغط لإضافة منتج: يفتح الدرج ويظهر إشعار." : "Add a product: the drawer opens and a toast appears."}</p>
        <div className="flex flex-wrap gap-2">
          {products.slice(0, 5).map((p) => (
            <Button
              key={p.id}
              variant="secondary"
              onClick={() => {
                const item = cartItemFromProduct(p);
                if (item) cart.add(item);
              }}
            >
              {ar ? "أضف" : "Add"} {p.name}
            </Button>
          ))}
        </div>
      </div>
    </ShopFrame>
  );
}

function Page({ empty = false }: { empty?: boolean }) {
  const locale = useLocale();
  const cart = useStoreCart({ initialLines: empty ? [] : storeCart(locale), feedback: "toast" });
  const promo = useDemoPromo();
  const products = storeProducts(locale);
  return (
    <ShopFrame>
      <StoreCartPage
        lines={cart.lines}
        currency={STORE_CURRENCY}
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

export const MiniCartDrawer: Story = { render: () => <Drawer /> };
export const CartPage: Story = { render: () => <Page /> };
export const EmptyCart: Story = { render: () => <Page empty /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const ArabicDrawer: Story = { globals: { locale: "ar" }, render: () => <Drawer /> };
