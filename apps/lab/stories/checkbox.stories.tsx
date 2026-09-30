import { Checkbox, useNasaq } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

const meta = { title: "Components/Forms/Checkbox", component: Checkbox } satisfies Meta<typeof Checkbox>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: function Render() {
    const ar = useNasaq().locale.startsWith("ar");
    return (
      <div className="flex flex-col gap-3 text-body-sm">
        <label className="flex items-center gap-2">
          <Checkbox defaultChecked /> {ar ? "أرسل لي نسخة بالبريد" : "Email me a copy"}
        </label>
        <label className="flex items-center gap-2">
          <Checkbox /> {ar ? "أوافق على الشروط" : "I agree to the terms"}
        </label>
        <label className="flex items-center gap-2 text-muted-foreground">
          <Checkbox disabled /> {ar ? "غير متاح" : "Unavailable"}
        </label>
      </div>
    );
  },
};

/** "Select all" over a group: dash when only some are chosen. */
export const Indeterminate: Story = {
  render: function Render() {
    const ar = useNasaq().locale.startsWith("ar");
    const items = ar ? ["الوارد", "المهام", "التقارير"] : ["Inbox", "Issues", "Reports"];
    const [chosen, setChosen] = useState(new Set([items[0]]));
    const all = chosen.size === items.length;
    return (
      <div className="flex flex-col gap-2 text-body-sm">
        <label className="flex items-center gap-2 text-label">
          <Checkbox
            checked={all}
            indeterminate={!all && chosen.size > 0}
            onCheckedChange={() => setChosen(all ? new Set() : new Set(items))}
          />
          {ar ? "كل الإشعارات" : "All notifications"}
        </label>
        {items.map((item) => (
          <label key={item} className="flex items-center gap-2 ps-6">
            <Checkbox
              checked={chosen.has(item)}
              onCheckedChange={() => {
                const next = new Set(chosen);
                if (!next.delete(item)) next.add(item);
                setChosen(next);
              }}
            />
            {item}
          </label>
        ))}
      </div>
    );
  },
};
