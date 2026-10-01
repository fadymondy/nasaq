import type { Meta, StoryObj } from "@storybook/react-vite";
import { DesktopDemo } from "./_w1-demo";

const meta = { title: "Components/Apps & Platforms/Pages/Desktop OS Shell", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <DesktopDemo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <DesktopDemo /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <DesktopDemo /> };
