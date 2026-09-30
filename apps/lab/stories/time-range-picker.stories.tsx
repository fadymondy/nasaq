import { parseTimeRange, serializeTimeRange, type TimeComparison, type TimeRangeValue, TimeRangePicker, TimeSeriesPanel } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { gaReport } from "./_analytics-demo";
import { useAr } from "./_s-demo";

const meta = { title: "Components/Pickers/Time Range Picker", component: TimeRangePicker, parameters: { layout: "padded" } } satisfies Meta<typeof TimeRangePicker>;
export default meta;
type Story = StoryObj;

const NOW = new Date("2026-09-30T09:30:00Z");

function Demo({ zone = "Asia/Riyadh", presets }: { zone?: string; presets?: readonly `${number}${"m" | "h" | "d"}`[] }) {
  const [value, setValue] = useState<TimeRangeValue>({ kind: "relative", preset: "24h" });
  const [cmp, setCmp] = useState<TimeComparison>("previous");
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <TimeRangePicker
        value={value}
        onValueChange={setValue}
        comparison={cmp}
        onComparisonChange={setCmp}
        presets={presets}
        timeZone={zone}
        now={NOW}
      />
      <p className="text-body-sm text-muted-foreground">
        URL form: <bdi dir="ltr" className="font-mono">?range={serializeTimeRange(value)}</bdi>
      </p>
    </div>
  );
}

export const Default: Story = { render: () => <Demo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Demo /> };
export const LiveMonitoring: Story = { render: () => <Demo presets={["15m", "1h", "6h"]} /> };
export const OtherTimeZone: Story = { render: () => <Demo zone="America/New_York" /> };

function Dashboard() {
  const ar = useAr();
  const [value, setValue] = useState<TimeRangeValue>(parseTimeRange("7d") ?? { kind: "relative", preset: "7d" });
  const [days, setDays] = useState(7);
  const d = gaReport(Math.min(28, Math.max(7, days)), ar);
  return (
    <div className="flex flex-col gap-4">
      <TimeRangePicker
        value={value}
        onValueChange={(next, range) => {
          setValue(next);
          setDays(Math.max(1, Math.round((range.to.getTime() - range.from.getTime()) / 86400000)));
        }}
        now={NOW}
        timeZone="Asia/Riyadh"
      />
      <TimeSeriesPanel title={ar ? "الزيارات" : "Traffic"} metrics={[{ id: "users", label: ar ? "المستخدمون" : "Users", color: "var(--primary)" }]} data={d.series} />
    </div>
  );
}
export const DrivingADashboard: Story = { render: () => <Dashboard /> };
