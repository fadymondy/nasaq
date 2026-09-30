import { Badge, TAG_HUES } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Components/Data Display/Badge",
  component: Badge,
  args: { children: "In review", variant: "neutral" },
  argTypes: {
    variant: { control: "select", options: ["neutral", "outline", "brand", "accent", "success", "warning", "danger", "info", "tag"] },
    hue: { control: "select", options: TAG_HUES },
  },
} satisfies Meta<typeof Badge>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="neutral">Neutral</Badge>
      <Badge variant="outline">Outline</Badge>
      <Badge variant="brand">Brand</Badge>
      <Badge variant="accent">Accent</Badge>
      <Badge variant="success">Done</Badge>
      <Badge variant="warning">At risk</Badge>
      <Badge variant="danger">Blocked</Badge>
      <Badge variant="info">In progress</Badge>
    </div>
  ),
};

export const Tags: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {TAG_HUES.map((hue) => (
        <Badge key={hue} variant="tag" hue={hue}>
          {hue}
        </Badge>
      ))}
    </div>
  ),
};
