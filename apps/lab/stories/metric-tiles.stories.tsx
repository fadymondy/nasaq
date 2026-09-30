import { type MetricTileData, MetricTiles } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Activity, Clock, Target, Users } from "lucide-react";
import { useState } from "react";
import { useAr } from "./_analytics-demo";

const meta = { title: "Components/Analytics/Metric Tiles", component: MetricTiles, parameters: { layout: "padded" } } satisfies Meta<typeof MetricTiles>;
export default meta;
type Story = StoryObj;

function tiles(ar: boolean): MetricTileData[] {
  return [
    { id: "users", label: ar ? "المستخدمون" : "Users", value: 48210, previous: 42980, sparkline: [4, 6, 5, 9, 8, 12, 11, 15, 14, 19], icon: <Users aria-hidden /> },
    { id: "sessions", label: ar ? "الجلسات" : "Sessions", value: 61240, previous: 58100, sparkline: [8, 9, 7, 10, 12, 11, 13, 12, 15, 16], icon: <Activity aria-hidden /> },
    { id: "bounce", label: ar ? "معدل الارتداد" : "Bounce rate", value: 0.388, previous: 0.412, format: { style: "percent", maximumFractionDigits: 1 }, invert: true, sparkline: [9, 8, 9, 7, 8, 6, 7, 6, 5, 5], icon: <Target aria-hidden /> },
    { id: "time", label: ar ? "متوسط وقت التفاعل" : "Avg. engagement time", value: 98, previous: 104, display: ar ? "1 د 38 ث" : "1m 38s", previousDisplay: ar ? "1 د 44 ث" : "1m 44s", icon: <Clock aria-hidden /> },
  ];
}

function Demo() {
  const ar = useAr();
  const [sel, setSel] = useState("users");
  return <MetricTiles metrics={tiles(ar)} selected={sel} onSelect={setSel} />;
}

export const Default: Story = { render: () => <Demo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
export const ReadOnly: Story = { render: () => <MetricTiles metrics={tiles(false)} comparisonLabel="vs last month" /> };
export const Loading: Story = { render: () => <MetricTiles metrics={[]} loading /> };
