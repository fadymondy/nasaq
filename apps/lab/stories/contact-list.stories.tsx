import { ContactList } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { makeContacts } from "./_crm-demo";

const meta = { title: "Components/CRM/Contact List", component: ContactList, parameters: { layout: "padded" } } satisfies Meta<typeof ContactList>;
export default meta;
type Story = StoryObj;

/** A table with search, stage / tag / owner filters, column choice and bulk select. The view toggle switches to cards. */
export const Default: Story = { render: () => <ContactList contacts={makeContacts("en")} onRowClick={() => undefined} /> };

export const Cards: Story = { render: () => <ContactList contacts={makeContacts("en")} defaultView="cards" pageSize={12} /> };

export const Loading: Story = { render: () => <ContactList contacts={[]} loading /> };
export const LoadingCards: Story = { render: () => <ContactList contacts={[]} loading defaultView="cards" /> };
export const Empty: Story = { render: () => <ContactList contacts={[]} /> };
export const ErrorState: Story = { render: () => <ContactList contacts={[]} error="Could not load contacts." onRetry={() => undefined} /> };

/** Arabic strings, Arabic data, right-to-left layout; emails stay left-to-right. */
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <ContactList contacts={makeContacts("ar")} onRowClick={() => undefined} /> };
export const ArabicCards: Story = { globals: { locale: "ar" }, render: () => <ContactList contacts={makeContacts("ar")} defaultView="cards" pageSize={12} /> };
