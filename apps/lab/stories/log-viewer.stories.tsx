import { Button, LogViewer } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMemo, useState } from "react";
import { makeLogs, useAr, useLogStream } from "./_developer-demo";

const meta = { title: "Components/Monitoring/Log Viewer", component: LogViewer, parameters: { layout: "padded" } } satisfies Meta<typeof LogViewer>;
export default meta;
type Story = StoryObj;

/** Filter by level, search (try `slow` or a regex), open a row for its fields. */
export const Static: Story = {
  render: () => {
    const ar = useAr();
    const entries = useMemo(() => makeLogs(120, ar), [ar]);
    return <LogViewer entries={entries} height="22rem" className="max-w-4xl" />;
  },
};

/** A new entry every second. Scroll up to stop following, press "Jump to latest" to resume. */
export const Streaming: Story = {
  render: () => {
    const ar = useAr();
    const [running, setRunning] = useState(true);
    const entries = useLogStream(ar, { initial: 40, every: 800, running });
    return (
      <div className="flex max-w-4xl flex-col gap-3">
        <div>
          <Button size="sm" variant="secondary" onClick={() => setRunning((r) => !r)}>
            {running ? (ar ? "إيقاف البث" : "Pause stream") : ar ? "استئناف البث" : "Resume stream"}
          </Button>
        </div>
        <LogViewer entries={entries} streaming={running} height="22rem" />
      </div>
    );
  },
};

/** 50,000 entries. Only the rows in view are in the DOM. */
export const Large: Story = {
  render: () => {
    const ar = useAr();
    const entries = useMemo(() => makeLogs(50_000, ar), [ar]);
    return <LogViewer entries={entries} title="50,000 entries" height="24rem" className="max-w-4xl" />;
  },
};

/** No matches, and an empty log. */
export const Empty: Story = {
  render: () => <LogViewer entries={[]} height="14rem" className="max-w-4xl" />,
};

export const Arabic: Story = {
  globals: { locale: "ar" },
  render: () => {
    const ar = useAr();
    const entries = useLogStream(ar, { initial: 50 });
    return <LogViewer entries={entries} streaming height="22rem" className="max-w-4xl" />;
  },
};
