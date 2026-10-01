import { MapView, type MapPin } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Navigation, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { CLUSTERED_PINS } from "./_map-cluster-demo";
import { FLEET_LAYERS, FLEET_PINS, FLEET_ROUTES, t, useAr } from "./_w2-demo";

const meta = { title: "Components/Charts & Maps/Map View", component: MapView, parameters: { layout: "padded" } } satisfies Meta<typeof MapView>;
export default meta;
type Story = StoryObj;

function Fleet({ tiles = false, crowd = false }: { tiles?: boolean; crowd?: boolean }) {
  const ar = useAr();
  const [selected, setSelected] = useState<string | null>(crowd ? null : "v07");
  return (
    <MapView
      label={t(ar, "Fleet map", "خريطة الأسطول")}
      className="h-[30rem]"
      layers={FLEET_LAYERS}
      pins={crowd ? CLUSTERED_PINS : FLEET_PINS}
      routes={crowd ? undefined : FLEET_ROUTES}
      selectedId={selected}
      onSelect={setSelected}
      tileUrl={tiles ? "/__no-tiles__/{z}/{x}/{y}.png" : undefined}
      attribution={tiles ? "Demo tiles" : undefined}
      pinActions={(pin: MapPin) => [
        { id: "call", label: t(ar, "Call driver", "اتصال بالسائق"), icon: Phone, onSelect: () => undefined },
        { id: "route", label: t(ar, "Show route", "عرض المسار"), icon: Navigation, onSelect: () => undefined, disabled: !pin.layer },
      ]}
    />
  );
}

export const Default: Story = { render: () => <Fleet /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Fleet /> };
export const WithTileUrl: Story = { render: () => <Fleet tiles /> };
export const Empty: Story = { render: () => <MapView label="Empty map" className="h-80" /> };
/* A couple of hundred pins: bubbles with counts that split as you zoom in. Click or press Enter on one. */
export const Clustered: Story = { render: () => <Fleet crowd /> };
export const ClusteredArabic: Story = { globals: { locale: "ar" }, render: () => <Fleet crowd /> };
export const ClusteredCustom: Story = {
  render: () => <MapView label="Custom clusters" className="h-[30rem]" pins={CLUSTERED_PINS} clusterRadius={90} renderCluster={(c) => <span className="text-caption">{c.count}</span>} />,
};
/* Five couriers wait at one loading bay: no zoom separates them, so the bubble lists them in the card. */
export const ClusteredSameSpot: Story = {
  render: () => <MapView label="Loading bay" className="h-[30rem]" pins={CLUSTERED_PINS} defaultView={{ center: { lat: 24.7004, lng: 46.7113 }, zoom: 15 }} />,
};

/* Delivery zones as filled polygons, and a moving driver that pulses and glides to each new position. */
const ZONES = [
  { id: "z1", label: "Ramallah centre", labelAr: "وسط رام الله", tone: "brand" as const, points: [{ lat: 31.915, lng: 35.195 }, { lat: 31.915, lng: 35.215 }, { lat: 31.898, lng: 35.215 }, { lat: 31.898, lng: 35.195 }] },
  { id: "z2", label: "Al-Bireh", labelAr: "البيرة", tone: "info" as const, dashed: true, points: [{ lat: 31.915, lng: 35.215 }, { lat: 31.92, lng: 35.235 }, { lat: 31.9, lng: 35.24 }, { lat: 31.898, lng: 35.215 }] },
];

function Zones() {
  const ar = useAr();
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => n + 1), 2000);
    return () => clearInterval(id);
  }, []);
  const lat = 31.905 + Math.sin(i / 2) * 0.004;
  const lng = 35.205 + (i % 20) * 0.0008;
  return (
    <MapView
      label={t(ar, "Zones", "المناطق")}
      className="h-[30rem]"
      areas={ZONES}
      pins={[{ id: "drv", lat, lng, label: "Omar", labelAr: "عمر", tone: "info", live: true, icon: Navigation }]}
      tileUrl="/__no-tiles__/{z}/{x}/{y}.png"
      attribution="Demo tiles"
    />
  );
}
export const ZonesAndLiveDriver: Story = { render: () => <Zones /> };
export const ZonesAndLiveDriverArabic: Story = { globals: { locale: "ar" }, render: () => <Zones /> };

/* Tap the map (or drag the pin) to choose a location; the layers panel stays collapsed. */
function PinPicker() {
  const ar = useAr();
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <MapView
        label={t(ar, "Pick a drop-off", "اختر موقع التسليم")}
        className="h-[24rem]"
        layersPanel="hidden"
        pickedPoint={point}
        onMapClick={setPoint}
        onPickedPointChange={setPoint}
      />
      <p className="text-body-sm text-muted-foreground">{point ? `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}` : t(ar, "Tap the map", "اضغط على الخريطة")}</p>
    </div>
  );
}
export const PinPickerStory: Story = { name: "Pin picker", render: () => <PinPicker /> };
export const PinPickerArabic: Story = { name: "Pin picker (Arabic)", globals: { locale: "ar" }, render: () => <PinPicker /> };

/* Draw a zone: tap to add vertices, drag or arrow-key them, then Finish shape. */
function AreaEditor() {
  const ar = useAr();
  const [points, setPoints] = useState<{ lat: number; lng: number }[]>([]);
  return (
    <div className="flex flex-col gap-2">
      <MapView
        label={t(ar, "Zone editor", "محرر المنطقة")}
        className="h-[24rem]"
        layersPanel="hidden"
        editing
        editPoints={points}
        onAreaChange={setPoints}
        onAreaDone={() => undefined}
      />
      <p className="text-body-sm text-muted-foreground">{points.length} {t(ar, "points", "نقاط")}</p>
    </div>
  );
}
export const AreaEditing: Story = { render: () => <AreaEditor /> };
export const AreaEditingArabic: Story = { globals: { locale: "ar" }, render: () => <AreaEditor /> };
export const LayersExpanded: Story = { render: () => <MapView label="Fleet" className="h-80" layers={FLEET_LAYERS} pins={FLEET_PINS} layersPanel="expanded" /> };
