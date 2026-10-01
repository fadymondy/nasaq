import type { Meta, StoryObj } from "@storybook/react-vite";
import { Guidelines } from "./_w4-brand";

const meta = { title: "Components/Brand/Pages/Brand Guidelines", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

const Page = () => (
  <div className="p-4 sm:p-8">
    <Guidelines />
  </div>
);

export const Default: Story = { render: () => <Page /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
