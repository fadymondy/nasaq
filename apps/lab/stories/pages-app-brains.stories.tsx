/* Brains overview: table and cards, search, filters and bulk select. Demo data lives in ./_builders-demo.tsx. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { BrainsPage } from "./_builders-demo";

const meta = { title: "Pages/App/Brains", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <BrainsPage /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <BrainsPage /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <BrainsPage /> };
