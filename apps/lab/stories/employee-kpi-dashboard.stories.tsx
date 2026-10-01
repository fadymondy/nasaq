import { EmployeeKpiDashboard } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { t, useAr } from "./_s-demo";
import { employeeKpis } from "./_s-demo-reports";

const meta = { title: "Components/Analytics/Pages/Employee KPIs", component: EmployeeKpiDashboard, parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta<typeof EmployeeKpiDashboard>;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  const [note, setNote] = useState("");
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 sm:p-8">
      <header>
        <h1 className="text-h2 font-semibold">{t(ar, "Team performance", "أداء الفريق")}</h1>
        <p className="text-body text-muted-foreground">{t(ar, "Billable hours against each person's monthly target", "الساعات المفوترة مقابل هدف كل شخص الشهري")}</p>
      </header>
      <EmployeeKpiDashboard
        employees={employeeKpis(ar)}
        format={{ style: "unit", unit: "hour", unitDisplay: "short", maximumFractionDigits: 0 }}
        measure={t(ar, "Billable hours", "الساعات المفوترة")}
        actions={(e) => [
          { id: "open", label: t(ar, `Open ${e.name}`, `فتح ${e.name}`), onSelect: () => setNote(t(ar, `Opened ${e.name}`, `فُتح ${e.name}`)) },
          { id: "nudge", label: t(ar, "Send a check-in", "إرسال متابعة"), group: "more", onSelect: () => setNote(t(ar, `Check-in sent to ${e.name}`, `أُرسلت متابعة إلى ${e.name}`)) },
        ]}
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
