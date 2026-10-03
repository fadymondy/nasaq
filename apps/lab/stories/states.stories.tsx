import { Button, EmptyState, ErrorState, LoadingState, Skeleton, Spinner } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = { title: "Components/Loading & States/States" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  render: () => (
    <EmptyState
      title="No issues yet"
      description="Issues you create or are assigned to appear here."
      actions={<Button variant="primary">New issue</Button>}
    />
  ),
};

export const Error: Story = {
  render: () => (
    <ErrorState title="Could not load issues" description="The server did not respond." actions={<Button>Try again</Button>} />
  ),
};

export const Loading: Story = { render: () => <LoadingState rows={4} className="max-w-md" /> };

/** `shape="grid"`: skeleton cards, one column on small screens. */
export const LoadingGrid: Story = { name: "Loading grid", render: () => <LoadingState shape="grid" columns={3} rows={6} /> };

/** `shape="timeline"` with a visible `caption`, which is also what gets announced. */
export const LoadingTimeline: Story = {
  name: "Loading timeline",
  render: () => <LoadingState shape="timeline" rows={4} caption="Fetching the audit trail…" className="max-w-md" />,
};

export const LoadingArabic: Story = {
  name: "Loading (Arabic)",
  globals: { locale: "ar" },
  render: () => (
    <div className="flex flex-col gap-8">
      <LoadingState shape="timeline" rows={3} caption="جارٍ جلب سجل التدقيق…" className="max-w-md" />
      <LoadingState shape="grid" columns={2} rows={4} />
    </div>
  ),
};

export const Primitives: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Spinner />
      <Skeleton className="h-4 w-40" />
    </div>
  ),
};
