import { PeriodToggle, TimeSeriesPanel } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { dayRange, gaReport, useAr } from "./_analytics-demo";

const meta = { title: "Components/Monitoring/Time Series Panel", component: TimeSeriesPanel, parameters: { layout: "padded" } } satisfies Meta<typeof TimeSeriesPanel>;
export default meta;
type Story = StoryObj;

function Demo({ state }: { state?: "loading" | "error" | "empty" }) {
  const ar = useAr();
  const [period, setPeriod] = useState(28);
  const d = gaReport(period, ar);
  return (
    <TimeSeriesPanel
      title={ar ? "الزيارات" : "Traffic"}
      description={ar ? "الإجماليات اليومية" : "Daily totals"}
      metrics={[
        { id: "users", label: ar ? "المستخدمون" : "Users", color: "var(--primary)" },
        { id: "sessions", label: ar ? "الجلسات" : "Sessions", color: "var(--nq-tag-teal)" },
      ]}
      data={state === "empty" ? [] : d.series}
      previousData={d.previousSeries}
      defaultCompare
      action={<PeriodToggle value={period} onValueChange={setPeriod} />}
      loading={state === "loading"}
      error={state === "error" ? (ar ? "انتهت مهلة الطلب." : "The request timed out.") : undefined}
      onRetry={() => undefined}
    />
  );
}

export const Default: Story = { render: () => <Demo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
export const Loading: Story = { render: () => <Demo state="loading" /> };
export const ErrorState: Story = { render: () => <Demo state="error" /> };
export const Empty: Story = { render: () => <Demo state="empty" /> };
export const WithReferenceLines: Story = {
  render: () => (
    <TimeSeriesPanel
      title="LCP (p75)"
      metrics={[{ id: "lcp", label: "LCP (ms)", aggregate: "avg", lowerIsBetter: true }]}
      data={dayRange(21).map((date, i) => ({ date, lcp: 2400 + ((i * 137) % 900) }))}
      referenceLines={[
        { value: 2500, label: "Good 2.5 s", tone: "success" },
        { value: 4000, label: "Poor 4 s", tone: "danger" },
      ]}
    />
  ),
};
