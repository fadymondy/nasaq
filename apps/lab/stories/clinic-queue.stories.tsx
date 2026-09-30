import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClinicQueue, type QueueConnection } from "@nasaq/web";
import { useDemoQueue } from "./_seatfor-demo";

const meta = { title: "Components/Health/Clinic Queue", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Demo({ empty = false, connection = "live", fails = false }: { empty?: boolean; connection?: QueueConnection; fails?: boolean }) {
  const { entries, act, updatedAt } = useDemoQueue("1");
  return (
    <ClinicQueue
      entries={empty ? [] : entries}
      updatedAt={updatedAt}
      connection={connection}
      onAction={async (action, id) => {
        if (fails) return { error: "The queue server did not answer." };
        await act(action, id);
      }}
    />
  );
}

export const Default: Story = { render: () => <Demo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
export const EmptyQueue: Story = { render: () => <Demo empty /> };
export const ActionFails: Story = { render: () => <Demo fails /> };
export const Reconnecting: Story = { render: () => <Demo connection="reconnecting" /> };
