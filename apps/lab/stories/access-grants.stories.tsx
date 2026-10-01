import { AccessGrants } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArabicScope } from "./_team-demo";
import { AccessDemo } from "./_team-pages";
const meta = { title: "Components/Security/Access Grants", component: AccessGrants, parameters: { layout: "padded" } } satisfies Meta<typeof AccessGrants>;
export default meta;
type Story = StoryObj;

/** Give the Deploy agent write on Billing to see the rollback. */
export const Default: Story = { render: () => <AccessDemo /> };
export const Empty: Story = { render: () => <AccessDemo empty /> };
export const Arabic: Story = {
  globals: { locale: "ar" },
  render: () => (
    <ArabicScope>
      <AccessDemo />
    </ArabicScope>
  ),
};
