import { Avatar, AvatarFallback, AvatarImage } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Components/Data Display/Avatar",
  component: Avatar,
  args: { name: "Fady Mondy", size: "md", shape: "circle" },
  argTypes: {
    size: { control: "inline-radio", options: ["xs", "sm", "md", "lg"] },
    shape: { control: "inline-radio", options: ["circle", "square"] },
  },
} satisfies Meta<typeof Avatar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Sizes: Story = {
  render: (args) => (
    <div className="flex items-end gap-3">
      {(["xs", "sm", "md", "lg"] as const).map((s) => (
        <Avatar key={s} {...args} size={s} />
      ))}
    </div>
  ),
};

/** Initials fall back when there is no image; Arabic names keep their first letters. */
export const Fallbacks: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Avatar name="Fady Mondy" />
      <Avatar name="نور عادل" />
      <Avatar name="Mahaam" shape="square" />
      <Avatar name="Broken image" src="/does-not-exist.png" />
    </div>
  ),
};

export const Composition: Story = {
  render: () => (
    <Avatar>
      <AvatarImage src="/__missing__.png" alt="Fady Mondy" />
      <AvatarFallback>FM</AvatarFallback>
    </Avatar>
  ),
};
