import { FunnelSteps, ProgressRing, SegmentBar, TrendCell, type DataTableColumn, DataTable, useDataTable } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { channelSegments, funnelSteps, trendRows, useAr } from "./_s-demo";

const meta = { title: "Components/Charts/Extra Charts", component: SegmentBar, parameters: { layout: "padded" } } satisfies Meta<typeof SegmentBar>;
export default meta;
type Story = StoryObj;

function Gallery() {
  const ar = useAr();
  const rows = trendRows(ar);
  const columns: DataTableColumn<(typeof rows)[number]>[] = [
    { id: "name", header: ar ? "الفرع" : "Branch", cell: (r) => r.name, sortValue: (r) => r.name },
    {
      id: "revenue",
      header: ar ? "الإيرادات" : "Revenue",
      align: "end",
      cell: (r) => (
        <TrendCell value={r.revenue} format={{ style: "currency", currency: "SAR", maximumFractionDigits: 0 }} delta={r.change} data={r.weeks} chartLabel={ar ? "الإيرادات، آخر 8 أسابيع" : "Revenue, last 8 weeks"} />
      ),
      sortValue: (r) => r.revenue,
    },
    {
      id: "orders",
      header: ar ? "الطلبات" : "Orders",
      align: "end",
      cell: (r) => <TrendCell value={Math.round(r.revenue / 210)} variant="bar" data={r.weeks} delta={-r.change / 2} invert />,
    },
  ];
  const table = useDataTable({ data: rows, columns, getRowId: (r) => r.id });
  return (
    <div className="grid max-w-5xl gap-8">
      <section className="grid gap-3">
        <h3 className="text-h4">{ar ? "شريط النِّسَب" : "Segment bar"}</h3>
        <SegmentBar segments={channelSegments(ar)} />
        <SegmentBar size="sm" patterned total={12} restLabel={ar ? "مقاعد شاغرة" : "Free seats"} segments={[{ id: "a", label: ar ? "مشرفون" : "Admins", value: 3 }, { id: "b", label: ar ? "أعضاء" : "Members", value: 6 }]} />
      </section>
      <section className="flex flex-wrap items-start gap-8">
        <ProgressRing value={72} label={ar ? "الإعداد" : "Onboarding"} caption={ar ? "من 25 خطوة" : "of 25 steps"} />
        <ProgressRing value={86} tone="auto" label={ar ? "التخزين" : "Storage"} caption="43 / 50 GB" />
        <ProgressRing value={97} tone="auto" label={ar ? "حصة الرسائل" : "Message quota"} caption="97%" />
        <ProgressRing value={3} max={5} tone="success" label={ar ? "الأهداف" : "Goals"}>
          3/5
        </ProgressRing>
      </section>
      <section className="max-w-xl">
        <FunnelSteps steps={funnelSteps(ar)} />
      </section>
      <section>
        <DataTable table={table} label={ar ? "الإيرادات حسب الفرع" : "Revenue by branch"} />
      </section>
    </div>
  );
}

export const Default: Story = { render: () => <Gallery /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Gallery /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Gallery /> };
