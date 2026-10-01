import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClinicSchedule } from "@nasaq/web";
import { NOW_DATE, useClinicAppointments } from "./_seatfor-demo";

const meta = { title: "Components/Healthcare/Clinic Schedule", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Demo({ empty = false }: { empty?: boolean }) {
  const appointments = useClinicAppointments();
  return <ClinicSchedule appointments={empty ? [] : appointments} defaultDate={NOW_DATE} now={NOW_DATE} onSelect={() => undefined} />;
}

export const Default: Story = { render: () => <Demo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
export const EmptyDay: Story = { render: () => <Demo empty /> };
