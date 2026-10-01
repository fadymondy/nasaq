import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClinicDashboard } from "@nasaq/web";
import { useClinicDoctors, useClinicRooms, useDemoQueue } from "./_seatfor-demo";

const meta = { title: "Components/Healthcare/Clinic Dashboard", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Demo({ quiet = false }: { quiet?: boolean }) {
  const rooms = useClinicRooms();
  const doctors = useClinicDoctors();
  const { entries, updatedAt } = useDemoQueue();
  const queuedAt = quiet ? [] : entries.filter((e) => e.status === "waiting").map((e) => e.queuedAt);
  return <ClinicDashboard rooms={quiet ? rooms.map((r) => ({ ...r, status: "free" as const })) : rooms} doctors={doctors} queuedAt={queuedAt} updatedAt={updatedAt} />;
}

export const Default: Story = { render: () => <Demo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
export const QuietMorning: Story = { render: () => <Demo quiet /> };
