import { Rating } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = { title: "Components/Storefront/Rating", component: Rating, args: { value: 4.8, count: 2140 } } satisfies Meta<typeof Rating>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Without a count, with a compact count, and with a custom count label. */
export const Variants: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-3">
      <Rating value={4.9} />
      <Rating value={4.7} count={1380} />
      <Rating value={4.6} count={39200} countLabel="reviews" />
    </div>
  ),
};
