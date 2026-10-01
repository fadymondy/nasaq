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

export const Primitives: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Spinner />
      <Skeleton className="h-4 w-40" />
    </div>
  ),
};
