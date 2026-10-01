import type { Meta, StoryObj } from "@storybook/react-vite";
import { CurrentVisit } from "@nasaq/web";
import { useState } from "react";
import { useVisitPatient, wait } from "./_seatfor-demo";

const meta = { title: "Components/Healthcare/Current Visit", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Demo({ withRx = false, fails = false }: { withRx?: boolean; fails?: boolean }) {
  const { patient, history, prescriptions } = useVisitPatient();
  const [started] = useState(() => Date.now() - 6 * 60000 - 20000);
  return (
    <CurrentVisit
      patient={patient}
      service="Consultation"
      room="1"
      startedAt={started}
      history={history}
      defaultPrescriptions={withRx ? prescriptions : []}
      defaultNotes={withRx ? "Dry cough, no fever. Chest clear." : ""}
      workingWeekdays={[6, 0, 1, 2, 3, 4]}
      onFinish={async () => {
        await wait(500);
        if (fails) return { error: "The record could not be saved." };
      }}
    />
  );
}

export const Default: Story = { render: () => <Demo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
export const Filled: Story = { render: () => <Demo withRx /> };
export const SaveFails: Story = { render: () => <Demo withRx fails /> };
