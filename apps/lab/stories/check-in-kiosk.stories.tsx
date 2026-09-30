import type { Meta, StoryObj } from "@storybook/react-vite";
import { CheckInKiosk, estimateWaitMinutes, positionInQueue } from "@nasaq/web";
import { tr, useAr, useDemoQueue, useKioskBookings, wait } from "./_seatfor-demo";

const meta = { title: "Components/Commerce/Check-in Kiosk", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Demo({ walkIn = true, mode = "scan" }: { walkIn?: boolean; mode?: "scan" | "phone" }) {
  const ar = useAr();
  const bookings = useKioskBookings();
  const { entries, join } = useDemoQueue();
  return (
    <div className="mx-auto max-w-2xl">
      <CheckInKiosk
        bookings={bookings}
        allowWalkIn={walkIn}
        defaultMode={mode}
        resetSeconds={0}
        onCheckIn={async (request) => {
          await wait(500);
          const entry = join(request.booking?.name ?? tr(ar, "Walk-in", "بدون موعد"), request.booking ? "appointment" : "normal");
          if (!entry) return { error: tr(ar, "Try again.", "حاول مجددًا.") };
          const all = [...entries, entry];
          return { entry, position: positionInQueue(all, entry.id), waitMinutes: estimateWaitMinutes(all, entry.id, { averageMinutes: 10, rooms: 2 }) };
        }}
      />
    </div>
  );
}

export const Default: Story = { render: () => <Demo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
export const PhoneKeypad: Story = { render: () => <Demo mode="phone" /> };
export const NoWalkIn: Story = { render: () => <Demo walkIn={false} /> };
