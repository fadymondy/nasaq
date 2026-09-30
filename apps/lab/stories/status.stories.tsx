import { Status, useNasaq, type StatusTone } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = { title: "Components/Data Display/Status", component: Status, args: { tone: "success", children: "Done" } } satisfies Meta<typeof Status>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

const TONES: { tone: StatusTone; label: [string, string]; meaning: string }[] = [
  { tone: "neutral", label: ["Todo", "للتنفيذ"], meaning: "Not started, draft, archived" },
  { tone: "info", label: ["In progress", "قيد التنفيذ"], meaning: "Running, syncing, scheduled" },
  { tone: "warning", label: ["In review", "قيد المراجعة"], meaning: "Needs attention, at risk, expiring" },
  { tone: "success", label: ["Done", "مكتملة"], meaning: "Completed, healthy, paid, live" },
  { tone: "danger", label: ["Blocked", "متوقفة"], meaning: "Failed, overdue, error, revoked" },
];

/** Five generic tones every product maps onto. Each has its own shape, so none relies on hue alone. */
export const Tones: Story = {
  render: () => {
    const { locale } = useNasaq();
    const l = locale.startsWith("ar") ? 1 : 0;
    return (
      <div className="grid w-fit grid-cols-[auto_auto_1fr] items-center gap-x-6 gap-y-3">
        {TONES.map((t) => (
          <div key={t.tone} className="contents">
            <Status tone={t.tone}>{t.label[l]}</Status>
            <Status tone={t.tone} tinted>
              {t.label[l]}
            </Status>
            <span className="text-caption text-muted-foreground">
              <code>{t.tone}</code> · {t.meaning}
            </span>
          </div>
        ))}
      </div>
    );
  },
};
