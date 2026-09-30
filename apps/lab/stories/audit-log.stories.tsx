import { AuditLog } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArabicScope } from "./_team-demo";
import { AuditDemo } from "./_team-pages";

const meta = { title: "Components/Account/Audit Log", component: AuditLog, parameters: { layout: "padded" } } satisfies Meta<typeof AuditLog>;
export default meta;
type Story = StoryObj;

/** Try the retention Select: "Forever" fails and rolls back; a shorter window warns how many entries expire. */
export const Default: Story = { render: () => <AuditDemo /> };
export const Loading: Story = { render: () => <AuditDemo loading /> };
export const Empty: Story = { render: () => <AuditDemo empty /> };
export const Failed: Story = { render: () => <AuditDemo error="The audit service did not answer." /> };
export const Arabic: Story = {
  globals: { locale: "ar" },
  render: () => (
    <ArabicScope>
      <AuditDemo />
    </ArabicScope>
  ),
};
