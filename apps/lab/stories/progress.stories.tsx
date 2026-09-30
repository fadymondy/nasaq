import { Button, Meter, Progress, useNasaq } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

const meta = { title: "Components/Feedback/Progress", component: Progress, args: { value: 40 } } satisfies Meta<typeof Progress>;
export default meta;
type Story = StoryObj<typeof meta>;

const useAr = () => useNasaq().locale.startsWith("ar");

/** Fills from the inline start: left in English, right in Arabic. */
export const Default: Story = {
  render: () => {
    const ar = useAr();
    return (
      <div className="w-[28rem] max-w-full">
        <Progress value={64} label={ar ? "رفع الملفات" : "Uploading files"} />
      </div>
    );
  },
};

export const Tones: Story = {
  render: () => {
    const ar = useAr();
    return (
      <div className="flex w-[28rem] max-w-full flex-col gap-4">
        <Progress value={50} label={ar ? "افتراضي" : "Default"} />
        <Progress value={50} tone="info" label={ar ? "معلومة" : "Info"} />
        <Progress value={100} tone="success" label={ar ? "اكتمل الاستيراد" : "Import complete"} />
        <Progress value={70} tone="warning" label={ar ? "تحذير" : "Warning"} />
        <Progress value={30} tone="danger" size="sm" label={ar ? "خطر" : "Danger"} />
      </div>
    );
  },
};

/** `value={null}` when the length of the work is unknown. The pulse stops under reduced motion. */
export const Indeterminate: Story = {
  render: () => {
    const ar = useAr();
    return (
      <div className="w-[28rem] max-w-full">
        <Progress value={null} label={ar ? "جارٍ التحضير…" : "Preparing…"} />
      </div>
    );
  },
};

/** Driven from state: indeterminate first, then determinate. */
export const Live: Story = {
  render: () => {
    const ar = useAr();
    const [value, setValue] = useState<number | null>(null);
    useEffect(() => {
      if (value === null) {
        const t = setTimeout(() => setValue(0), 1200);
        return () => clearTimeout(t);
      }
      if (value >= 100) return;
      const t = setTimeout(() => setValue((v) => Math.min(100, (v ?? 0) + 10)), 400);
      return () => clearTimeout(t);
    }, [value]);
    return (
      <div className="flex w-[28rem] max-w-full flex-col items-start gap-3">
        <Progress
          className="w-full"
          value={value}
          tone={value === 100 ? "success" : "default"}
          label={value === 100 ? (ar ? "تم" : "Done") : ar ? "جارٍ الاستيراد" : "Importing"}
        />
        <Button size="sm" onClick={() => setValue(null)}>
          {ar ? "إعادة" : "Restart"}
        </Button>
      </div>
    );
  },
};

/** Meter measures a quantity against a limit and turns warning at 80% and danger at 95% by default. */
export const MeterThresholds: Story = {
  render: () => {
    const ar = useAr();
    return (
      <div className="flex w-[28rem] max-w-full flex-col gap-4">
        <Meter value={20} max={50} label={ar ? "المقاعد" : "Seats"} valueText={ar ? "20 من 50" : "20 of 50"} />
        <Meter value={42} max={50} label={ar ? "المقاعد" : "Seats"} valueText={ar ? "42 من 50" : "42 of 50"} />
        <Meter value={49} max={50} label={ar ? "المقاعد" : "Seats"} valueText={ar ? "49 من 50" : "49 of 50"} />
      </div>
    );
  },
};

/** Custom thresholds and number format: a budget in dollars. */
export const Budget: Story = {
  render: () => {
    const ar = useAr();
    return (
      <div className="w-[28rem] max-w-full">
        <Meter
          value={7200}
          max={10000}
          warnAt={0.7}
          dangerAt={0.9}
          locale={ar ? "ar-SA" : "en-US"}
          format={{ style: "currency", currency: "USD", maximumFractionDigits: 0 }}
          label={ar ? "ميزانية الذكاء الاصطناعي" : "AI budget"}
        />
      </div>
    );
  },
};
