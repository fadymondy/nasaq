import { Card, StoreOrderTimeline } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { useAr } from "./_s-demo";
import { TRACKING_TEMPLATE, ordersSeed } from "./_orders-demo";

const meta = {
  title: "Components/Commerce/Store Order Timeline",
  parameters: { layout: "padded" },
} satisfies Meta;
export default meta;
type Story = StoryObj;

function Demo({ index, variant = "tracking" }: { index: number; variant?: "tracking" | "activity" }) {
  const ar = useAr();
  const base = ordersSeed(ar ? "ar" : "en")[index]!;
  const [events, setEvents] = useState(base.events ?? []);
  return (
    <Card className="max-w-2xl p-4">
      <StoreOrderTimeline
        variant={variant}
        status={base.status}
        payment={base.payment}
        placedAt={base.placedAt}
        events={events}
        tracking={base.tracking}
        trackingTemplate={TRACKING_TEMPLATE}
        {...(variant === "activity"
          ? { onAddNote: (note: string) => setEvents((e) => [...e, { at: "2026-09-30T09:30:00Z", kind: "note", label: ar ? "ملاحظة" : "Note", by: ar ? "منى" : "Mona", note }]) }
          : {})}
      />
    </Card>
  );
}

/** Customer view of a delivered order: five steps, times, and the carrier link. */
export const Delivered: Story = { render: () => <Demo index={0} /> };

/** Out for delivery. */
export const OutForDelivery: Story = { render: () => <Demo index={7} /> };

/** Part of the order has shipped. */
export const PartlyShipped: Story = { render: () => <Demo index={8} /> };

/** Cash on delivery changes the paid step. */
export const CashOnDelivery: Story = { render: () => <Demo index={3} /> };

/** Cancelled and refunded show a banner. */
export const Cancelled: Story = { render: () => <Demo index={5} /> };

export const Refunded: Story = { render: () => <Demo index={6} /> };

/** The store team's log, newest first, with an internal note box. Type a note and press Add note. */
export const Activity: Story = { render: () => <Demo index={8} variant="activity" /> };

export const ArabicTracking: Story = { globals: { locale: "ar" }, render: () => <Demo index={1} /> };

export const ArabicActivity: Story = { globals: { locale: "ar" }, render: () => <Demo index={8} variant="activity" /> };

export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Demo index={1} /> };
