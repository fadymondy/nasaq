import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArtifactAnswerDemo, ArtifactGalleryDemo } from "./_t1-demo";

const meta = { title: "Components/AI/Artifact Renderer" } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Every kind from JSON, an invalid payload, and the HTML kind behind its switch. Events are logged at the bottom. */
export const Gallery: Story = { render: () => <ArtifactGalleryDemo /> };

/** A model answer with fenced artifact blocks. Prose becomes Markdown, blocks become components, a broken block a warning. */
export const InAnswer: Story = { render: () => <ArtifactAnswerDemo /> };

export const Arabic: Story = {
  globals: { locale: "ar" },
  render: () => (
    <div className="flex flex-col gap-8">
      <ArtifactAnswerDemo />
      <ArtifactGalleryDemo />
    </div>
  ),
};
