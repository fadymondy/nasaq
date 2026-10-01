import type { Meta, StoryObj } from "@storybook/react-vite";
import { CopilotDemo } from "./_copilot-demo";

const meta = { title: "Components/AI Assistant/Copilot Chat" } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Side panel. Pick a starter or type: tool steps run, the answer streams, then sources and follow-ups appear. */
export const Panel: Story = { render: () => <CopilotDemo /> };

/** Full page column with two-column starters. */
export const Page: Story = { render: () => <CopilotDemo mode="page" height="44rem" /> };

/** A finished answer with folded steps, sources, a copy-for-AI code block and follow-ups. */
export const Answered: Story = { render: () => <CopilotDemo seeded /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <CopilotDemo seeded /> };
