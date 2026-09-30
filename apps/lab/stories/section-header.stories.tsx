import { Button, SectionHeader } from "@nasaq/web";
import { frame } from "./_frame";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowRight } from "lucide-react";

const meta = {
  title: "Components/Typography/Section Header",
  component: SectionHeader,
  args: { title: "Essentials", description: "The apps most businesses install first." },
  decorators: [frame("w-full max-w-3xl")],
} satisfies Meta<typeof SectionHeader>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** With a "See all" action at the inline end. The arrow flips in RTL. */
export const WithAction: Story = {
  args: {
    action: (
      <Button variant="link" size="sm">
        See all <ArrowRight className="rtl:-scale-x-100" />
      </Button>
    ),
  },
};
