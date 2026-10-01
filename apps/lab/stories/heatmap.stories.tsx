import { Heatmap, type HeatmapDatum, NasaqProvider, useNasaq } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useMemo } from "react";

const meta = { title: "Components/Charts & Maps/Heatmap", component: Heatmap } satisfies Meta<typeof Heatmap>;
export default meta;
type Story = StoryObj;

const useAr = () => useNasaq().locale.startsWith("ar");

function ArabicScope({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useNasaq();
  return (
    <NasaqProvider target="scope" locale="ar" theme={resolvedTheme} className="contents">
      {children}
    </NasaqProvider>
  );
}

const END = new Date(2026, 8, 29);

/** Deterministic pseudo-random activity: quiet weekends, a busy stretch in the summer. */
function sample(days: number): HeatmapDatum[] {
  const out: HeatmapDatum[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(END.getFullYear(), END.getMonth(), END.getDate() - i);
    const wave = Math.sin(i / 9) + Math.sin(i / 23) * 1.5;
    const weekend = d.getDay() === 5 || d.getDay() === 6;
    const n = Math.max(0, Math.round((wave + 1.2) * (weekend ? 1 : 4) + ((i * 7919) % 5) - 2));
    if (n > 0) out.push({ date: d, count: n });
  }
  return out;
}

function Year() {
  const ar = useAr();
  const data = useMemo(() => sample(400), []);
  return (
    <div className="flex max-w-full flex-col gap-2">
      <h3 className="text-h3 text-foreground">{ar ? "الالتزامات خلال السنة" : "Commits in the last year"}</h3>
      <Heatmap data={data} to={END} label={ar ? "الالتزامات حسب اليوم" : "Commits by day"} />
    </div>
  );
}

/** One column per week, five levels of one token colour, a tooltip per day and a legend. Hover or focus a cell and use the arrows. */
export const Default: Story = { render: () => <Year /> };

/** Under an Arabic provider the time axis runs right to left, the week starts on Saturday and labels are Arabic. */
export const Arabic: Story = {
  render: () => (
    <ArabicScope>
      <div className="p-2">
        <Year />
      </div>
    </ArabicScope>
  ),
};

function Quarter() {
  const ar = useAr();
  const data = useMemo(() => sample(120), []);
  return (
    <Heatmap
      data={data}
      from={new Date(2026, 6, 1)}
      to={END}
      color="var(--nq-tag-teal)"
      cellSize={16}
      gap={4}
      thresholds={[1, 4, 8, 12]}
      label={ar ? "الطلبات حسب اليوم" : "Orders by day"}
      formatCount={(n) => (ar ? `${n} طلب` : `${n} orders`)}
    />
  );
}

/** A custom range, colour, cell size, fixed thresholds and unit text. */
export const CustomRange: Story = {
  name: "Custom range (English and Arabic)",
  render: () => (
    <div className="flex max-w-full flex-col gap-6">
      <Quarter />
      <ArabicScope>
        <Quarter />
      </ArabicScope>
    </div>
  ),
};
