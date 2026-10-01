import { DomainChips } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { DomainsDemo, manyDomains } from "./_infra-demo";

const meta = { title: "Components/Server Tools/Domains Manager" } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Add a domain, check again (the .net one keeps failing), make one primary, remove with a confirm. */
export const Default: Story = { render: () => <DomainsDemo /> };

export const Loading: Story = { render: () => <DomainsDemo loading /> };

/** The compact chips used inside tables. More than three show a +N chip that opens the rest. */
export const Chips: Story = {
  render: () => (
    <div className="grid max-w-md gap-4">
      <DomainChips domains={manyDomains.slice(0, 2)} />
      <DomainChips domains={manyDomains.slice(0, 4)} />
      <DomainChips domains={manyDomains} />
    </div>
  ),
};

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <DomainsDemo /> };
