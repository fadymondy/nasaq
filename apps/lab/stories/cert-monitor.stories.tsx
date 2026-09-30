import { DaysLeftBadge } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CertsDemo } from "./_infra-demo";

const meta = { title: "Components/Health/Certificate Monitor" } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Soonest expiry first. Green above 30 days, amber at 30 or fewer, red at 7 or fewer or expired. Renew the manual ones from the row menu. */
export const Default: Story = { render: () => <CertsDemo /> };

export const Loading: Story = { render: () => <CertsDemo loading /> };

export const Badges: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <DaysLeftBadge days={90} />
      <DaysLeftBadge days={30} />
      <DaysLeftBadge days={7} />
      <DaysLeftBadge days={0} />
      <DaysLeftBadge days={-3} />
      <DaysLeftBadge days={null} />
    </div>
  ),
};

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <CertsDemo /> };
