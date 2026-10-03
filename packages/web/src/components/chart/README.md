---
name: chart
title: ChartContainer
category: charts
status: beta
summary: Themed Recharts wrapper (shadcn style) with token colours, a Nasaq-formatted tooltip and legend, RTL axis helpers, plus tiny Sparkline and MiniBar for table cells and cards.
exports: [ChartContainer, ChartContainerProps, ChartConfig, ChartSeries, ChartTooltip, ChartTooltipContent, ChartTooltipContentProps, ChartLegend, ChartLegendContent, ChartLegendContentProps, useChartAxis, CHART_COLORS, Sparkline, SparklineProps, MiniBar, MiniBarProps]
related: [stat-card, numeric, card, data-table]
story: components-charts-maps-chart
base-ui: []
keywords: [chart, graph, recharts, area, bar, line, donut, pie, sparkline, mini bar, tooltip, legend, rtl, analytics]
---

# ChartContainer

Recharts is the drawing engine; Nasaq supplies the frame. `ChartContainer` sizes the chart, turns the `config` you give it
into `--color-<key>` CSS variables, and re-colours Recharts' axes, grid and cursor with theme tokens so charts follow light,
dark and brand. `ChartTooltip` and `ChartLegend` render Nasaq-styled content, and tooltip figures go through `Num`'s
formatting in the active locale. `Sparkline` and `MiniBar` are the axis-less versions for cells and cards.

You write the Recharts chart yourself (`AreaChart`, `BarChart`, `LineChart`, `PieChart`, ...), so every Recharts feature stays available.

## When to use

- Trends, comparisons and shares in dashboards and reports.
- A small trend or bar strip beside a figure or inside a table row (`Sparkline`, `MiniBar`).

## When not to use

- A single number: use [`StatCard`](../stat-card/README.md).
- Exact values people must scan or copy: use [`DataTable`](../data-table/README.md), optionally with a `Sparkline` column.
- Progress toward a goal: use [`Progress`](../progress/README.md).

## Import

```tsx
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, useChartAxis, Sparkline, MiniBar,
  type ChartConfig,
} from "@fadymondy/nasaq/web";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
```

`recharts` is a dependency of `@nasaq/web`; import chart parts from it directly.

## Quick start

```tsx
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, useChartAxis, type ChartConfig } from "@fadymondy/nasaq/web";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

const config: ChartConfig = {
  revenue: { label: "Revenue" },
  cost: { label: "Cost", color: "var(--nq-tag-amber)" },
};

const data = [
  { month: "Jan", revenue: 18600, cost: 12000 },
  { month: "Feb", revenue: 30500, cost: 18400 },
  { month: "Mar", revenue: 23700, cost: 16100 },
];

export function RevenueChart() {
  const { xAxis, yAxis } = useChartAxis();
  return (
    <ChartContainer config={config} label="Revenue and cost, January to March" className="aspect-auto h-64">
      <AreaChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} {...xAxis} />
        <YAxis tickLine={false} axisLine={false} width={48} {...yAxis} />
        <ChartTooltip content={<ChartTooltipContent config={config} valueFormat={{ style: "currency", currency: "SAR", maximumFractionDigits: 0 }} />} />
        <Area dataKey="cost" stroke="var(--color-cost)" fill="var(--color-cost)" fillOpacity={0.15} />
        <Area dataKey="revenue" stroke="var(--color-revenue)" fill="var(--color-revenue)" fillOpacity={0.15} />
        <ChartLegend content={<ChartLegendContent config={config} />} />
      </AreaChart>
    </ChartContainer>
  );
}
```

## Anatomy

```
ChartContainer            data-slot="chart"          (sets --color-<key>, ResponsiveContainer inside)
  <AreaChart | BarChart | LineChart | PieChart>      (Recharts)
    ChartTooltip > ChartTooltipContent   data-slot="chart-tooltip"
    ChartLegend  > ChartLegendContent    data-slot="chart-legend"
Sparkline                 data-slot="sparkline"
MiniBar                   data-slot="mini-bar"
```

## API

### ChartContainer

Extends `div` props (except `children`).

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `config` | `ChartConfig` | required | Series key to `{ label, color }`. Defines `--color-<key>`. |
| `children` | `ReactElement` | required | One Recharts chart. |
| `label` | `string` | none | Accessible name (`role="img"`). Summarise the chart; localise it. |
| `className` | `string` | none | Default is `aspect-video w-full`. Use `aspect-auto h-64` for a fixed height. |

### ChartConfig / ChartSeries

`type ChartConfig = Record<string, ChartSeries>`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `label` | `ReactNode` | the key / series name | Shown in tooltip and legend. |
| `color` | `string` | `CHART_COLORS[index]` | A CSS colour, normally a token. |

`CHART_COLORS` is the default palette: `--primary`, then `--nq-tag-blue`, `teal`, `amber`, `violet`, `pink`, `orange`, `green`.

### ChartTooltip, ChartTooltipContent

`ChartTooltip` is Recharts' `Tooltip` with a default Nasaq content. Pass your own `content` to give it a config.

| Prop (ChartTooltipContent) | Type | Default | Description |
| --- | --- | --- | --- |
| `config` | `ChartConfig` | `{}` | Labels for series. |
| `valueFormat` | `FormatNumberOptions` | none | Intl options for the figures, formatted in the active locale (Western digits by default). |
| `labelFormatter` | `(label) => ReactNode` | none | Format the heading. |
| `hideLabel` | `boolean` | `false` | Hide the heading (donuts). |

