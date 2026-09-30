import { Toggle, ToggleGroup, useNasaq } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Bold, Italic, LayoutGrid, List, Underline } from "lucide-react";
import { useState } from "react";

const meta = { title: "Components/Actions/Toggle Group", component: ToggleGroup } satisfies Meta<typeof ToggleGroup>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Single selection: a segmented control. */
export const Segmented: Story = {
  render: function Render() {
    const ar = useNasaq().locale.startsWith("ar");
    const [value, setValue] = useState<string[]>(["list"]);
    return (
      <ToggleGroup value={value} onValueChange={setValue} aria-label={ar ? "طريقة العرض" : "View mode"}>
        <Toggle value="list">
          <List /> {ar ? "قائمة" : "List"}
        </Toggle>
        <Toggle value="grid">
          <LayoutGrid /> {ar ? "شبكة" : "Grid"}
        </Toggle>
        <Toggle value="board" disabled>
          {ar ? "لوحة" : "Board"}
        </Toggle>
      </ToggleGroup>
    );
  },
};

/** `multiple` with the outline variant: independent formatting options. */
export const Multiple: Story = {
  render: function Render() {
    const ar = useNasaq().locale.startsWith("ar");
    return (
      <ToggleGroup multiple variant="outline" defaultValue={["bold"]} aria-label={ar ? "التنسيق" : "Formatting"}>
        <Toggle value="bold" aria-label={ar ? "غامق" : "Bold"}>
          <Bold />
        </Toggle>
        <Toggle value="italic" aria-label={ar ? "مائل" : "Italic"}>
          <Italic />
        </Toggle>
        <Toggle value="underline" aria-label={ar ? "تحته خط" : "Underline"}>
          <Underline />
        </Toggle>
      </ToggleGroup>
    );
  },
};

export const Standalone: Story = {
  render: function Render() {
    const ar = useNasaq().locale.startsWith("ar");
    return <Toggle defaultPressed>{ar ? "تثبيت" : "Pin"}</Toggle>;
  },
};
