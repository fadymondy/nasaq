import { Kbd, Text, type TextRole } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";

const ROLES: TextRole[] = ["display", "h1", "h2", "h3", "body", "body-sm", "label", "caption", "eyebrow", "code"];

const meta = { title: "Foundations/Typography", component: Text } satisfies Meta<typeof Text>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Roles: Story = {
  render: (_args, { globals }) => {
    const ar = String(globals.locale).startsWith("ar");
    const sample = ar ? "نسق واحد. كل المنتجات." : "One product language. Every surface.";
    return (
      <div className="flex flex-col gap-4">
        {ROLES.map((role) => (
          <div key={role} className="grid grid-cols-[6rem_1fr] items-baseline gap-4 border-b border-border pb-3">
            <span className="font-mono text-caption text-muted-foreground" dir="ltr">
              {role}
            </span>
            <Text variant={role}>{sample}</Text>
          </div>
        ))}
      </div>
    );
  },
};

export const Keyboard: Story = {
  render: () => (
    <Text variant="body-sm">
      Open the command menu with <Kbd>⌘</Kbd> <Kbd>K</Kbd>
    </Text>
  ),
};
