import { PipelineReport } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { t, useAr } from "./_s-demo";
import { pipelineStages, SAR } from "./_s-demo-reports";

const meta = { title: "Pages/Analytics/CRM Pipeline", component: PipelineReport, parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta<typeof PipelineReport>;
export default meta;
type Story = StoryObj;

function Page({ view }: { view?: "chart" | "table" }) {
  const ar = useAr();
  const [note, setNote] = useState("");
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 sm:p-8">
      <header>
        <h1 className="text-h2 font-semibold">{t(ar, "Sales pipeline", "مسار المبيعات")}</h1>
        <p className="text-body text-muted-foreground">{t(ar, "Where deals are and how many make it through", "أين الصفقات وكم منها يصل إلى النهاية")}</p>
      </header>
      <PipelineReport
        stages={pipelineStages(ar)}
        format={{ ...SAR, notation: "compact" }}
        defaultView={view}
        stageActions={(s) => [{ id: "open", label: t(ar, `List deals in "${s.label}"`, `عرض صفقات "${s.label}"`), onSelect: () => setNote(t(ar, `Listing ${s.label}`, `عرض ${s.label}`)) }]}
      />
      <p role="status" className="min-h-5 text-caption text-muted-foreground">
        {note}
      </p>
    </main>
  );
}

export const Default: Story = { render: () => <Page /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
export const TableView: Story = { render: () => <Page view="table" /> };
