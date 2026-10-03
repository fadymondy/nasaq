import { type MapAlert, MapMonitor, type MapRegionPreset } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { useAr } from "./_auth";

const meta = { title: "Components/Charts & Maps/Map Monitor", component: MapMonitor, parameters: { layout: "padded" } } satisfies Meta<typeof MapMonitor>;
export default meta;
type Story = StoryObj;

const NOW = Date.UTC(2026, 9, 1, 9, 0);
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const REGIONS: MapRegionPreset[] = [
  { id: "ksa", label: "Saudi Arabia", labelAr: "السعودية", center: { lat: 23.9, lng: 45.1 }, zoom: 5 },
  { id: "riyadh", label: "Riyadh", labelAr: "الرياض", center: { lat: 24.71, lng: 46.67 }, zoom: 10 },
  { id: "jeddah", label: "Jeddah", labelAr: "جدة", center: { lat: 21.54, lng: 39.17 }, zoom: 10 },
  { id: "dammam", label: "Dammam", labelAr: "الدمام", center: { lat: 26.42, lng: 50.09 }, zoom: 10 },
];

const ALERTS: MapAlert[] = [
  { id: "a1", lat: 24.77, lng: 46.74, severity: "critical", at: NOW - 12 * MIN, title: "Power outage, King Fahd Road", titleAr: "انقطاع كهرباء، طريق الملك فهد", detail: "About 3,200 customers affected", detailAr: "نحو 3,200 مشترك متأثر" },
  { id: "a2", lat: 24.63, lng: 46.71, severity: "high", at: NOW - 50 * MIN, title: "Water main break", titleAr: "كسر في خط المياه الرئيسي", detail: "Crew on site", detailAr: "الفريق في الموقع" },
  { id: "a3", lat: 21.49, lng: 39.19, severity: "medium", at: NOW - 3 * HOUR, title: "Traffic signal fault", titleAr: "عطل في إشارة المرور" },
  { id: "a4", lat: 21.6, lng: 39.12, severity: "low", at: NOW - 9 * HOUR, title: "Street light out", titleAr: "إنارة شارع معطلة" },
  { id: "a5", lat: 26.43, lng: 50.1, severity: "high", at: NOW - 2 * DAY, title: "Port gate congestion", titleAr: "ازدحام عند بوابة الميناء", detail: "Queue over 2 km", detailAr: "طابور يتجاوز 2 كم" },
  { id: "a6", lat: 26.29, lng: 50.2, severity: "medium", at: NOW - 5 * DAY, title: "Road works overrun", titleAr: "تأخر أعمال الطرق" },
  { id: "a7", lat: 24.47, lng: 39.61, severity: "critical", at: NOW - 12 * DAY, title: "Flash flood warning", titleAr: "تحذير من سيول", detail: "Road closed", detailAr: "الطريق مغلق" },
];

function Demo({ open = true }: { open?: boolean }) {
  const ar = useAr();
  const [count, setCount] = useState(0);
  return (
    <div className="flex max-w-6xl flex-col gap-2">
      <MapMonitor
        title={ar ? "عمليات المدينة" : "City operations"}
        regions={REGIONS}
        alerts={ALERTS}
        now={NOW}
        defaultRange="7d"
        defaultAlertsOpen={open}
        onVisibleAlertsChange={(list) => setCount(list.length)}
      />
      <p className="text-caption text-muted-foreground">{ar ? `خارج المكوّن: ${count} تنبيهات ظاهرة` : `Outside the component: ${count} visible alerts`}</p>
    </div>
  );
}

/** Pick a region to jump there, narrow the time range, choose an alert to centre and select it. */
export const Default: Story = { render: () => <Demo /> };
export const ClosedPanel: Story = { render: () => <Demo open={false} /> };
export const Empty: Story = { render: () => <MapMonitor className="max-w-5xl" regions={REGIONS} alerts={[]} mapClassName="h-80" /> };
export const Arabic: Story = { ...Default, globals: { locale: "ar" } };
