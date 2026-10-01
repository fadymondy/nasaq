import type { Meta, StoryObj } from "@storybook/react-vite";
import { MobileNavDemo } from "./_w1-demo";

const meta = { title: "Components/Navigation/Pages/Mobile Nav Kit", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Swipe a row (touch) or context-click / Shift+F10 it for the same actions. */
export const Default: Story = { render: () => <MobileNavDemo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <MobileNavDemo /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <MobileNavDemo /> };
