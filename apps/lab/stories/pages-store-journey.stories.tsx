import type { Meta, StoryObj } from "@storybook/react-vite";
import { JourneyStore } from "./_journey-demo";

const meta = {
  title: "Pages/Store/Journey",
  parameters: { layout: "fullscreen", nasaq: { fullBleed: true } },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** One working storefront: browse, add to a shared cart, check out, then find the order in the account. */
export const Default: Story = { render: () => <JourneyStore /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <JourneyStore /> };

export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <JourneyStore /> };
