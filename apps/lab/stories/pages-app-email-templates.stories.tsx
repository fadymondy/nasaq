/* Email templates: gallery, editor with live preview and test send. Demo data lives in ./_builders-demo.tsx. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { EmailTemplatesPage } from "./_builders-demo";

const meta = { title: "Pages/App/Email Templates", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <EmailTemplatesPage /> };
export const Editing: Story = { render: () => <EmailTemplatesPage defaultSelectedId="t1" /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <EmailTemplatesPage /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <EmailTemplatesPage /> };
