/* A fleet page: the map with layers and routes, and the same vehicles as a list for keyboard and screen-reader use. */
import { Badge, MapView } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { CLUSTERED_PINS } from "./_map-cluster-demo";
import { FLEET_LAYERS, FLEET_ROUTES, t, useAr, W2Page } from "./_w2-demo";

const meta = { title: "Pages/App/Fleet Map", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  const [selected, setSelected] = useState<string | null>("v12");
  return (
    <W2Page wide title={t(ar, "Live fleet", "الأسطول المباشر")} description={t(ar, "Where every van and courier is right now.", "أين توجد كل شاحنة ومندوب الآن.")}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <MapView label={t(ar, "Fleet map", "خريطة الأسطول")} className="h-[32rem]" layers={FLEET_LAYERS} pins={CLUSTERED_PINS} routes={FLEET_ROUTES} selectedId={selected} onSelect={setSelected} />
        <ul className="flex max-h-[32rem] flex-col gap-2 overflow-auto" aria-label={t(ar, "Vehicles", "المركبات")}>
          {CLUSTERED_PINS.slice(0, 24).map((pin) => (
            <li key={pin.id}>
              <button
                type="button"
                aria-pressed={selected === pin.id}
                onClick={() => setSelected(pin.id)}
                className="flex w-full items-center justify-between gap-2 rounded-card border border-border bg-card px-3 py-2 text-start text-body-sm hover:bg-accent aria-pressed:border-nq-focus"
              >
                <span className="min-w-0">
                  <bdi dir="auto" className="block truncate font-medium text-foreground">
                    {ar ? pin.labelAr : pin.label}
                  </bdi>
                  <bdi dir="auto" className="block truncate text-caption text-muted-foreground">
                    {ar ? pin.detailAr : pin.detail}
                  </bdi>
                </span>
                {pin.status ? <Badge variant={pin.tone === "danger" ? "danger" : pin.tone === "success" ? "success" : "neutral"}>{ar ? pin.statusAr : pin.status}</Badge> : null}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </W2Page>
  );
}

export const Default: Story = { render: () => <Page /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
