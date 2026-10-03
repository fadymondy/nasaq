import { Button, InterimBadge } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";
import { useAr } from "./_auth";

const meta = { title: "Components/Data Display/Interim Badge", component: InterimBadge } satisfies Meta<typeof InterimBadge>;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <InterimBadge /> };

/** `pending={false}`: no more data is coming, but the figure is still provisional. */
export const Settled: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <InterimBadge />
      <InterimBadge pending={false} label="Preliminary" />
    </div>
  ),
};

/** A total that fills in as sources report, then drops the badge. */
function Streaming() {
  const ar = useAr();
  const [reported, setReported] = useState(0);
  useEffect(() => {
    if (reported >= 4) return;
    const id = setTimeout(() => setReported((n) => n + 1), 900);
    return () => clearTimeout(id);
  }, [reported]);
  const total = [0, 12400, 19850, 27310, 31920][reported]!;
  return (
    <div className="flex w-72 flex-col gap-3 rounded-card border border-border p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-label text-muted-foreground">{ar ? "إيراد الشهر" : "Revenue this month"}</span>
        {reported < 4 ? <InterimBadge /> : null}
      </div>
      <span className="text-h3 tabular-nums text-foreground">{new Intl.NumberFormat(ar ? "ar" : "en", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(total)}</span>
      <span className="text-caption text-muted-foreground" role="status">
        {ar ? `${reported} من ٤ مصادر` : `${reported} of 4 sources reported`}
      </span>
      <Button variant="secondary" size="sm" onClick={() => setReported(0)}>
        {ar ? "إعادة" : "Replay"}
      </Button>
    </div>
  );
}

export const InAStatCard: Story = { name: "In a stat card", render: () => <Streaming /> };

export const Arabic: Story = {
  globals: { locale: "ar" },
  render: () => (
    <div className="flex flex-col gap-4">
      <InterimBadge />
      <Streaming />
    </div>
  ),
};
