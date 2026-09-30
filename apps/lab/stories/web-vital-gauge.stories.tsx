import { WEB_VITAL_IDS, WebVitalGauge, WebVitalGaugeGrid, type WebVitalId } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { vitalsReport } from "./_analytics-demo";

const meta = { title: "Components/Analytics/Web Vital Gauge", component: WebVitalGauge, parameters: { layout: "padded" } } satisfies Meta<typeof WebVitalGauge>;
export default meta;
type Story = StoryObj;

function Grid() {
  const d = vitalsReport(28, "mobile");
  const [sel, setSel] = useState<WebVitalId>("LCP");
  return (
    <WebVitalGaugeGrid>
      {WEB_VITAL_IDS.map((id) => (
        <WebVitalGauge key={id} metric={id} value={d.vitals[id]?.p75} previous={d.vitals[id]?.previous} distribution={d.vitals[id]?.distribution} selected={sel === id} onSelect={setSel} />
      ))}
    </WebVitalGaugeGrid>
  );
}

export const Default: Story = { render: () => <Grid /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Grid /> };
export const Ratings: Story = {
  render: () => (
    <WebVitalGaugeGrid>
      <WebVitalGauge metric="LCP" value={1900} distribution={{ good: 0.86, needsImprovement: 0.09, poor: 0.05 }} />
      <WebVitalGauge metric="LCP" value={3200} distribution={{ good: 0.5, needsImprovement: 0.32, poor: 0.18 }} />
      <WebVitalGauge metric="LCP" value={5600} distribution={{ good: 0.2, needsImprovement: 0.3, poor: 0.5 }} />
    </WebVitalGaugeGrid>
  ),
};
export const OnTheThreshold: Story = {
  render: () => (
    <WebVitalGaugeGrid>
      <WebVitalGauge metric="INP" value={200} />
      <WebVitalGauge metric="CLS" value={0.1} />
      <WebVitalGauge metric="CLS" value={0.26} />
    </WebVitalGaugeGrid>
  ),
};
export const NoData: Story = { render: () => <WebVitalGauge className="max-w-xs" metric="INP" /> };
