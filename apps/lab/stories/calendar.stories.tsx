import { Calendar, type DateRange } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

const meta = { title: "Components/Pickers/Calendar", component: Calendar, args: { today: new Date(2026, 8, 29) } } satisfies Meta<typeof Calendar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: () => <Calendar mode="single" defaultValue={new Date(2026, 8, 15)} />,
};

function RangeDemo({ locale }: { locale?: string }) {
  const [range, setRange] = useState<DateRange>({ from: new Date(2026, 8, 10), to: new Date(2026, 8, 16) });
  return <Calendar mode="range" today={new Date(2026, 8, 29)} locale={locale} value={range} onValueChange={setRange} />;
}

export const Range: Story = { render: () => <RangeDemo /> };

export const TwoMonths: Story = {
  render: () => <Calendar mode="range" numberOfMonths={2} today={new Date(2026, 8, 29)} defaultMonth={new Date(2026, 8, 1)} />,
};

/** Weekend days and dates before the 5th are unavailable; nothing outside Sep 5 to Dec 31 can be picked. */
export const DisabledAndLimits: Story = {
  render: () => (
    <Calendar
      today={new Date(2026, 8, 29)}
      min={new Date(2026, 8, 5)}
      max={new Date(2026, 11, 31)}
      disabled={(d) => d.getDay() === 5 || d.getDay() === 6}
    />
  ),
};

/** Arabic locale: month and weekday names in Arabic, Saturday-first week where the region says so, mirrored arrows and chevrons. */
export const Arabic: Story = {
  render: () => (
    <div className="flex flex-wrap gap-8">
      <Calendar locale="ar-SA" today={new Date(2026, 8, 29)} defaultValue={new Date(2026, 8, 15)} />
      <Calendar locale="ar-EG" mode="range" today={new Date(2026, 8, 29)} defaultValue={{ from: new Date(2026, 8, 10), to: new Date(2026, 8, 16) }} />
    </div>
  ),
};

/** `calendar="islamic-umalqura"` changes the labels only; the grid stays Gregorian. */
export const Hijri: Story = {
  render: () => <Calendar locale="ar-SA" calendar="islamic-umalqura" today={new Date(2026, 8, 29)} defaultValue={new Date(2026, 8, 15)} />,
};

export const WeekStartsOn: Story = {
  render: () => (
    <div className="flex flex-wrap gap-8">
      <Calendar weekStartsOn={1} today={new Date(2026, 8, 29)} />
      <Calendar weekStartsOn={6} today={new Date(2026, 8, 29)} />
    </div>
  ),
};

export const ArabicRange: Story = { render: () => <RangeDemo locale="ar" /> };
