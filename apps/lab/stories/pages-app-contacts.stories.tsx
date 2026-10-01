/* Contacts screen of a CRM: table and cards, search, filters, bulk select and export. The whole screen lives in ./_crm-demo.tsx. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ContactsPage } from "./_crm-demo";

const meta = { title: "Components/CRM/Pages/Contacts", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <ContactsPage /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <ContactsPage /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <ContactsPage /> };
