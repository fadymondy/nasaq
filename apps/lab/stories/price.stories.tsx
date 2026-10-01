import { Price } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = { title: "Components/Pricing/Price", component: Price, args: { amount: 12, period: "seat-month" } } satisfies Meta<typeof Price>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Free, recurring, one-off, discounted, and the large size used on plans. */
export const Variants: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-3">
      <Price amount={0} />
      <Price amount={19} period="month" />
      <Price amount={9.5} period="once" fractionDigits={2} />
      <Price amount={69} compareAt={87} period="month" />
      <Price amount={115} period="year" currency="SAR" />
      <Price amount={24} period="seat-month" size="lg" />
    </div>
  ),
};
