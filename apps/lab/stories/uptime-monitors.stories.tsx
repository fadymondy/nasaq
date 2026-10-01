import { IncidentList, UptimeBadge, UptimeBar } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { makeChecks, sampleIncidents, UptimeDemo, useAr } from "./_infra-demo";

const meta = { title: "Components/Monitoring/Uptime Monitors" } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Switch 24h, 7d or 30d above the table. Pause, resume, check now, edit and delete are row actions and open on right-click. */
export const Default: Story = { render: () => <UptimeDemo /> };

export const Empty: Story = { render: () => <UptimeDemo empty /> };

export const Loading: Story = { render: () => <UptimeDemo loading /> };

function Parts() {
  const ar = useAr();
  return (
    <div className="grid max-w-xl gap-6">
      <UptimeBar checks={makeChecks(60, 5, 40)} />
      <div className="flex flex-wrap gap-2">
        <UptimeBadge percent={100} period="30d" />
        <UptimeBadge percent={99.95} period="30d" />
        <UptimeBadge percent={99.5} period="7d" />
        <UptimeBadge percent={97.2} period="24h" />
        <UptimeBadge percent={null} />
      </div>
      <IncidentList incidents={sampleIncidents(ar)} />
    </div>
  );
}

export const Parts_: Story = { name: "Bar, badge and incidents", render: () => <Parts /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <UptimeDemo /> };
