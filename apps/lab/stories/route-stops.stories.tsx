import { Button, RouteStops, type RouteStop } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Navigation } from "lucide-react";
import { useState } from "react";

const meta = { title: "Components/Delivery/Route Stops", component: RouteStops, parameters: { layout: "padded" } } satisfies Meta<typeof RouteStops>;
export default meta;
type Story = StoryObj;

const STOPS: RouteStop[] = [
  { id: "p1", kind: "pickup", name: "Al-Quds Bakery", nameAr: "مخبز القدس", address: "Al-Masyoun", addressAr: "المصيون", orderRef: "#1042", status: "done" },
  { id: "p2", kind: "pickup", name: "Green Pharmacy", nameAr: "صيدلية الأخضر", address: "Al-Irsal St", addressAr: "شارع الإرسال", orderRef: "#1043", eta: Date.UTC(2026, 9, 1, 9, 48) },
  { id: "d1", kind: "dropoff", name: "Sara Odeh", nameAr: "سارة عودة", address: "Al-Tireh, Building 14", addressAr: "الطيرة، عمارة 14", orderRef: "#1042", cashMinor: 10000, note: "Ring twice", noteAr: "اطرق الجرس مرتين" },
  { id: "d2", kind: "dropoff", name: "Khaled Amro", nameAr: "خالد عمرو", address: "Ein Munjid", addressAr: "عين منجد", orderRef: "#1043", cashMinor: 4500 },
  { id: "d3", kind: "dropoff", name: "Dina Faraj", nameAr: "دينا فرج", orderRef: "#1044", status: "failed" },
];

function Demo() {
  const [stops, setStops] = useState(STOPS);
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <div className="max-w-lg">
      <RouteStops
        stops={stops}
        onSelectStop={(s) => setPicked(s.id)}
        renderActions={(stop) => (
          <>
            <Button size="sm" variant="secondary">
              <Navigation aria-hidden />
              Navigate
            </Button>
            <Button size="sm" variant="primary" onClick={() => setStops((all) => all.map((s) => (s.id === stop.id ? { ...s, status: "done" } : s)))}>
              {stop.kind === "pickup" ? "Picked up" : "Delivered"}
            </Button>
          </>
        )}
      />
      {picked ? <p className="mt-3 text-caption text-muted-foreground">Selected {picked}</p> : null}
    </div>
  );
}

export const Default: Story = { render: () => <Demo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
export const ReadOnly: Story = { render: () => <div className="max-w-lg"><RouteStops stops={STOPS} /></div> };
export const AllDone: Story = { render: () => <div className="max-w-lg"><RouteStops stops={STOPS.map((s) => ({ ...s, status: "done" as const }))} /></div> };
