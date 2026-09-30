import { Separator, useNasaq } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = { title: "Components/Layout/Separator", component: Separator } satisfies Meta<typeof Separator>;
export default meta;
type Story = StoryObj<typeof meta>;

/** A 1px divider in the border token. Horizontal by default. */
export const Default: Story = {
  render: () => {
    const ar = useNasaq().locale.startsWith("ar");
    return (
      <div className="w-80 space-y-3">
        <div>
          <h4 className="text-body-sm font-medium">{ar ? "متجر الرياض" : "Riyadh Storefront"}</h4>
          <p className="text-caption text-muted-foreground">{ar ? "12 مهمة مفتوحة" : "12 open tasks"}</p>
        </div>
        <Separator />
        <p className="text-body-sm text-muted-foreground">
          {ar ? "آخر تحديث قبل ساعتين بواسطة سارة." : "Last updated 2 hours ago by Sara."}
        </p>
      </div>
    );
  },
};

/** Vertical separators sit between inline items; they align to the row's centre. */
export const Vertical: Story = {
  render: () => {
    const ar = useNasaq().locale.startsWith("ar");
    return (
      <div className="flex items-center gap-3 text-body-sm">
        <span>{ar ? "المشاريع" : "Projects"}</span>
        <Separator orientation="vertical" />
        <span>{ar ? "المهام" : "Tasks"}</span>
        <Separator orientation="vertical" />
        <span>{ar ? "الفواتير" : "Invoices"}</span>
      </div>
    );
  },
};
