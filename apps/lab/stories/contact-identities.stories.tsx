import { ContactIdentities } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ContactIdentitiesDemo } from "./_crm-r1-demo";

const meta = { title: "Components/CRM/Contact Identities", component: ContactIdentities, parameters: { layout: "padded" } } satisfies Meta<typeof ContactIdentities>;
export default meta;
type Story = StoryObj;

/** Link an account (a value containing "taken" shows the conflict), set a primary, remove one, and switch consent per channel. Context-click a row for its actions. */
export const Default: Story = { render: () => <ContactIdentitiesDemo /> };

export const ReadOnly: Story = { render: () => <ContactIdentitiesDemo readOnly /> };

export const Empty: Story = { render: () => <ContactIdentities identities={[]} onAdd={async () => undefined} /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <ContactIdentitiesDemo /> };
