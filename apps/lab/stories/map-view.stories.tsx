import { MapView, type MapPin } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Navigation, Phone } from "lucide-react";
import { useState } from "react";
import { CLUSTERED_PINS } from "./_map-cluster-demo";
import { FLEET_LAYERS, FLEET_PINS, FLEET_ROUTES, t, useAr } from "./_w2-demo";

const meta = { title: "Components/Data Display/Map View", component: MapView, parameters: { layout: "padded" } } satisfies Meta<typeof MapView>;
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
