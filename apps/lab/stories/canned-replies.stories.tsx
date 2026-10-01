import { CannedRepliesManager } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CannedRepliesDemo, makeCannedReplies } from "./_crm-r1-demo";

const meta = { title: "Components/Chat/Canned Replies", component: CannedRepliesManager, parameters: { layout: "padded" } } satisfies Meta<typeof CannedRepliesManager>;
export default meta;
type Story = StoryObj;

/** Add, edit, duplicate and delete. Context-click a row for its actions. Reuse a shortcut to see validation. */
export const Default: Story = { render: () => <CannedRepliesDemo /> };

export const ReadOnly: Story = { render: () => <CannedRepliesManager replies={makeCannedReplies(false)} /> };
export const Empty: Story = { render: () => <CannedRepliesManager replies={[]} onSave={async () => undefined} /> };
export const Loading: Story = { render: () => <CannedRepliesManager replies={[]} loading /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <CannedRepliesDemo /> };
