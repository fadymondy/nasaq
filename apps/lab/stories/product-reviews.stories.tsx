/* Reviews and Q&A components, standalone. Demo data in ./_product-demo. */
import { ProductQA, ProductReviewForm, ProductReviewSummary, ProductReviews, summarizeProductReviews } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { manyReviews, questions, reviews, useAr, wait } from "./_product-demo";
import { frame } from "./_frame";

const meta = { title: "Components/Storefront/Product Reviews", component: ProductReviews, decorators: [frame("w-full max-w-3xl p-4")] } satisfies Meta<typeof ProductReviews>;
export default meta;
type Story = StoryObj<typeof meta>;

function Reviews(props: { loading?: boolean; error?: boolean; empty?: boolean }) {
  const ar = useAr();
  return (
    <ProductReviews
      reviews={props.empty ? [] : manyReviews(ar)}
      loading={props.loading}
      error={props.error}
      onRetry={() => undefined}
      onSubmitReview={async (r) => {
        await wait(800);
        return r.body.includes("fail") ? { error: ar ? "تعذّر الإرسال" : "The server refused it" } : undefined;
      }}
      formProps={{ askFit: true, askName: true }}
      onVoteHelpful={async () => wait(300)}
      onReport={async () => wait(500)}
    />
  );
}
export const Playground: Story = { args: { reviews: reviews(false) }, render: () => <Reviews /> };
export const Arabic: Story = { ...Playground, globals: { locale: "ar" } };
export const Mobile: Story = { ...Playground, globals: { viewport: { value: "mobile" } } };
export const Loading: Story = { ...Playground, render: () => <Reviews loading /> };
export const Empty: Story = { ...Playground, render: () => <Reviews empty /> };
export const ErrorState: Story = { ...Playground, render: () => <Reviews error /> };

function SummaryDemo() {
  return <ProductReviewSummary summary={summarizeProductReviews(manyReviews(useAr()))} onToggleStar={() => undefined} selectedStars={[5]} />;
}
export const Summary: StoryObj<typeof ProductReviewSummary> = { render: () => <SummaryDemo /> };

export const WriteReview: StoryObj<typeof ProductReviewForm> = {
  render: () => <ProductReviewForm askFit askName onSubmit={async () => wait(800)} />,
};
export const WriteReviewArabic: StoryObj<typeof ProductReviewForm> = { ...WriteReview, globals: { locale: "ar" } };

function QA({ empty }: { empty?: boolean }) {
  const ar = useAr();
  return <ProductQA questions={empty ? [] : questions(ar)} onAsk={async () => wait(600)} onAnswer={async () => wait(600)} onVoteQuestion={async () => wait(200)} onVoteAnswer={async () => wait(200)} />;
}
export const Questions: StoryObj<typeof ProductQA> = { render: () => <QA /> };
export const QuestionsArabic: StoryObj<typeof ProductQA> = { render: () => <QA />, globals: { locale: "ar" } };
export const QuestionsEmpty: StoryObj<typeof ProductQA> = { render: () => <QA empty /> };
