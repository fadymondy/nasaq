import type { Meta, StoryObj } from "@storybook/react-vite";
import { ConfidenceDemo, LoadingDemo, SmartActionsDemo, StreamDemo, SummaryDemo } from "./_x3-demo";

const meta = { title: "Components/AI/AI States" } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Sparkle button, split button with a menu, suggestion chips and the Cmd/Ctrl+J action menu. */
export const SmartActions: Story = { render: () => <SmartActionsDemo /> };

/** Thinking indicator with and without step labels, compact, and the shimmer skeleton. */
export const Loading: Story = { render: () => <LoadingDemo /> };

/** Press Generate: text streams from a timer with a caret. Stop it, or regenerate. Markdown stays valid while half written. */
export const Generating: Story = { render: () => <StreamDemo /> };

/** Summary card: TL;DR, key points, expand to full, sources, confidence, copy and thumbs. */
export const Summarized: Story = { render: () => <SummaryDemo /> };

/** The summary being written: the TL;DR streams in with a caret. */
export const SummaryStreaming: Story = { render: () => <SummaryDemo autoStream /> };

export const Confidence: Story = { render: () => <ConfidenceDemo /> };

export const Arabic: Story = {
  globals: { locale: "ar" },
  render: () => (
    <div className="flex flex-col gap-8">
      <SmartActionsDemo />
      <LoadingDemo />
      <StreamDemo auto />
      <SummaryDemo />
    </div>
  ),
};
