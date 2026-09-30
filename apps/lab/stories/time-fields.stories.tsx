import { TimeField, TimeSpanField, TimeZoneClock, TimeZoneField } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { useAr, W3_NOW } from "./_w3-demo";

const meta = { title: "Components/Pickers/Time Fields", component: TimeField, parameters: { layout: "padded" } } satisfies Meta<typeof TimeField>;
export default meta;
type Story = StoryObj;

function Demo() {
  const ar = useAr();
  const [time, setTime] = useState<string | null>("09:00");
  const [span, setSpan] = useState({ start: "09:00", end: "17:30" });
  const [zone, setZone] = useState("Asia/Riyadh");
  return (
    <div className="flex max-w-xl flex-col gap-8">
      <section className="flex flex-col gap-2">
        <label htmlFor="w3-time" className="text-label text-foreground">
          {ar ? "وقت التذكير" : "Reminder time"}
        </label>
        <TimeField inputId="w3-time" value={time} onValueChange={setTime} />
        <p className="text-caption text-muted-foreground">
          {ar ? "اكتب 930 أو 9.30 أو 9:30 م. القيمة المحفوظة: " : "Type 930, 9.30 or 9:30 pm. Stored value: "}
          <bdi dir="ltr" className="font-mono">
            {time ?? "null"}
          </bdi>
        </p>
      </section>
      <section className="flex flex-col gap-2">
        <div className="text-label text-foreground">{ar ? "ساعات العمل" : "Opening hours"}</div>
        <TimeSpanField value={span} onValueChange={setSpan} />
      </section>
      <section className="flex flex-col gap-2">
        <div className="text-label text-foreground">{ar ? "وردية ليلية" : "Night shift"}</div>
        <TimeSpanField defaultValue={{ start: "22:00", end: "06:00" }} allowOvernight />
      </section>
      <section className="flex flex-col gap-2">
        <div className="text-label text-foreground">{ar ? "المنطقة الزمنية" : "Time zone"}</div>
        <TimeZoneField value={zone} onValueChange={setZone} reference="Asia/Riyadh" />
      </section>
      <section className="flex flex-col gap-2">
        <div className="text-label text-foreground">{ar ? "ساعات العالم" : "World clocks"}</div>
        <div className="grid gap-3 sm:grid-cols-3">
          {["Asia/Riyadh", "Europe/London", "America/New_York"].map((z) => (
            <TimeZoneClock key={z} timeZone={z} reference="Asia/Riyadh" now={W3_NOW} size="sm" />
          ))}
        </div>
      </section>
    </div>
  );
}

export const Default: Story = { render: () => <Demo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Demo /> };
export const Errors: Story = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-4">
      <TimeField defaultValue="07:00" min="08:00" max="18:00" aria-label="Within opening hours" />
      <TimeSpanField defaultValue={{ start: "17:00", end: "09:00" }} />
    </div>
  ),
};
