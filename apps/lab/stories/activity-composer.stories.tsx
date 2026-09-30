import type { Meta, StoryObj } from "@storybook/react-vite";
import { ActivityDemo } from "./_mahaam-demo";

const meta = { title: "Components/CRM/Activity Composer", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Log a note, call, meeting or task. Open tasks stay on top, the rest is newest first. */
export const Default: Story = { render: () => <ActivityDemo /> };

export const Empty: Story = { render: () => <ActivityDemo empty /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <ActivityDemo /> };
