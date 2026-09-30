import type { Meta, StoryObj } from "@storybook/react-vite";
import { AdminDemo } from "./_admin-demo";

const meta = { title: "Pages/Admin/Users", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <AdminDemo initial="users" /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <AdminDemo initial="users" /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <AdminDemo initial="users" /> };
