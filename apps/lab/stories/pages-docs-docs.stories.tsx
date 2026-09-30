import type { Meta, StoryObj } from "@storybook/react-vite";
import { DocsDemo } from "./_u-demo";

const meta = { title: "Pages/Docs/Docs", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <DocsDemo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <DocsDemo /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <DocsDemo /> };
