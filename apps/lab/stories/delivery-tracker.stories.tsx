import { DeliveryTracker, MapView, type DeliveryTrackerProps } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Bike } from "lucide-react";

const meta = { title: "Components/Delivery/Delivery Tracker", component: DeliveryTracker, parameters: { layout: "padded" } } satisfies Meta<typeof DeliveryTracker>;
export default meta;
type Story = StoryObj;

const T0 = Date.UTC(2026, 9, 1, 9, 30);
const times: DeliveryTrackerProps["times"] = { placed: T0, assigned: T0 + 4 * 60_000, "picked-up": T0 + 14 * 60_000, "on-the-way": T0 + 16 * 60_000 };
const courier = { name: "Omar Haddad", nameAr: "عمر حداد", vehicle: "Motorbike 42-318-77", phone: "+970 59 123 4567" };

const frame = (props: DeliveryTrackerProps) => (
  <div className="max-w-md">
    <DeliveryTracker orderNumber="#1042" {...props} />
  </div>
);

const liveMap = (
  <MapView
    label="Your courier"
    className="h-64"
    legend={false}
    pins={[
      { id: "drv", lat: 31.9038, lng: 35.2034, label: "Omar", labelAr: "عمر", tone: "brand", icon: Bike, live: true },
      { id: "home", lat: 31.9112, lng: 35.2101, label: "Delivery address", labelAr: "عنوان التسليم", tone: "success" },
    ]}
    routes={[{ id: "r", label: "Route", points: [{ lat: 31.9038, lng: 35.2034 }, { lat: 31.9075, lng: 35.2068 }, { lat: 31.9112, lng: 35.2101 }] }]}
  />
);

export const Placed: Story = { render: () => frame({ status: "placed", times }) };
export const Assigned: Story = { render: () => frame({ status: "assigned", times, courier }) };
export const OnTheWay: Story = { render: () => frame({ status: "on-the-way", times, courier, etaSeconds: 540, onMessage: () => undefined, map: liveMap }) };
export const Delivered: Story = { render: () => frame({ status: "delivered", times: { ...times, delivered: T0 + 31 * 60_000 } }) };
export const Cancelled: Story = { render: () => frame({ status: "cancelled", reachedBefore: "assigned", times, reason: "The restaurant closed early.", reasonAr: "أغلق المطعم مبكرًا." }) };
export const Failed: Story = { render: () => frame({ status: "failed", reachedBefore: "on-the-way", times, reason: "Customer did not answer.", reasonAr: "لم يرد العميل." }) };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => frame({ status: "on-the-way", times, courier, etaSeconds: 540, onMessage: () => undefined, map: liveMap }) };
export const ArabicCancelled: Story = { globals: { locale: "ar" }, render: () => frame({ status: "cancelled", reachedBefore: "assigned", times, reasonAr: "أغلق المطعم مبكرًا." }) };
