/* Store product page: ProductDetail with reviews, Q&A and related products. Demo data in ./_product-demo. */
import { Price, ProductCard, ProductDetail, ProductGrid, ProductQA, ProductReviews, Rating } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { STORE_CURRENCY, breadcrumbs, delivery, demoProduct, manyReviews, questions, relatedProducts, shippingInfo, sizeGuide, specs, useAr, wait } from "./_product-demo";

const meta = { title: "Pages/Store/Product", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page({ state = "ready" }: { state?: "ready" | "loading" | "empty" | "error" }) {
  const ar = useAr();
  const product = demoProduct(ar);
  const revs = state === "empty" ? [] : manyReviews(ar);
  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      <ProductDetail
        product={product}
        currency={STORE_CURRENCY}
        breadcrumbs={breadcrumbs(ar, product.category ?? "", product.name)}
        sizeGuide={sizeGuide(ar)}
        delivery={delivery(ar)}
        specs={specs(ar)}
        shippingInfo={shippingInfo(ar)}
        onWishlistChange={() => wait(300)}
        onAddToCart={async () => wait(700)}
        onBuyNow={async () => wait(700)}
        reviews={
          <div className="flex flex-col gap-12">
            <ProductReviews
              reviews={revs}
              loading={state === "loading"}
              error={state === "error"}
              onRetry={() => undefined}
              onSubmitReview={async () => wait(800)}
              formProps={{ askFit: true, askName: true }}
              onVoteHelpful={async () => wait(300)}
              onReport={async () => wait(500)}
            />
            <ProductQA questions={state === "empty" ? [] : questions(ar)} loading={state === "loading"} onAsk={async () => wait(600)} onAnswer={async () => wait(600)} />
          </div>
        }
        relatedTitle={ar ? "قد يعجبك أيضًا" : "You may also like"}
        related={
          <ProductGrid>
            {relatedProducts(ar).map((p) => (
              <ProductCard
                key={p.id}
                layout="tile"
                artwork={<img src={p.images[0]!.src} alt={p.images[0]!.alt} width={400} height={400} loading="lazy" className="size-full object-cover" />}
                name={p.name}
                category={p.category}
                meta={p.rating ? <Rating value={p.rating.average} count={p.rating.count} /> : undefined}
                price={<Price amount={p.variants[0]!.price / 100} currency={STORE_CURRENCY} />}
              />
            ))}
          </ProductGrid>
        }
      />
    </div>
  );
}

export const Default: Story = { render: () => <Page /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
export const Loading: Story = { render: () => <Page state="loading" /> };
export const Empty: Story = { render: () => <Page state="empty" /> };
export const ErrorState: Story = { render: () => <Page state="error" /> };
