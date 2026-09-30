import { Button, RouteProgress, useRouteProgress } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { useAr, wait } from "./_lifecycle-demo";

const meta = { title: "Components/Feedback/Route Progress" } satisfies Meta;
export default meta;
type Story = StoryObj;

function Demo() {
  const ar = useAr();
  const jobs = useRouteProgress();
  return (
    <div className="flex flex-col gap-3">
      <div className="relative h-48 overflow-hidden rounded-card border border-border bg-card">
        <RouteProgress active={jobs.active} placement="absolute" />
        <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
          <p className="text-label" aria-live="polite">
            {jobs.active ? (ar ? `${jobs.count} مهام قيد التنفيذ` : `${jobs.count} running`) : ar ? "لا عمل جارٍ" : "Nothing running"}
          </p>
          <p className="text-caption text-muted-foreground">{ar ? "الشريط في أعلى هذا الإطار" : "The bar is at the top of this frame"}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => void jobs.run(wait(2500))}>
          {ar ? "تنقّل (2.5 ثانية)" : "Navigate (2.5 s)"}
        </Button>
        <Button variant="secondary" onClick={() => void jobs.run(wait(6000))}>
          {ar ? "مهمة خلفية (6 ثوانٍ)" : "Background job (6 s)"}
        </Button>
      </div>
      <p className="text-caption text-muted-foreground">{ar ? "اضغط الزرين معاً: الشريط يبقى حتى تنتهي المهمتان." : "Press both: the bar stays until both jobs end."}</p>
    </div>
  );
}

function Pinned() {
  const ar = useAr();
  const [value, setValue] = useState(35);
  return (
    <div className="flex flex-col gap-3">
      <div className="relative h-24 overflow-hidden rounded-card border border-border bg-card">
        <RouteProgress value={value} placement="absolute" tone="info" />
      </div>
      <label className="flex items-center gap-3 text-body-sm">
        {ar ? "القيمة" : "Value"}
        <input type="range" min={0} max={100} value={value} onChange={(e) => setValue(Number(e.target.value))} className="flex-1" />
        <bdi className="w-10 tabular-nums">{value}%</bdi>
      </label>
    </div>
  );
}

export const Default: Story = { render: () => <Demo /> };
export const PinnedValue: Story = { render: () => <Pinned /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
