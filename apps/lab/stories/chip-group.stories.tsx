import { Chip, ChipGroup, useNasaq } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Bot, Code, LayoutGrid, ShoppingBag, Users } from "lucide-react";
import { useState } from "react";

const meta = { title: "Components/Forms/Chip Group", component: ChipGroup } satisfies Meta<typeof ChipGroup>;
export default meta;
type Story = StoryObj<typeof meta>;

const CHIPS = [
  { value: "all", icon: <LayoutGrid />, en: "All", ar: "الكل" },
  { value: "sell", icon: <ShoppingBag />, en: "Sell", ar: "البيع" },
  { value: "team", icon: <Users />, en: "Team", ar: "الفريق" },
  { value: "ai", icon: <Bot />, en: "AI", ar: "الذكاء الاصطناعي" },
  { value: "dev", icon: <Code />, en: "Developer tools", ar: "أدوات المطورين" },
];

/** A category filter. Narrow the canvas to see it scroll sideways instead of wrapping. */
export const Playground: Story = {
  args: { value: "all", onValueChange: () => {}, "aria-label": "Categories" },
  render: () => {
    const ar = useNasaq().locale.startsWith("ar");
    const [value, setValue] = useState("all");
    return (
      <div className="max-w-xl">
        <ChipGroup value={value} onValueChange={setValue} aria-label={ar ? "الفئات" : "Categories"}>
          {CHIPS.map((c) => (
            <Chip key={c.value} value={c.value} icon={c.icon}>
              {ar ? c.ar : c.en}
            </Chip>
          ))}
        </ChipGroup>
      </div>
    );
  },
};
