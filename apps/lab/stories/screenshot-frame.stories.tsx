import { ScreenshotFrame } from "@nasaq/web";
import { frame } from "./_frame";
import type { Meta, StoryObj } from "@storybook/react-vite";

function Mock({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2 p-4">
      <div className="h-4 w-1/3 rounded bg-nq-line-strong" />
      {Array.from({ length: rows }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static mock
        <div key={i} className="h-7 rounded-control bg-nq-surface-raised" />
      ))}
    </div>
  );
}

const meta = {
  title: "Components/Data Display/Screenshot Frame",
  component: ScreenshotFrame,
  args: { variant: "window", title: "Mahaam", label: "Mahaam issue list", children: <Mock /> },
  decorators: [frame("w-full max-w-xl")],
} satisfies Meta<typeof ScreenshotFrame>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** The address stays left-to-right in Arabic. */
export const Browser: Story = { args: { variant: "browser", title: "console.mahaam.app/projects", caption: "The web console" } };

export const Phone: Story = { args: { variant: "phone", title: undefined, label: "Mahaam mobile timer", children: <Mock rows={9} /> } };
