/*
 * The page the "cancel deletion" link in the reminder email opens. Public: it works with the link alone.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CancelDemo } from "./_team-pages";

const meta = { title: "Components/Auth/Pages/Cancel Deletion", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <CancelDemo state="ready" /> };
export const Expired: Story = { render: () => <CancelDemo state="expired" /> };
export const InvalidLink: Story = { render: () => <CancelDemo state="invalid" /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <CancelDemo state="ready" /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <CancelDemo state="ready" /> };
