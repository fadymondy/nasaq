import { CronBuilder, CronScheduleList } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { demoSchedules, useAr, wait } from "./_automation-demo";

const meta = { title: "Components/Workflow/Cron Builder", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Builder({ value: initial = "0 9 * * 1-5", zone = "Asia/Riyadh" }: { value?: string; zone?: string }) {
  const [value, setValue] = useState(initial);
  const [tz, setTz] = useState(zone);
  return (
    <div className="mx-auto max-w-2xl">
      <CronBuilder value={value} onValueChange={(v) => setValue(v)} timeZone={tz} onTimeZoneChange={setTz} />
    </div>
  );
}

/** Presets or simple settings, spoken back as a sentence, with the next runs in the chosen time zone. */
export const Default: Story = { render: () => <Builder /> };
/** A custom expression that does not fit the simple form opens on the Cron tab. */
export const CustomExpression: Story = { render: () => <Builder value="*/20 8-18 * * 1-5" zone="UTC" /> };
/** A wrong expression names the field that is wrong. */
export const Invalid: Story = { render: () => <Builder value="0 25 * * *" /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Builder /> };

function Schedules() {
  const ar = useAr();
  const [rows, setRows] = useState(() => demoSchedules(ar));
  return (
    <div className="mx-auto max-w-4xl">
      <CronScheduleList
        schedules={rows}
        onToggle={async (s, enabled) => {
          await wait(400);
          setRows((r) => r.map((x) => (x.id === s.id ? { ...x, enabled } : x)));
        }}
        onRunNow={async () => wait(600)}
        onEdit={() => undefined}
        onDelete={async (s) => {
          await wait(400);
          setRows((r) => r.filter((x) => x.id !== s.id));
        }}
      />
    </div>
  );
}

/** Saved schedules with ran, failed and missed status, next run, pause, run now and delete. */
export const ScheduleList: Story = { render: () => <Schedules /> };
export const ScheduleListArabic: Story = { globals: { locale: "ar" }, render: () => <Schedules /> };
