import { HealthReport } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { engineReports, reportDays } from "./_health-demo";

const meta = { title: "Components/Wellness/Health Reports", component: HealthReport, parameters: { layout: "padded" } } satisfies Meta<typeof HealthReport>;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <HealthReport days={reportDays(30)} engines={engineReports(30)} period={30} onExport={async () => {}} /> };
export const Week: Story = { render: () => <HealthReport days={reportDays(7)} engines={engineReports(7)} period={7} /> };
export const Empty: Story = { render: () => <HealthReport days={[]} /> };
export const Loading: Story = { render: () => <HealthReport days={[]} loading /> };
export const Failed: Story = { render: () => <HealthReport days={[]} error="The report service is not reachable." onRetry={() => {}} /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <HealthReport days={reportDays(30)} engines={engineReports(30)} period={30} onExport={async () => {}} /> };
