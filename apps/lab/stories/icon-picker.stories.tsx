import { IconByName, IconPicker, IconPickerPanel } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

const meta = { title: "Components/Pickers/Icon Picker", component: IconPicker, parameters: { layout: "padded" } } satisfies Meta<typeof IconPicker>;
export default meta;
type Story = StoryObj;

function Demo({ ar }: { ar?: boolean }) {
  const [icon, setIcon] = useState("rocket");
  return (
    <div className="flex items-center gap-3 p-6">
      <IconPicker value={icon} onValueChange={setIcon} />
      <IconByName name={icon} className="size-6 text-foreground" />
      <bdi dir="ltr" className="text-body-sm text-muted-foreground">
        {icon}
      </bdi>
      <span className="text-body-sm text-muted-foreground">{ar ? "الأيقونة المختارة" : "Chosen icon"}</span>
    </div>
  );
}

/** The trigger shows the chosen icon; the value is its lucide name. Search "mail", "money" or Arabic "بريد". */
export const Default: Story = { render: () => <Demo /> };

/** The panel on its own, for a side sheet or a form. Recent icons appear after the first pick. */
export const Panel: Story = {
  render: () => {
    const [icon, setIcon] = useState<string | null>("house");
    return (
      <div className="flex flex-col gap-3 p-6">
        <div className="w-fit overflow-hidden rounded-card border border-border">
          <IconPickerPanel value={icon} onValueChange={setIcon} recentKey={null} />
        </div>
        <p className="text-body-sm text-muted-foreground">
          Value: <bdi dir="ltr">{icon}</bdi>
        </p>
      </div>
    );
  },
};

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo ar /> };
