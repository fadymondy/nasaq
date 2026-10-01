/* Product page components: the whole page, gallery, variant picker, quantity stepper and size guide. Demo data in ./_product-demo. */
import { type CommerceSelection, ProductDetail, ProductGallery, ProductQuantityStepper, ProductSizeGuide, ProductVariantPicker, initialSelection } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { STORE_CURRENCY, breadcrumbs, delivery, demoProduct, relatedProducts, shippingInfo, sizeGuide, specs, useAr, wait } from "./_product-demo";
import { frame } from "./_frame";

const meta = { title: "Components/Storefront/Product Detail", component: ProductDetail, parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta<typeof ProductDetail>;
export default meta;
type Story = StoryObj<typeof meta>;

function Detail({ id = "tee", blank, sold }: { id?: string; blank?: boolean; sold?: boolean }) {
  const ar = useAr();
  const product = demoProduct(ar, id);
  const shown = sold ? { ...product, variants: product.variants.map((v) => ({ ...v, stock: 0 })) } : product;
  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      <ProductDetail
        product={shown}
        currency={STORE_CURRENCY}
        blankSelection={blank}
        breadcrumbs={breadcrumbs(ar, product.category ?? "", product.name)}
        sizeGuide={id === "tee" ? sizeGuide(ar) : undefined}
        delivery={delivery(ar)}
        specs={specs(ar)}
        shippingInfo={shippingInfo(ar)}
        defaultWishlisted={false}
        onWishlistChange={() => wait(300)}
        onAddToCart={async () => wait(700)}
        onBuyNow={async () => wait(700)}
        related={<p className="text-body-sm text-muted-foreground">{relatedProducts(ar, id).map((p) => p.name).join(" · ")}</p>}
        relatedTitle={ar ? "قد يعجبك أيضًا" : "You may also like"}
      />
    </div>
  );
}

export const Playground: Story = { args: { product: demoProduct(false), currency: STORE_CURRENCY, onAddToCart: async () => wait(500) }, render: () => <Detail /> };
export const Arabic: Story = { ...Playground, globals: { locale: "ar" } };
export const Mobile: Story = { ...Playground, globals: { viewport: { value: "mobile" } } };
/** Nothing is picked, so "Add to cart" asks for a colour and size first. */
export const BlankSelection: Story = { ...Playground, render: () => <Detail blank /> };
/** Every variant is out of stock. */
export const SoldOut: Story = { ...Playground, render: () => <Detail sold /> };
/** A product with a single colour and no sizes. */
export const SimpleProduct: Story = { ...Playground, render: () => <Detail id="mug" /> };

function GalleryDemo() {
  const p = demoProduct(useAr());
  return <ProductGallery images={[...p.images.slice(0, 3), { ...p.images[0]!, kind: "video" }, { src: "/store/missing.svg", alt: "Broken image" }]} name={p.name} />;
}
export const Gallery: StoryObj<typeof ProductGallery> = { render: () => <GalleryDemo />, decorators: [frame("w-full max-w-lg p-4")] };

function Picker({ impossible }: { impossible?: "hide" | "disable" }) {
  const product = demoProduct(useAr());
  const [sel, setSel] = useState<CommerceSelection>(() => initialSelection(product, { blank: true }));
  return <ProductVariantPicker product={product} selection={sel} onSelectionChange={setSel} impossible={impossible} />;
}
export const VariantPicker: StoryObj<typeof ProductVariantPicker> = { render: () => <Picker />, decorators: [frame("w-full max-w-md p-4")] };
export const VariantPickerDisableImpossible: StoryObj<typeof ProductVariantPicker> = { render: () => <Picker impossible="disable" />, decorators: [frame("w-full max-w-md p-4")] };

function Stepper() {
  const [n, setN] = useState(1);
  return <ProductQuantityStepper value={n} onValueChange={setN} max={4} />;
}
export const QuantityStepper: StoryObj<typeof ProductQuantityStepper> = { render: () => <Stepper />, decorators: [frame("p-4")] };

function GuideDemo() {
  return <ProductSizeGuide guide={sizeGuide(useAr())} selectedSize="M" />;
}
export const SizeGuide: StoryObj<typeof ProductSizeGuide> = { render: () => <GuideDemo />, decorators: [frame("p-4")] };
