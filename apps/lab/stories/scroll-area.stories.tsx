import { ScrollArea, useNasaq } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = { title: "Components/Layout/Scroll Area", component: ScrollArea } satisfies Meta<typeof ScrollArea>;
export default meta;
type Story = StoryObj<typeof meta>;

/** The scrollbar sits on the inline-end edge: switch the locale to Arabic and it moves to the left. */
export const Vertical: Story = {
  render: function Render() {
    const ar = useNasaq().locale.startsWith("ar");
    return (
      <ScrollArea aria-label={ar ? "الملاحظات" : "Notes"} className="h-64 w-72 rounded-card border border-border bg-card">
        <ul className="flex flex-col gap-3 p-4 text-body-sm">
          {Array.from({ length: 20 }, (_, i) => (
            <li key={i}>{ar ? `ملاحظة رقم ${i + 1}: تفاصيل قصيرة عن المهمة.` : `Note ${i + 1}: a short detail about the task.`}</li>
          ))}
        </ul>
      </ScrollArea>
    );
  },
};

export const Horizontal: Story = {
  render: function Render() {
    const ar = useNasaq().locale.startsWith("ar");
    const tags = ar
      ? ["تصميم", "برمجة", "تسويق", "مبيعات", "دعم", "مالية", "موارد بشرية", "قانوني"]
      : ["Design", "Engineering", "Marketing", "Sales", "Support", "Finance", "People", "Legal"];
    return (
      <ScrollArea orientation="horizontal" aria-label={ar ? "الوسوم" : "Tags"} className="w-72">
        <div className="flex w-max gap-2 pb-3">
          {tags.map((t) => (
            <span key={t} className="rounded-full bg-secondary px-3 py-1 text-caption">
              {t}
            </span>
          ))}
        </div>
      </ScrollArea>
    );
  },
};

export const Both: Story = {
  render: function Render() {
    const ar = useNasaq().locale.startsWith("ar");
    return (
      <ScrollArea orientation="both" aria-label={ar ? "شبكة" : "Grid"} className="h-48 w-72 rounded-card border border-border bg-card">
        <div className="grid w-[640px] grid-cols-6 gap-2 p-3 text-caption">
          {Array.from({ length: 60 }, (_, i) => (
            <span key={i} className="rounded-control bg-secondary px-2 py-1">
              {ar ? `خلية ${i + 1}` : `Cell ${i + 1}`}
            </span>
          ))}
        </div>
      </ScrollArea>
    );
  },
};
