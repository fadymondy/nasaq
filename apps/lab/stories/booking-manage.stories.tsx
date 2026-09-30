import type { Meta, StoryObj } from "@storybook/react-vite";
import { BookingManage, type BookingRecord } from "@nasaq/web";
import { useState } from "react";
import { makeGetSlots, NOW_DATE, useCatalogue, useDemoBooking, wait } from "./_seatfor-demo";

const meta = { title: "Components/Commerce/Booking Manage", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Demo({ soon = false, cancelFails = false }: { soon?: boolean; cancelFails?: boolean }) {
  const { services } = useCatalogue();
  const initial = useDemoBooking("confirmed");
  const [booking, setBooking] = useState<BookingRecord>(soon ? { ...initial, start: new Date(2026, 8, 30, 16, 0), end: new Date(2026, 8, 30, 16, 30) } : initial);
  const getSlots = makeGetSlots(services);
  return (
    <div className="mx-auto max-w-3xl">
      <BookingManage
        booking={booking}
        policy={{ cancelHours: 24, rescheduleHours: 12, lateFeePercent: 50 }}
        now={NOW_DATE}
        getSlots={() => getSlots({ serviceId: "consult", providerId: "d1", locationId: "maadi" })}
        onReschedule={async (start) => {
          await wait(400);
          setBooking((b) => ({ ...b, start, end: new Date(start.getTime() + 30 * 60000) }));
        }}
        onCancel={async () => {
          await wait(400);
          if (cancelFails) return { error: "The clinic could not be reached." };
          setBooking((b) => ({ ...b, status: "cancelled" }));
        }}
      />
    </div>
  );
}

export const Default: Story = { render: () => <Demo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
export const InsideFeeWindow: Story = { render: () => <Demo soon /> };
export const CancelFails: Story = { render: () => <Demo cancelFails /> };
