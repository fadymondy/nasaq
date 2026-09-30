import type { Meta, StoryObj } from "@storybook/react-vite";
import { CitationPartsDemo, CitationsDemo } from "./_t1-demo";

const meta = { title: "Components/AI/AI Citations and Provenance" } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Answer with [n] markers. Press a marker to see the quote. Press a chip to open the evidence. */
export const Answer: Story = { render: () => <CitationsDemo /> };

/** No sources: the answer is marked as not grounded, and paragraphs with no source are flagged. */
export const Ungrounded: Story = { render: () => <CitationsDemo ungrounded /> };

/** Chips, an evidence card and the provenance line on their own, sharing one highlight. */
export const Parts: Story = { render: () => <CitationPartsDemo /> };

export const Arabic: Story = {
  globals: { locale: "ar" },
  render: () => (
    <div className="flex flex-col gap-8">
      <CitationsDemo />
      <CitationPartsDemo />
    </div>
  ),
};
