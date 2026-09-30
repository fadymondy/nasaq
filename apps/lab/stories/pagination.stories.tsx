import { CursorPager, LoadMore, Pagination, useNasaq } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

const meta = { title: "Components/Navigation/Pagination", component: Pagination } satisfies Meta<typeof Pagination>;
export default meta;
type Story = StoryObj;

/** Ellipsis appears as you move away from the ends. Chevrons mirror in RTL. */
export const Default: Story = {
  render: function Render() {
    const [page, setPage] = useState(8);
    return <Pagination page={page} pageCount={24} onPageChange={setPage} />;
  },
};

export const WideWindow: Story = {
  render: function Render() {
    const [page, setPage] = useState(1);
    return <Pagination page={page} pageCount={40} siblings={2} boundaries={2} onPageChange={setPage} />;
  },
};

/** Prev/next with a "Showing X–Y" label, for cursor-based APIs. */
export const Cursor: Story = {
  render: function Render() {
    const [i, setI] = useState(0);
    const size = 20;
    return (
      <div className="w-full max-w-xl">
        <CursorPager
          from={i * size + 1}
          to={(i + 1) * size}
          total={95}
          hasPrevious={i > 0}
          hasNext={i < 4}
          onPrevious={() => setI(i - 1)}
          onNext={() => setI(i + 1)}
        />
      </div>
    );
  },
};

/** A button with a loading state that appends the next batch. */
export const LoadMoreStory: Story = {
  name: "Load more",
  render: function Render() {
    const ar = useNasaq().locale.startsWith("ar");
    const [rows, setRows] = useState(3);
    const [loading, setLoading] = useState(false);
    const load = () => {
      setLoading(true);
      setTimeout(() => {
        setRows((r) => r + 3);
        setLoading(false);
      }, 900);
    };
    return (
      <div className="flex w-72 flex-col items-center gap-3">
        <ul className="w-full divide-y divide-border rounded-card border border-border text-body-sm">
          {Array.from({ length: rows }, (_, i) => (
            <li key={i} className="px-3 py-2">
              {ar ? `عنصر ${i + 1}` : `Item ${i + 1}`}
            </li>
          ))}
        </ul>
        <LoadMore loading={loading} onClick={load} />
      </div>
    );
  },
};
