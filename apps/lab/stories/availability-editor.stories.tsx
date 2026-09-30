import type { Meta, StoryObj } from "@storybook/react-vite";
import { AvailabilityEditor } from "@nasaq/web";
import { useDemoAvailability, wait } from "./_seatfor-demo";

const meta = { title: "Components/Health/Availability Editor", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Demo({ fails = false }: { fails?: boolean }) {
  const value = useDemoAvailability();
  return (
    <div className="mx-auto max-w-4xl">
      <AvailabilityEditor
        defaultValue={value}
        onSave={async () => {
          await wait(500);
          if (fails) return { error: "The calendar service is not available." };
        }}
      />
    </div>
  );
}

export const Default: Story = { render: () => <Demo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
export const SaveFails: Story = { render: () => <Demo fails /> };
