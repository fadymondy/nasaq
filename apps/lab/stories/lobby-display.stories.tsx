import type { Meta, StoryObj } from "@storybook/react-vite";
import { LobbyDisplay } from "@nasaq/web";
import { Button } from "@nasaq/web";
import { useState } from "react";
import { tr, useAr, useDemoQueue } from "./_seatfor-demo";

const meta = { title: "Components/Bookings/Lobby Display", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Demo({ rooms = ["1", "2", "3"] }: { rooms?: string[] }) {
  const ar = useAr();
  const { entries, act } = useDemoQueue("1");
  const [next, setNext] = useState(0);
  return (
    <div className="flex flex-col gap-3">
      <LobbyDisplay className="min-h-[32rem]" entries={entries} rooms={rooms} clinic={tr(ar, "Nasaq Family Clinic", "عيادة نسق للأسرة")} />
      <div>
        <Button
          size="sm"
          variant="secondary"
          onClick={async () => {
            await act("call-next");
            setNext((n) => n + 1);
          }}
        >
          {tr(ar, "Call the next ticket", "نداء التذكرة التالية")} ({next})
        </Button>
      </div>
    </div>
  );
}

export const Default: Story = { render: () => <Demo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
export const OneRoom: Story = { render: () => <Demo rooms={["1"]} /> };
