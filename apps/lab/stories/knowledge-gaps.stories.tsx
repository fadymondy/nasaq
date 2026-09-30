import { KnowledgeGaps } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { KnowledgeGapsDemo, makeGaps } from "./_t2-demo";

const meta = { title: "Components/AI/Knowledge Gaps", component: KnowledgeGaps, parameters: { layout: "padded" } } satisfies Meta<typeof KnowledgeGaps>;
export default meta;
type Story = StoryObj;

/** Unanswered queries grouped by status. Mark indexed, dismiss or reopen; the row also has a context menu. The first dismiss on "supplier contract" fails once. */
export const Default: Story = { render: () => <KnowledgeGapsDemo /> };
export const Static: Story = { render: () => <KnowledgeGaps gaps={makeGaps(false)} /> };
export const Loading: Story = { render: () => <KnowledgeGaps gaps={[]} loading /> };
export const Empty: Story = { render: () => <KnowledgeGaps gaps={[]} /> };
export const ErrorState: Story = { render: () => <KnowledgeGaps gaps={[]} error="Could not load the gaps." onRetry={() => undefined} /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <KnowledgeGapsDemo /> };
