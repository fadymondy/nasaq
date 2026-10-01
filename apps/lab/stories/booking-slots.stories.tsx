import type { Meta, StoryObj } from "@storybook/react-vite";
import { type BookingSlot, BookingSlots } from "@nasaq/web";
import { useEffect, useState } from "react";
import { makeGetSlots, NOW_DATE, useCatalogue } from "./_seatfor-demo";

const meta = { title: "Components/Bookings/Booking Slots", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Demo({ loading = false, empty = false }: { loading?: boolean; empty?: boolean }) {
  const { services } = useCatalogue();
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [value, setValue] = useState<Date | null>(null);
  useEffect(() => {
    void makeGetSlots(services)({ serviceId: "consult", providerId: "d1", locationId: "maadi" }).then(setSlots);
  }, [services]);
  return (
    <div className="mx-auto max-w-3xl">
      <BookingSlots slots={empty ? [] : slots} loading={loading || (!empty && slots.length === 0)} value={value} onValueChange={setValue} defaultDay={NOW_DATE} now={NOW_DATE} />
    </div>
  );
}

export const Default: Story = { render: () => <Demo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
export const Loading: Story = { render: () => <Demo loading /> };
export const NoTimes: Story = { render: () => <Demo empty /> };
