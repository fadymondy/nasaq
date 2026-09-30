import { ContactMerge } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { makeMergeRecords } from "./_crm-r1-demo";

const meta = { title: "Components/CRM/Contact Merge", component: ContactMerge, parameters: { layout: "padded" } } satisfies Meta<typeof ContactMerge>;
export default meta;
type Story = StoryObj;

const wait = () => new Promise<void>((r) => setTimeout(r, 800));

/** Pick the survivor, settle each field that differs, then confirm. Consent keeps the most restrictive answer. */
export const Default: Story = { render: () => <ContactMerge records={makeMergeRecords(false)} onMerge={wait} onCancel={() => undefined} /> };

/** Only two records, so fewer fields differ. */
export const TwoRecords: Story = { render: () => <ContactMerge records={makeMergeRecords(false).slice(0, 2)} onMerge={wait} /> };

/** The server refuses: the dialog stays and shows why. */
export const MergeError: Story = { render: () => <ContactMerge records={makeMergeRecords(false)} onMerge={async () => ({ error: "Another merge is running on one of these contacts." })} /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <ContactMerge records={makeMergeRecords(true)} onMerge={wait} onCancel={() => undefined} /> };
