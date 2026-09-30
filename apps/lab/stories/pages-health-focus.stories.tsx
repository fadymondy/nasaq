import type { Meta, StoryObj } from "@storybook/react-vite";
import { FocusPage } from "./_focus-demo";

const meta = { title: "Pages/Health/Focus", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <FocusPage /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <FocusPage /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <FocusPage /> };
