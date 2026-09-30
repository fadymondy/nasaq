import type { Meta, StoryObj } from "@storybook/react-vite";
import { QuickCaptureDemo } from "./_u-demo";

const meta = { title: "Pages/App/Quick Capture", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <QuickCaptureDemo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <QuickCaptureDemo /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <QuickCaptureDemo /> };
