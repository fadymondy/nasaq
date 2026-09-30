import { RealtimeCounter } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";
import { flagEmojiLabel, gaReport, useAr } from "./_analytics-demo";

const meta = { title: "Components/Analytics/Realtime Counter", component: RealtimeCounter, parameters: { layout: "padded" } } satisfies Meta<typeof RealtimeCounter>;
export default meta;
type Story = StoryObj;

function Demo({ live = true }: { live?: boolean }) {
  const ar = useAr();
  const rt = gaReport(7, ar).realtime!;
  const [series, setSeries] = useState<number[]>([...(rt.perMinute ?? [])]);
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => setSeries((s) => [...s.slice(1), Math.max(20, s[s.length - 1]! + Math.round((Math.random() - 0.5) * 12))]), 2500);
    return () => clearInterval(id);
  }, [live]);
  return (
    <RealtimeCounter
      className="max-w-md"
      title={ar ? "الآن" : "Right now"}
      description={ar ? "المستخدمون النشطون في آخر 30 دقيقة" : "Active users in the last 30 minutes"}
      value={series[series.length - 1] ?? 0}
      perMinute={series}
      live={live}
      updatedAt={rt.updatedAt}
      sections={[
        { id: "pages", title: ar ? "أكثر الصفحات نشاطًا" : "Top active pages", ltr: true, rows: rt.pages },
        { id: "countries", title: ar ? "الدول" : "Countries", rows: rt.countries.map((c) => ({ id: c.code, label: flagEmojiLabel(c.code, ar), value: c.value })) },
      ]}
    />
  );
}

export const Default: Story = { render: () => <Demo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
export const Paused: Story = { render: () => <Demo live={false} /> };
export const CounterOnly: Story = { render: () => <RealtimeCounter className="max-w-xs" value={0} live={false} /> };
