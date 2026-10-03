import { Button, Icon } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowRight, Plus, Trash2 } from "lucide-react";

const meta = {
  title: "Components/Actions/Button",
  component: Button,
  args: { children: "Save changes", variant: "secondary", size: "md", loading: false, disabled: false },
  argTypes: {
    variant: { control: "select", options: ["primary", "secondary", "ghost", "danger", "link"] },
    size: { control: "select", options: ["sm", "md", "lg", "icon", "icon-sm"] },
    shape: { control: "inline-radio", options: ["default", "pill"] },
  },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">
        <Trash2 /> Delete
      </Button>
      <Button variant="link">Link</Button>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
      <Button size="icon" aria-label="Add">
        <Plus />
      </Button>
      <Button size="icon-sm" aria-label="Add">
        <Plus />
      </Button>
    </div>
  ),
};

/** `shape="pill"`: fully rounded with a little more padding; icon sizes become circles. */
export const Pill: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button shape="pill" variant="primary">
          Get started <Icon icon={ArrowRight} directional />
        </Button>
        <Button shape="pill">Secondary</Button>
        <Button shape="pill" variant="ghost">
          Ghost
        </Button>
        <Button shape="pill" variant="danger">
          <Trash2 /> Delete
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button shape="pill" size="sm">
          Small
        </Button>
        <Button shape="pill">Medium</Button>
        <Button shape="pill" size="lg" variant="primary">
          Large
        </Button>
        <Button shape="pill" size="icon" aria-label="Add">
          <Plus />
        </Button>
        <Button shape="pill" size="icon-sm" variant="primary" aria-label="Add">
          <Plus />
        </Button>
        <Button shape="pill" variant="primary" loading>
          Saving
        </Button>
      </div>
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="primary" loading>
        Saving
      </Button>
      <Button disabled>Disabled</Button>
      <Button variant="primary">
        Continue <Icon icon={ArrowRight} />
      </Button>
    </div>
  ),
};

export const PillArabic: Story = { ...Pill, globals: { locale: "ar" } };
