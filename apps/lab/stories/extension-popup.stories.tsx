import type { Meta, StoryObj } from "@storybook/react-vite";
import { ExtensionPage } from "./_w1-demo";

const meta = { title: "Pages/App/Extension Popup", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Signed out: type an address to connect (an address containing "fail" shows the error). Then pause, log, options. */
export const Default: Story = { render: () => <ExtensionPage /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <ExtensionPage /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <ExtensionPage /> };
