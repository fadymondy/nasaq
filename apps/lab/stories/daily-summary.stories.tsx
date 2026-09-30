import { DailySummary } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { summaryFor, TODAY } from "./_health-demo";

const meta = { title: "Components/Health/Daily Summary", component: DailySummary, parameters: { layout: "padded" } } satisfies Meta<typeof DailySummary>;
export default meta;
type Story = StoryObj;

function Stepper() {
  const [date, setDate] = useState(TODAY);
  return <DailySummary summary={summaryFor(date)} maxDate={TODAY} waterGoalMl={3000} onDateChange={setDate} />;
}

export const Default: Story = { render: () => <Stepper /> };
export const NotSynced: Story = { render: () => <DailySummary summary={{ date: TODAY, waterMl: 1500, meals: { total: 2, safe: 2, unsafe: 0 }, source: "web" }} /> };
export const Empty: Story = { render: () => <DailySummary date={TODAY} /> };
export const Loading: Story = { render: () => <DailySummary date={TODAY} loading /> };
export const Failed: Story = { render: () => <DailySummary date={TODAY} error="The server could not read this day." onRetry={() => {}} /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Stepper /> };
