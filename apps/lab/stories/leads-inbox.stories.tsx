import { LeadsInbox } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { LeadsInboxDemo, makeLeads } from "./_crm-r1-demo";

const meta = { title: "Components/CRM/Leads Inbox", component: LeadsInbox, parameters: { layout: "padded" } } satisfies Meta<typeof LeadsInbox>;
export default meta;
type Story = StoryObj;

/** Filter by stage, open a lead, read where it came from, move it, reply with a canned reply, or convert it. Context-click a row for its actions. */
export const Default: Story = { render: () => <LeadsInboxDemo /> };

/** A lead with a Google click id and UTM tags, its detail open. */
export const DetailOpen: Story = { render: () => <LeadsInboxDemo defaultOpenId="l1" /> };

export const Cards: Story = { render: () => <LeadsInbox leads={makeLeads(false)} defaultView="cards" /> };
export const Empty: Story = { render: () => <LeadsInbox leads={[]} /> };
export const Loading: Story = { render: () => <LeadsInboxDemo loading /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <LeadsInboxDemo /> };
