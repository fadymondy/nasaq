import type { Meta, StoryObj } from "@storybook/react-vite";
import { StatusLabelDemo } from "./_workflow-p2-demo";

const meta = { title: "Components/Projects & Work/Status Label Manager", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Statuses are grouped by stage and reordered within a stage. Labels are a flat list. */
export const Default: Story = { render: () => <StatusLabelDemo /> };

export const Labels: Story = { render: () => <StatusLabelDemo defaultTab="labels" /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <StatusLabelDemo /> };
