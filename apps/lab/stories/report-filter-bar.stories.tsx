import {
  DataTable,
  type DataTableColumn,
  Num,
  ReportExportMenu,
  ReportFilterBar,
  type ReportDoc,
  ReportSheet,
  resolveTimeRange,
  serializeTimeRange,
  SavedReportViews,
  type SavedReportView,
  SegmentBar,
  StatCard,
  StatGrid,
  useDataTable,
  useReportFilters,
} from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMemo, useState } from "react";
import { DEAL_NAMES_AR, DEAL_ROWS, type DealRow, dealFields, REPORT_NOW, t, useAr, wait } from "./_s-demo";

const meta = { title: "Components/Analytics/Report Filter Bar", component: ReportFilterBar, parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta<typeof ReportFilterBar>;
export default meta;
type Story = StoryObj;

const money = { style: "currency", currency: "SAR", maximumFractionDigits: 0 } as const;

function Demo({ syncLocation = false, initialViews = true }: { syncLocation?: boolean; initialViews?: boolean }) {
  const ar = useAr();
  const fields = dealFields(ar);
  const filters = useReportFilters({ fields, defaultRange: { kind: "relative", preset: "30d" }, syncLocation });
  const [views, setViews] = useState<SavedReportView[]>(
    initialViews
      ? [
          { id: "v1", name: t(ar, "Won this month", "المكسوبة هذا الشهر"), query: "status=won&range=30d" },
          { id: "v2", name: t(ar, "Sara's open deals", "صفقات سارة المفتوحة"), query: "status=open&owner=sara&range=30d" },
        ]
      : [],
  );
  const zone = "Asia/Riyadh";

  const rows = useMemo(() => {
    const { from, to } = resolveTimeRange(filters.state.range, { now: REPORT_NOW, timeZone: zone });
    const status = filters.state.fields.status ?? [];
    const owner = filters.state.fields.owner?.[0];
    const channel = filters.state.fields.channel?.[0];
    return DEAL_ROWS.filter((r) => {
      const at = REPORT_NOW.getTime() - r.daysAgo * 86400000;
      return at >= from.getTime() && at < to.getTime() && (!status.length || status.includes(r.status)) && (!owner || r.owner === owner) && (!channel || r.channel === channel);
    });
  }, [filters.state]);

  const name = (r: DealRow) => (ar ? (DEAL_NAMES_AR[r.id] ?? r.name) : r.name);
  const label = (fieldId: string, v: string) => fields.find((f) => f.id === fieldId)?.options.find((o) => o.value === v)?.label ?? v;
  const columns: DataTableColumn<DealRow>[] = [
    { id: "name", header: t(ar, "Deal", "الصفقة"), cell: (r) => name(r), sortValue: name, searchValue: name },
    { id: "owner", header: t(ar, "Owner", "المسؤول"), cell: (r) => label("owner", r.owner), sortValue: (r) => r.owner },
    { id: "status", header: t(ar, "Status", "الحالة"), cell: (r) => label("status", r.status), sortValue: (r) => r.status },
    { id: "amount", header: t(ar, "Amount", "المبلغ"), align: "end", cell: (r) => <Num value={r.amount} format={money} />, sortValue: (r) => r.amount },
  ];
  const table = useDataTable({ data: rows, columns, getRowId: (r) => r.id, pageSize: 6 });

  const total = rows.reduce((a, r) => a + r.amount, 0);
  const by = (s: DealRow["status"]) => rows.filter((r) => r.status === s).reduce((a, r) => a + r.amount, 0);
  const doc = (): ReportDoc => ({
    title: t(ar, "Deals report", "تقرير الصفقات"),
    subtitle: t(ar, "Pipeline value by status", "قيمة المسار حسب الحالة"),
    filters: [
      { label: t(ar, "Period", "الفترة"), value: serializeTimeRange(filters.state.range) },
      ...fields.map((f) => ({ label: f.label, value: (filters.state.fields[f.id] ?? []).map((v) => label(f.id, v)).join(", ") || t(ar, "All", "الكل") })),
    ],
    sections: [
      {
        heading: t(ar, "Totals", "الإجماليات"),
        stats: [
          { label: t(ar, "Deals", "الصفقات"), value: String(rows.length) },
          { label: t(ar, "Value", "القيمة"), value: new Intl.NumberFormat("en", money).format(total) },
        ],
      },
      {
        heading: t(ar, "Deals", "الصفقات"),
        table: { columns: [t(ar, "Deal", "الصفقة"), t(ar, "Owner", "المسؤول"), t(ar, "Status", "الحالة"), t(ar, "Amount", "المبلغ")], rows: rows.map((r) => [name(r), label("owner", r.owner), label("status", r.status), r.amount]) },
      },
    ],
  });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 sm:p-8">
      <ReportFilterBar
        fields={fields}
        state={filters.state}
        defaults={filters.defaults}
        onStateChange={filters.setState}
        comparison
        range={{ timeZone: zone, now: REPORT_NOW }}
      />
      <SavedReportViews
        views={views}
        fields={fields}
        state={filters.state}
        defaults={filters.defaults}
        onApply={(_, next) => filters.setState(next)}
        onSave={async (viewName, query) => {
          await wait(400);
          setViews((v) => [...v, { id: `v${Date.now()}`, name: viewName, query }]);
        }}
        onRename={async (view, viewName) => {
          await wait(300);
          setViews((v) => v.map((x) => (x.id === view.id ? { ...x, name: viewName } : x)));
        }}
        onUpdate={async (view, query) => {
          await wait(300);
          setViews((v) => v.map((x) => (x.id === view.id ? { ...x, query } : x)));
        }}
        onShare={async (view, shared) => {
          await wait(300);
          setViews((v) => v.map((x) => (x.id === view.id ? { ...x, shared } : x)));
          return shared ? `https://app.example.com/reports/deals?${view.query}` : undefined;
        }}
        onDelete={async (view) => {
          await wait(300);
          setViews((v) => v.filter((x) => x.id !== view.id));
        }}
      />
      <ReportSheet
        title={doc().title}
        subtitle={doc().subtitle}
        timeZone={zone}
        generatedAt={REPORT_NOW}
        filters={doc().filters}
        toolbar={<ReportExportMenu document={doc} filename="deals-report" />}
        footer={t(ar, "Figures are in Saudi riyals. Demo data.", "المبالغ بالريال السعودي. بيانات تجريبية.")}
      >
        <section className="flex flex-col gap-4" aria-label={t(ar, "Totals", "الإجماليات")}>
          <StatGrid>
            <StatCard label={t(ar, "Deals", "الصفقات")} value={rows.length} />
            <StatCard label={t(ar, "Value", "القيمة")} value={total} format={money} />
          </StatGrid>
          <SegmentBar
            label={t(ar, "Value by status", "القيمة حسب الحالة")}
            format={money}
            segments={[
              { id: "won", label: t(ar, "Won", "مكسوبة"), value: by("won"), color: "var(--nq-success)" },
              { id: "open", label: t(ar, "Open", "مفتوحة"), value: by("open"), color: "var(--nq-info)" },
              { id: "lost", label: t(ar, "Lost", "خاسرة"), value: by("lost"), color: "var(--nq-danger)" },
            ]}
            patterned
          />
        </section>
        <section aria-label={t(ar, "Deals", "الصفقات")}>
          <DataTable table={table} label={t(ar, "Deals", "الصفقات")} />
        </section>
      </ReportSheet>
      <p className="text-caption text-muted-foreground">
        <bdi dir="ltr" className="font-mono">
          ?{filters.query}
        </bdi>
      </p>
    </main>
  );
}

export const Default: Story = { render: () => <Demo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Demo /> };
export const NoSavedViews: Story = { render: () => <Demo initialViews={false} /> };
