import { ViewToggle, type ViewMode } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { useAr } from "./_lifecycle-demo";

const meta = {
  title: "Components/Actions/View Toggle",
  component: ViewToggle,
  args: { views: ["table", "grid", "board"] },
} satisfies Meta<typeof ViewToggle>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** With the words beside the icons, for toolbars with room to spare. */
export const WithLabels: Story = { args: { views: ["table", "grid", "list"], showLabels: true } };

/** Every view, persisted: switch, reload the story, and it opens where you left it. */
export const Persisted: Story = {
  render: () => {
    const ar = useAr();
    const [view, setView] = useState<ViewMode>("table");
    return (
      <div className="flex flex-col items-start gap-4">
        <ViewToggle views={["table", "grid", "board", "list", "calendar"]} value={view} onValueChange={setView} storageKey="nasaq-lab:view-toggle" />
        <p className="text-body-sm text-muted-foreground">
          {ar ? "طريقة العرض الحالية:" : "Current view:"} <span className="text-foreground">{view}</span>
        </p>
      </div>
    );
  },
};

export const Arabic: Story = { globals: { locale: "ar" }, args: { views: ["table", "grid", "board"], showLabels: true } };
