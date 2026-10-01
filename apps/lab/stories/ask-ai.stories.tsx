import type { Meta, StoryObj } from "@storybook/react-vite";
import { AskAiDemo, InsightDemo } from "./_t1-demo";

const meta = { title: "Components/AI Assistant/Ask AI and Insight Card" } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Select any text and press Ask AI (or Ctrl+Shift+Space). Quick actions or a question, then the answer in place. */
export const AskOnSelection: Story = { render: () => <AskAiDemo /> };

/** The first question fails after a delay, so you can see the error and Try again. */
export const AskFails: Story = { render: () => <AskAiDemo failFirst /> };

/** Insight cards: with metric, sources, confidence and actions; tones; inline; loading. */
export const Insights: Story = { render: () => <InsightDemo /> };

export const Arabic: Story = {
  globals: { locale: "ar" },
  render: () => (
    <div className="flex flex-col gap-8">
      <AskAiDemo />
      <InsightDemo />
    </div>
  ),
};
