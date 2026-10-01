import { CupTracker } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Builder, Catalogue, Cups, Flagged, Strip } from "./_w4-health";

const meta = { title: "Components/Wellness/Health Trackers", component: CupTracker, parameters: { layout: "padded" } } satisfies Meta<typeof CupTracker>;
export default meta;
type Story = StoryObj;

function All() {
  return (
    <div className="flex max-w-3xl flex-col gap-10">
      <div className="max-w-md">
        <Cups />
      </div>
      <div className="max-w-xl">
        <Strip />
      </div>
      <div className="max-w-xl">
        <Flagged />
      </div>
      <div className="max-w-lg">
        <Builder />
      </div>
      <Catalogue />
    </div>
  );
}

export const Default: Story = { render: () => <All /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <All /> };
