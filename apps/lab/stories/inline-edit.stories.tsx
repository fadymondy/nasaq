import { InlineEdit } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { InlineEditDemo } from "./_u-demo";

const meta = { title: "Components/Forms/Inline Edit", component: InlineEdit, parameters: { layout: "fullscreen" } } satisfies Meta<typeof InlineEdit>;
export default meta;
type Story = StoryObj<typeof meta>;

const args = { label: "title", value: "Website redesign", onSave: async () => {} };

export const Default: Story = { args, render: () => <InlineEditDemo /> };
export const Arabic: Story = { args, globals: { locale: "ar" }, render: () => <InlineEditDemo /> };
