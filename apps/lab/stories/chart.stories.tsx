import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ChartContainer,
  type ChartConfig,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  MiniBar,
  NasaqProvider,
  Sparkline,
  useChartAxis,
  useNasaq,
} from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from "recharts";

const meta = { title: "Components/Charts & Maps/Chart", component: ChartContainer, parameters: { layout: "padded" } } satisfies Meta<typeof ChartContainer>;
export default meta;
type Story = StoryObj;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو"];
const REVENUE = [18600, 30500, 23700, 47300, 39000, 52100];
const COST = [12000, 18400, 16100, 24800, 22000, 27500];

const rows = (months: string[]) => months.map((month, i) => ({ month, revenue: REVENUE[i]!, cost: COST[i]! }));

const en: ChartConfig = { revenue: { label: "Revenue" }, cost: { label: "Cost", color: "var(--nq-tag-amber)" } };
const ar: ChartConfig = { revenue: { label: "الإيرادات" }, cost: { label: "التكاليف", color: "var(--nq-tag-amber)" } };

const SAR = { style: "currency", currency: "SAR", notation: "compact", maximumFractionDigits: 1 } as const;

function Panel({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function AreaDemo({ config, months, label }: { config: ChartConfig; months: string[]; label: string }) {
  const { xAxis, yAxis } = useChartAxis();
  return (
    <ChartContainer config={config} label={label} className="aspect-auto h-64">
      <AreaChart data={rows(months)} margin={{ left: 4, right: 4 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} {...xAxis} />
        <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={(v: number) => `${v / 1000}k`} {...yAxis} />
        <ChartTooltip content={<ChartTooltipContent config={config} valueFormat={SAR} />} />
        <Area dataKey="cost" type="monotone" stroke="var(--color-cost)" fill="var(--color-cost)" fillOpacity={0.15} strokeWidth={2} />
        <Area dataKey="revenue" type="monotone" stroke="var(--color-revenue)" fill="var(--color-revenue)" fillOpacity={0.15} strokeWidth={2} />
        <ChartLegend content={<ChartLegendContent config={config} />} />
      </AreaChart>
    </ChartContainer>
  );
}

export const AreaChartStory: Story = {
  name: "Area",
  render: () => (
    <Panel title="Revenue and cost" description="Last six months, SAR.">
      <AreaDemo config={en} months={MONTHS} label="Revenue and cost, January to June" />
    </Panel>
  ),
};

function BarDemo({ config, months, label }: { config: ChartConfig; months: string[]; label: string }) {
  const { xAxis, yAxis } = useChartAxis();
  return (
    <ChartContainer config={config} label={label} className="aspect-auto h-64">
      <BarChart data={rows(months)}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} {...xAxis} />
        <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={(v: number) => `${v / 1000}k`} {...yAxis} />
        <ChartTooltip content={<ChartTooltipContent config={config} valueFormat={SAR} />} />
        <ChartLegend content={<ChartLegendContent config={config} />} />
        <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="cost" fill="var(--color-cost)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

export const BarChartStory: Story = {
  name: "Bar",
  render: () => (
    <Panel title="Revenue vs cost" description="Grouped by month.">
      <BarDemo config={en} months={MONTHS} label="Revenue and cost by month" />
    </Panel>
  ),
};

function LineDemo({ config, months, label }: { config: ChartConfig; months: string[]; label: string }) {
  const { xAxis, yAxis } = useChartAxis();
  return (
    <ChartContainer config={config} label={label} className="aspect-auto h-64">
      <LineChart data={rows(months)} margin={{ left: 4, right: 4 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} {...xAxis} />
        <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={(v: number) => `${v / 1000}k`} {...yAxis} />
        <ChartTooltip content={<ChartTooltipContent config={config} valueFormat={SAR} />} />
        <ChartLegend content={<ChartLegendContent config={config} />} />
        <Line dataKey="revenue" type="monotone" stroke="var(--color-revenue)" strokeWidth={2} dot={false} />
        <Line dataKey="cost" type="monotone" stroke="var(--color-cost)" strokeWidth={2} dot={false} strokeDasharray="4 3" />
      </LineChart>
    </ChartContainer>
  );
}

export const LineChartStory: Story = {
  name: "Line",
  render: () => (
    <Panel title="Trend" description="Cost is dashed so the two lines differ without colour.">
      <LineDemo config={en} months={MONTHS} label="Revenue and cost trend" />
    </Panel>
  ),
};

const donutConfig: ChartConfig = {
  design: { label: "Design" },
  web: { label: "Web" },
  mobile: { label: "Mobile" },
  ops: { label: "Ops" },
};
const donutData = [
  { name: "design", value: 24 },
  { name: "web", value: 46 },
  { name: "mobile", value: 20 },
  { name: "ops", value: 10 },
];

export const Donut: Story = {
  render: () => (
    <Panel title="Hours by team" description="Share of tracked time this sprint.">
      <ChartContainer config={donutConfig} label="Hours by team" className="aspect-auto h-64">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent config={donutConfig} valueFormat={{ style: "unit", unit: "percent" }} hideLabel />} />
          <Pie data={donutData} dataKey="value" nameKey="name" innerRadius="60%" outerRadius="90%" paddingAngle={2} strokeWidth={0}>
            {donutData.map((d) => (
              <Cell key={d.name} fill={`var(--color-${d.name})`} />
            ))}
          </Pie>
          <ChartLegend content={<ChartLegendContent config={donutConfig} />} />
        </PieChart>
      </ChartContainer>
    </Panel>
  ),
};

const TREND = [4, 6, 5, 9, 8, 12, 11, 15, 14, 19, 18, 22];

export const Tiny: Story = {
  name: "Sparkline and MiniBar",
  render: () => (
    <div className="flex max-w-md flex-col gap-6">
      <table className="w-full text-body-sm">
        <tbody>
          {[
            ["Signups", TREND, "var(--primary)"],
            ["Churn", [...TREND].reverse(), "var(--nq-danger)"],
            ["Trials", [3, 3, 4, 3, 5, 4, 4, 6, 5, 5, 6, 6], "var(--nq-tag-teal)"],
          ].map(([name, data, color]) => (
            <tr key={name as string} className="border-b border-border last:border-0">
              <td className="py-2 text-muted-foreground">{name as string}</td>
              <td className="py-2">
                <div className="flex justify-end">
                  <Sparkline data={data as number[]} color={color as string} label={`${name as string}, last 12 weeks`} />
                </div>
              </td>
              <td className="py-2">
                <div className="flex justify-end">
                  <MiniBar data={data as number[]} color={color as string} highlight={11} className="w-20" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Sparkline data={TREND} fill={false} className="h-6 w-24" />
    </div>
  ),
};

function Scope({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useNasaq();
  return (
    <NasaqProvider target="scope" locale="ar" theme={resolvedTheme} className="contents">
      {children}
    </NasaqProvider>
  );
}

/** RTL: the X axis runs right to left, the Y axis sits on the right, tooltip figures use the Arabic locale. */
export const ArabicRtl: Story = {
  name: "Arabic RTL",
  render: () => (
    <Scope>
      <div className="flex flex-col gap-6">
        <Panel title="الإيرادات والتكاليف" description="آخر ستة أشهر، بالريال السعودي.">
          <AreaDemo config={ar} months={MONTHS_AR} label="الإيرادات والتكاليف من يناير إلى يونيو" />
        </Panel>
        <Panel title="مقارنة شهرية" description="الإيرادات مقابل التكاليف.">
          <BarDemo config={ar} months={MONTHS_AR} label="الإيرادات والتكاليف حسب الشهر" />
        </Panel>
        <div className="flex items-center gap-4">
          <span className="text-body-sm text-muted-foreground">المشتركون</span>
          <Sparkline data={TREND} label="المشتركون، آخر ١٢ أسبوعا" />
          <MiniBar data={TREND} highlight={11} />
        </div>
      </div>
    </Scope>
  ),
};
