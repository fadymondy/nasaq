import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChecklistDemo } from "./_workflow-p2-demo";

const meta = { title: "Components/Workflow/Checklist", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Tick items, add subtasks (a parent follows its children), attach files and delete from the row menu. */
export const Default: Story = { render: () => <ChecklistDemo /> };

export const ReadOnly: Story = { render: () => <ChecklistDemo readOnly /> };

export const Empty: Story = { render: () => <ChecklistDemo empty /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <ChecklistDemo /> };
