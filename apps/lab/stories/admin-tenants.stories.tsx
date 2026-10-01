import { AdminPlans, AdminWorkspaces } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useTenantsDemo } from "./_admin-demo";
import { ArabicScope, useAr } from "./_profile-demo";

const meta = { title: "Components/Admin/Admin Tenants", component: AdminWorkspaces, parameters: { layout: "padded" } } satisfies Meta<typeof AdminWorkspaces>;
export default meta;
type Story = StoryObj;

function Workspaces() {
  const demo = useTenantsDemo(useAr());
  return <AdminWorkspaces workspaces={demo.workspaces} plans={demo.plans} {...demo.workspaceHandlers} onOpen={() => undefined} />;
}
function Plans() {
  const demo = useTenantsDemo(useAr());
  return <AdminPlans plans={demo.plans} onSavePlan={demo.onSavePlan} />;
}

export const Default: Story = { render: () => <Workspaces /> };
export const PlanCatalogue: Story = { render: () => <Plans /> };
export const Arabic: Story = {
  render: () => (
    <ArabicScope>
      <Workspaces />
    </ArabicScope>
  ),
};
export const ArabicPlans: Story = {
  render: () => (
    <ArabicScope>
      <Plans />
    </ArabicScope>
  ),
};
