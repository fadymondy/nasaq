import { SupportStatsReport } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { t, useAr } from "./_s-demo";
import { supportAgents, supportStatus, supportSummary, supportVolume } from "./_s-demo-reports";

const meta = { title: "Components/Analytics/Pages/Support Stats", component: SupportStatsReport, parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta<typeof SupportStatsReport>;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  const [note, setNote] = useState("");
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 sm:p-8">
      <header>
        <h1 className="text-h2 font-semibold">{t(ar, "Support inbox", "صندوق الدعم")}</h1>
        <p className="text-body text-muted-foreground">{t(ar, "The last three weeks", "آخر ثلاثة أسابيع")}</p>
      </header>
      <SupportStatsReport
        summary={supportSummary}
        volume={supportVolume()}
        previousVolume={supportVolume(21, 3)}
        byStatus={supportStatus(ar)}
        agents={supportAgents(ar)}
        agentActions={(a) => [{ id: "open", label: t(ar, `Open ${a.name}'s queue`, `فتح قائمة ${a.name}`), onSelect: () => setNote(t(ar, `Opened ${a.name}'s queue`, `فُتحت قائمة ${a.name}`)) }]}
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
