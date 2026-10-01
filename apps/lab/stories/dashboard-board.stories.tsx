import { type BoardItem, DashboardBoard, type DashboardWidgetDef, ProgressRing, SegmentBar, StatCard, TimeSeriesPanel } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMemo, useState } from "react";
import { t, useAr, wait } from "./_s-demo";
import { SAR, supportStatus, supportVolume } from "./_s-demo-reports";

const meta = { title: "Components/Layout/Pages/Dashboard Board", component: DashboardBoard, parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta<typeof DashboardBoard>;
export default meta;
type Story = StoryObj;

const DEFAULT_LAYOUT: BoardItem[] = [
  { id: "revenue", type: "revenue", cols: 1, rows: 1, pinned: true },
  { id: "orders", type: "orders", cols: 1, rows: 1 },
  { id: "goal", type: "goal", cols: 1, rows: 1 },
  { id: "tickets", type: "tickets", cols: 1, rows: 1 },
  { id: "volume", type: "volume", cols: 4, rows: 3 },
  { id: "status", type: "status", cols: 2, rows: 2 },
  { id: "tasks", type: "tasks", cols: 2, rows: 2 },
];

const PERIOD_DAYS: Record<string, number> = { "7": 7, "14": 14, "30": 30 };

function useWidgets(ar: boolean): DashboardWidgetDef[] {
  return useMemo(
    (): DashboardWidgetDef[] => [
      {
        type: "revenue",
        title: t(ar, "Revenue", "الإيرادات"),
        description: t(ar, "Revenue this month with the change", "إيرادات الشهر مع نسبة التغير"),
        unique: true,
        fields: [{ key: "compact", label: t(ar, "Short numbers", "أرقام مختصرة"), type: "toggle" }],
        defaultSettings: { compact: false },
        render: ({ settings }) => (
          <StatCard
            className="h-full border-0 shadow-none"
            label={t(ar, "This month", "هذا الشهر")}
            value={412500}
            format={{ ...SAR, ...(settings.compact ? { notation: "compact" as const } : {}) }}
            delta={0.084}
            deltaLabel={t(ar, "vs last month", "مقارنة بالشهر الماضي")}
          />
        ),
      },
      {
        type: "orders",
        title: t(ar, "Orders", "الطلبات"),
        render: () => <StatCard className="h-full border-0 shadow-none" label={t(ar, "Orders today", "طلبات اليوم")} value={186} delta={-0.032} />,
      },
      {
        type: "goal",
        title: t(ar, "Quarter goal", "هدف الربع"),
        fields: [{ key: "target", label: t(ar, "Target (percent)", "الهدف (نسبة)"), type: "number", min: 10, max: 100, step: 5 }],
        defaultSettings: { target: 100 },
        render: ({ settings }) => {
          const target = Number(settings.target) || 100;
          const done = Math.min(100, Math.round((78 / target) * 100));
          return (
            <div className="flex h-full items-center justify-center">
              <ProgressRing value={done} size={88} label={t(ar, "Progress towards the quarter goal", "التقدم نحو هدف الربع")} valueText={`${done}%`} />
            </div>
          );
        },
      },
      {
        type: "tickets",
        title: t(ar, "Open tickets", "التذاكر المفتوحة"),
        render: () => <StatCard className="h-full border-0 shadow-none" label={t(ar, "Waiting for a reply", "بانتظار الرد")} value={86} delta={0.12} invert />,
      },
      {
        type: "volume",
        title: t(ar, "Ticket volume", "حجم التذاكر"),
        minCols: 2,
        minRows: 2,
        defaultCols: 4,
        defaultRows: 3,
        fields: [
          {
            key: "days",
            label: t(ar, "Period", "الفترة"),
            type: "select",
            options: [
              { value: "7", label: t(ar, "Last 7 days", "آخر 7 أيام") },
              { value: "14", label: t(ar, "Last 14 days", "آخر 14 يومًا") },
              { value: "30", label: t(ar, "Last 30 days", "آخر 30 يومًا") },
            ],
          },
        ],
        defaultSettings: { days: "14" },
        render: ({ settings, rows }) => (
          <TimeSeriesPanel
            className="border-0 shadow-none"
            chartClassName={rows >= 3 ? "h-56" : "h-32"}
            metrics={[
              { id: "created", label: t(ar, "Created", "المُنشأة") },
              { id: "resolved", label: t(ar, "Resolved", "المحلولة"), color: "var(--nq-success)" },
            ]}
            data={supportVolume(PERIOD_DAYS[String(settings.days)] ?? 14)}
          />
        ),
      },
      {
        type: "status",
        title: t(ar, "Tickets by status", "التذاكر حسب الحالة"),
        minCols: 2,
        render: () => <SegmentBar label={t(ar, "Tickets by status", "التذاكر حسب الحالة")} segments={supportStatus(ar)} patterned />,
      },
      {
        type: "tasks",
        title: t(ar, "Today", "اليوم"),
        fields: [
          { key: "heading", label: t(ar, "Heading", "العنوان"), type: "text" },
          { key: "showDone", label: t(ar, "Show finished tasks", "إظهار المهام المنجزة"), type: "toggle" },
        ],
        defaultSettings: { heading: "", showDone: true },
        render: ({ settings }) => {
          const tasks = [
            { id: 1, text: t(ar, "Review the Riyadh proposal", "مراجعة عرض الرياض"), done: false },
            { id: 2, text: t(ar, "Send the September invoices", "إرسال فواتير سبتمبر"), done: true },
            { id: 3, text: t(ar, "Call the logistics partner", "الاتصال بشريك الخدمات اللوجستية"), done: false },
          ].filter((x) => settings.showDone || !x.done);
          return (
            <div className="flex flex-col gap-2">
              {settings.heading ? <p className="text-label font-medium">{String(settings.heading)}</p> : null}
              <ul className="flex flex-col gap-1.5 text-body-sm">
                {tasks.map((x) => (
                  <li key={x.id} className={x.done ? "text-muted-foreground line-through" : undefined}>
                    {x.text}
                  </li>
                ))}
              </ul>
            </div>
          );
        },
      },
    ],
    [ar],
  );
}

function Page({ failSave = false, startEditing = false }: { failSave?: boolean; startEditing?: boolean }) {
  const ar = useAr();
  const widgets = useWidgets(ar);
  const [layout, setLayout] = useState<BoardItem[]>(DEFAULT_LAYOUT);
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 sm:p-8">
      <DashboardBoard
        title={t(ar, "Overview", "نظرة عامة")}
        widgets={widgets}
        layout={layout}
        defaultLayout={DEFAULT_LAYOUT}
        defaultEditing={startEditing}
        onSave={async (next) => {
          await wait(500);
          if (failSave) throw new Error("offline");
          setLayout(next);
        }}
      />
    </main>
  );
}

export const Default: Story = { render: () => <Page /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
export const Editing: Story = { render: () => <Page startEditing /> };
export const SaveFails: Story = { render: () => <Page failSave startEditing /> };
export const Empty: Story = {
  render: () => (
    <main className="mx-auto w-full max-w-6xl p-4 sm:p-8">
      <DashboardBoard widgets={[]} layout={[]} onSave={() => {}} />
    </main>
  ),
};
