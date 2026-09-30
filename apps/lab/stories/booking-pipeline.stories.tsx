import type { Meta, StoryObj } from "@storybook/react-vite";
import { advance, type BookingStatus, type BookingTransition, BookingPipeline } from "@nasaq/web";
import { useState } from "react";
import { wait } from "./_seatfor-demo";

const meta = { title: "Components/Commerce/Booking Pipeline", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Demo({ start = "confirmed", readOnly = false, vertical = false }: { start?: BookingStatus; readOnly?: boolean; vertical?: boolean }) {
  const [history, setHistory] = useState<BookingTransition[]>(() => [{ status: "requested", at: new Date(2026, 8, 30, 8, 0) }, { status: start === "requested" ? "requested" : "confirmed", at: new Date(2026, 8, 30, 8, 5), by: "Reception" }]);
  const status = history[history.length - 1]!.status;
  return (
    <div className="mx-auto max-w-4xl">
      <BookingPipeline
        status={status}
        history={history}
        orientation={vertical ? "vertical" : "horizontal"}
        onAdvance={
          readOnly
            ? undefined
            : async (to) => {
                await wait(300);
                const r = advance(history, to, new Date());
                if (!r.ok) return { error: r.reason };
                setHistory(r.history);
              }
        }
      />
    </div>
  );
}

export const Default: Story = { render: () => <Demo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
export const ReadOnly: Story = { render: () => <Demo readOnly /> };
export const Vertical: Story = { render: () => <Demo vertical /> };
