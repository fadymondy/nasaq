import { Button, CourierCard, CourierList, type CourierCardProps } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

const meta = { title: "Components/Delivery/Courier Card", component: CourierCard, parameters: { layout: "padded" } } satisfies Meta<typeof CourierCard>;
export default meta;
type Story = StoryObj;

const COURIERS: (CourierCardProps & { id: string })[] = [
  { id: "c1", name: "Omar Haddad", nameAr: "عمر حداد", status: "available", vehicle: "motorbike", vehicleDetail: "42-318-77", distanceMeters: 850, etaSeconds: 240, cashFloatMinor: 25000, activeOrders: 0 },
  { id: "c2", name: "Lina Khoury", nameAr: "لينا خوري", status: "busy", vehicle: "bike", distanceMeters: 2300, etaSeconds: 660, cashFloatMinor: 8450, activeOrders: 2 },
  { id: "c3", name: "Yousef Nasser", nameAr: "يوسف ناصر", status: "available", vehicle: "car", vehicleDetail: "61-902-15", distanceMeters: 4100, etaSeconds: 900, cashFloatMinor: 0, activeOrders: 1 },
  { id: "c4", name: "Rana Saleh", nameAr: "رنا صالح", status: "offline", vehicle: "walk" },
];

function List({ withActions = true }: { withActions?: boolean }) {
  const [selected, setSelected] = useState<string | null>("c1");
  return (
    <div className="max-w-xl">
      <CourierList
        couriers={COURIERS.map((c) => ({
          ...c,
          actions: withActions && c.status === "available" ? <Button size="sm" variant="primary">Assign</Button> : undefined,
        }))}
        selectedId={selected}
        onSelectCourier={setSelected}
      />
    </div>
  );
}

export const Default: Story = { render: () => <List /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <List /> };
export const Single: Story = { render: () => <div className="max-w-xl"><CourierCard {...COURIERS[0]!} /></div> };
export const Compact: Story = { render: () => <div className="max-w-md"><CourierCard {...COURIERS[1]!} compact /></div> };
export const OtherCurrency: Story = { render: () => <div className="max-w-xl"><CourierCard {...COURIERS[0]!} currency="USD" /></div> };
