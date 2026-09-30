import { ProfitabilityReport, ReportExportMenu, ReportFilterBar, ReportSheet, useReportFilters } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { REPORT_NOW, t, useAr, wait } from "./_s-demo";
import { profitRows, SAR } from "./_s-demo-reports";

const meta = { title: "Pages/Analytics/Profitability", component: ProfitabilityReport, parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta<typeof ProfitabilityReport>;
export default meta;
type Story = StoryObj;

function Page({ loading = false }: { loading?: boolean }) {
  const ar = useAr();
  const filters = useReportFilters({ fields: [], defaultRange: { kind: "relative", preset: "30d" }, syncLocation: false });
  const [note, setNote] = useState("");
  const rows = profitRows(ar);
  const title = t(ar, "Profitability", "الربحية");
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 sm:p-8">
      <ReportFilterBar fields={[]} state={filters.state} defaults={filters.defaults} onStateChange={filters.setState} range={{ timeZone: "Asia/Riyadh", now: REPORT_NOW }} />
      <ReportSheet
        title={title}
        subtitle={t(ar, "Revenue, cost and margin by project", "الإيرادات والتكلفة والهامش حسب المشروع")}
        generatedAt={REPORT_NOW}
        timeZone="Asia/Riyadh"
        toolbar={
          <ReportExportMenu
            filename="profitability"
            document={() => ({
              title,
              sections: [{ heading: title, table: { columns: [t(ar, "Project", "المشروع"), t(ar, "Revenue", "الإيرادات"), t(ar, "Cost", "التكلفة")], rows: rows.map((r) => [r.name, r.revenue, r.cost]) } }],
            })}
          />
        }
      >
        <ProfitabilityReport
          rows={rows}
          format={SAR}
          subjectLabel={t(ar, "Project", "المشروع")}
          loading={loading}
          rowActions={(r) => [
            { id: "open", label: t(ar, `Open ${r.name}`, `فتح ${r.name}`), onSelect: () => setNote(t(ar, `Opened ${r.name}`, `فُتح ${r.name}`)) },
            {
              id: "invoice",
              label: t(ar, "Draft invoice", "مسودة فاتورة"),
              group: "money",
              onSelect: async () => {
                await wait(200);
                setNote(t(ar, `Invoice drafted for ${r.name}`, `أُنشئت مسودة فاتورة لـ${r.name}`));
              },
            },
          ]}
        />
      </ReportSheet>
      <p role="status" className="min-h-5 text-caption text-muted-foreground">
        {note}
      </p>
    </main>
  );
}

export const Default: Story = { render: () => <Page /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
export const Loading: Story = { render: () => <Page loading /> };