### ChartLegend, ChartLegendContent

`ChartLegend` is Recharts' `Legend` (bottom). `ChartLegendContent` takes `config` and renders colour key + label.

### useChartAxis

`useChartAxis(): { isRtl: boolean; xAxis: { reversed: boolean }; yAxis: { orientation: "left" | "right" } }`

Spread `xAxis` on `<XAxis>` and `yAxis` on `<YAxis>`. In RTL the X axis runs right to left and the Y axis sits on the right.

### Sparkline

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | `(number \| { value: number })[]` | required | Values in order. |
| `color` | `string` | `var(--primary)` | Line colour (a token). |
| `fill` | `boolean` | `true` | Gradient area under the line. |
| `label` | `string` | none | Screen-reader summary. Without it the sparkline is `aria-hidden`. |
| `className` | `string` | `h-8 w-32` | Size it here. |

### MiniBar

Same as `Sparkline` without `fill`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `highlight` | `number` | none | Index of the bar to emphasise; the others are dimmed. |

## Examples

Donut with per-slice colours:

```tsx
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@fadymondy/nasaq/web";
import { Cell, Pie, PieChart } from "recharts";

const config: ChartConfig = { web: { label: "Web" }, mobile: { label: "Mobile" } };
const data = [{ name: "web", value: 60 }, { name: "mobile", value: 40 }];

export const Donut = () => (
  <ChartContainer config={config} label="Hours by team" className="aspect-auto h-64">
    <PieChart>
      <ChartTooltip content={<ChartTooltipContent config={config} hideLabel />} />
      <Pie data={data} dataKey="value" nameKey="name" innerRadius="60%" strokeWidth={0}>
        {data.map((d) => <Cell key={d.name} fill={`var(--color-${d.name})`} />)}
      </Pie>
      <ChartLegend content={<ChartLegendContent config={config} />} />
    </PieChart>
  </ChartContainer>
);
```

Sparkline in a table cell:

```tsx
import { Sparkline } from "@fadymondy/nasaq/web";

export const Cell = () => <Sparkline data={[4, 6, 5, 9, 12]} label="Signups, last 5 weeks" className="h-6 w-20" />;
```

Arabic: pass Arabic labels in `config` and month names in the data; the axes mirror on their own inside an RTL provider.

```tsx
import { ChartContainer, useChartAxis, type ChartConfig } from "@fadymondy/nasaq/web";
import { Bar, BarChart, XAxis, YAxis } from "recharts";

const config: ChartConfig = { revenue: { label: "الإيرادات" } };

export function ArabicBars() {
  const { xAxis, yAxis } = useChartAxis();
  return (
    <ChartContainer config={config} label="الإيرادات حسب الشهر" className="aspect-auto h-64">
      <BarChart data={[{ month: "يناير", revenue: 18600 }, { month: "فبراير", revenue: 30500 }]}>
        <XAxis dataKey="month" {...xAxis} />
        <YAxis {...yAxis} />
        <Bar dataKey="revenue" fill="var(--color-revenue)" />
      </BarChart>
    </ChartContainer>
  );
}
```

## Accessibility

A chart is an image to assistive tech. Give `ChartContainer` a `label` that states the takeaway, and show the exact values elsewhere
(a table or the nearby `StatCard`). Series are told apart by more than colour: use `strokeDasharray`, markers or direct labels when
two series must be distinguished for colour-blind readers.

| Key | Action |
| --- | --- |
| none | The Recharts SVG is not focusable; hover tooltips are a pointer convenience, not the only way to read values. |

`Sparkline` / `MiniBar` are `aria-hidden` unless you pass `label`. Localise `label` and every `config` label.

## RTL & i18n

- The chart frame keeps SVG geometry as Recharts draws it; `useChartAxis` sets `reversed` on the X axis and `orientation="right"` on the Y axis in RTL, so time reads right to left.
- `Sparkline` and `MiniBar` reverse their X axis in RTL automatically.
- Tooltip figures use the active locale (grouping, decimal mark, currency placement) with Western digits; pass `numberingSystem: "arab"` in `valueFormat` for Arabic-Indic digits.
- Axis tick numbers come from Recharts; pass `tickFormatter` (for example `useFormatNumber()`) to localise them.

## Styling & tokens

- Colours: `--primary`, `--nq-tag-*`, `--nq-success`, `--nq-danger`, `--border`, `--muted`, `--muted-foreground`, popover tokens for the tooltip. Never use hex.
- Override a series colour with `config[key].color` (a token) rather than on the Recharts element.
- `--color-<key>` is available to any child: `stroke="var(--color-revenue)"`.
- Size with `className` on `ChartContainer` (`aspect-auto h-64`, `aspect-square`).

## Do / Don't

- Do label every chart and give it units through `valueFormat`.
- Do use at most 5 or 6 series; group the rest as "Other".
- Don't rely on colour alone for meaning.
- Don't use raw hex; use tokens.
- Don't use a donut for more than about 5 slices; use a bar chart.

## Related

- [`StatCard`](../stat-card/README.md)
- [`Num`](../numeric/README.md)
- [`Card`](../card/README.md)
- [`DataTable`](../data-table/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-charts-maps-chart--docs
