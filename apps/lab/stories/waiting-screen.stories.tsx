import type { Meta, StoryObj } from "@storybook/react-vite";
import { type QueueConnection, WaitingScreen } from "@nasaq/web";
import { tr, useAr, useDemoQueue } from "./_seatfor-demo";

const meta = { title: "Components/Commerce/Waiting Screen", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Demo({ entryId = "q-46", connection = "live" }: { entryId?: string; connection?: QueueConnection }) {
  const ar = useAr();
  const { entries, act, updatedAt } = useDemoQueue();
  return (
    <div className="mx-auto max-w-xl">
      <WaitingScreen entries={entries} entryId={entryId} rooms={2} clinic={tr(ar, "Nasaq Family Clinic", "عيادة نسق للأسرة")} connection={connection} updatedAt={updatedAt} onLeave={async () => act("leave", entryId)} />
    </div>
  );
}

export const Default: Story = { render: () => <Demo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
export const Called: Story = { render: () => <Demo entryId="q-43" /> };
export const Reconnecting: Story = { render: () => <Demo connection="reconnecting" /> };
export const Offline: Story = { render: () => <Demo connection="offline" /> };
