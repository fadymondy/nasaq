import { EndpointTable, ErrorRatePanel, LatencyPercentiles, TraceList } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { apmReport } from "./_analytics-demo";

const meta = { title: "Components/Analytics/APM Panels", component: LatencyPercentiles, parameters: { layout: "padded" } } satisfies Meta<typeof LatencyPercentiles>;
export default meta;
type Story = StoryObj;

const d = apmReport(6);

export const Latency: Story = { render: () => <LatencyPercentiles data={d.latency} summary={d.latencySummary} previous={d.previousLatencySummary} targetMs={500} /> };
export const LatencyArabic: Story = { globals: { locale: "ar" }, render: () => <LatencyPercentiles data={d.latency} summary={d.latencySummary} previous={d.previousLatencySummary} targetMs={500} /> };
export const LatencyLoading: Story = { render: () => <LatencyPercentiles data={[]} loading /> };
export const Errors: Story = { render: () => <ErrorRatePanel data={d.errors} previousRate={d.previousErrorRate} slo={0.01} topErrors={d.topErrors} onErrorClick={() => undefined} /> };
export const ErrorsArabic: Story = { globals: { locale: "ar" }, render: () => <ErrorRatePanel data={d.errors} previousRate={d.previousErrorRate} slo={0.01} topErrors={d.topErrors} onErrorClick={() => undefined} /> };
export const Endpoints: Story = { render: () => <EndpointTable rows={d.endpoints} slowMs={1000} onRowClick={() => undefined} /> };
export const EndpointsArabic: Story = { globals: { locale: "ar" }, render: () => <EndpointTable rows={d.endpoints} slowMs={1000} /> };
export const Traces: Story = { render: () => <TraceList traces={d.traces} slowMs={1000} defaultSelectedId="t1" /> };
export const TracesArabic: Story = { globals: { locale: "ar" }, render: () => <TraceList traces={d.traces} slowMs={1000} defaultSelectedId="t2" /> };
export const Empty: Story = { render: () => <TraceList traces={[]} /> };
