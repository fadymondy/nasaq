/* Schedules: saved schedules with their last outcome, and a builder to add or edit one. Demo data lives in ./_automation-demo.tsx. */
import { Button, CronBuilder, CronScheduleList, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Plus } from "lucide-react";
import { useState } from "react";
import { demoSchedules, useAr, wait } from "./_automation-demo";
import { FlowPage } from "./_workflow-demo";

const meta = { title: "Pages/App/Schedules", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  const [rows, setRows] = useState(() => demoSchedules(ar));
  const [editing, setEditing] = useState<string | null>(null);
  const [cron, setCron] = useState("0 9 * * 1-5");
  const [zone, setZone] = useState("Asia/Riyadh");
  return (
    <FlowPage
      title={ar ? "الجداول" : "Schedules"}
      description={ar ? "ما يعمل تلقائيًا ومتى، وكيف انتهى آخر تشغيل." : "What runs on its own, when, and how the last run went."}
      actions={
        <Button
          onClick={() => {
            setCron("0 9 * * 1-5");
            setEditing("new");
          }}
        >
          <Plus aria-hidden />
          {ar ? "جدول جديد" : "New schedule"}
        </Button>
      }
    >
      <CronScheduleList
        schedules={rows}
        onToggle={async (s, enabled) => {
          await wait(400);
          setRows((r) => r.map((x) => (x.id === s.id ? { ...x, enabled } : x)));
        }}
        onRunNow={async () => wait(600)}
        onEdit={(s) => {
          setCron(s.cron);
          setZone(s.timeZone ?? "UTC");
          setEditing(s.id);
        }}
        onDelete={async (s) => {
          await wait(400);
          setRows((r) => r.filter((x) => x.id !== s.id));
        }}
      />
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing === "new" ? (ar ? "جدول جديد" : "New schedule") : ar ? "تعديل الجدول" : "Edit schedule"}</DialogTitle>
            <DialogDescription>{ar ? "اختر موعدًا جاهزًا أو اكتب التعبير بنفسك." : "Pick a preset or write the expression yourself."}</DialogDescription>
          </DialogHeader>
          <CronBuilder value={cron} onValueChange={(v) => setCron(v)} timeZone={zone} onTimeZoneChange={setZone} />
        </DialogContent>
      </Dialog>
    </FlowPage>
  );
}

export const Default: Story = { render: () => <Page /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
