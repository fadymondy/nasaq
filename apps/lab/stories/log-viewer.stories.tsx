import { Button, countByLevel, LOG_RANGES, LogViewer, type LogViewerFilter } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMemo, useState } from "react";
import { sleep } from "./_auth";
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

// A pretend server: 3,000 entries over the last three days, filtered and paged "remotely".
const DAY = 86_400_000;
function useServerLogs(ar: boolean) {
  const all = useMemo(() => {
    const now = Date.now();
    return makeLogs(3000, ar).map((e, i) => ({ ...e, time: now - 3 * DAY + Math.round((i / 3000) * 3 * DAY) }));
  }, [ar]);
  const [filter, setFilter] = useState<LogViewerFilter | null>(null);
  const [limit, setLimit] = useState(100);
  const matching = useMemo(() => {
    if (!filter) return all.filter((e) => e.time >= Date.now() - DAY);
    const q = filter.query.toLowerCase();
    return all.filter(
      (e) => (filter.since === null || e.time >= filter.since) && (!q || e.message.toLowerCase().includes(q)),
    );
  }, [all, filter]);
  const counts = useMemo(() => countByLevel(matching), [matching]);
  const levelled = useMemo(() => (filter ? matching.filter((e) => filter.levels.includes(e.level)) : matching), [matching, filter]);
  return {
    entries: levelled.slice(-limit),
    counts,
    total: levelled.length,
    hasOlder: levelled.length > limit,
    onFilterChange: (f: LogViewerFilter) => {
      setFilter(f);
      setLimit(100);
    },
    onLoadOlder: () => sleep(700).then(() => setLimit((n) => n + 100)),
  };
}

/**
 * `manual`: the server filters. Changing a level, the search or the time range calls `onFilterChange`; the chips
 * show the server's counts and the footer its total. Scroll to the top for "Load older entries".
 */
export const ServerSide: Story = {
  render: function Render() {
    const ar = useAr();
    const server = useServerLogs(ar);
    return (
      <LogViewer
        manual
        entries={server.entries}
        counts={server.counts}
        total={server.total}
        ranges={LOG_RANGES}
        defaultRange="24h"
        onFilterChange={server.onFilterChange}
        hasOlder={server.hasOlder}
        onLoadOlder={server.onLoadOlder}
        follow
        height="22rem"
        className="max-w-4xl"
      />
    );
  },
};

/** A time-range select over local entries: the list keeps only what falls inside the window. */
export const TimeRange: Story = {
  render: () => {
    const ar = useAr();
    const entries = useMemo(() => {
      const now = Date.now();
      return makeLogs(400, ar).map((e, i) => ({ ...e, time: now - 2 * DAY + Math.round((i / 400) * 2 * DAY) }));
    }, [ar]);
    return <LogViewer entries={entries} ranges={LOG_RANGES} defaultRange="1h" height="20rem" className="max-w-4xl" />;
  },
};

/**
 * `liveTail`: pause holds the list still while entries keep arriving; the footer counts them and "N new entries"
 * resumes and jumps to the newest.
 */
export const LiveTail: Story = {
  render: function Render() {
    const ar = useAr();
    const entries = useLogStream(ar, { initial: 40, every: 600 });
    const [live, setLive] = useState(true);
    return (
      <div className="flex max-w-4xl flex-col gap-2">
        <LogViewer entries={entries} streaming={live} liveTail onLiveChange={setLive} height="20rem" />
        <p className="text-caption text-muted-foreground">
          {ar ? (live ? "مباشر" : "متوقف مؤقتًا") : live ? "Live" : "Paused"}
        </p>
      </div>
    );
  },
};

export const ServerSideArabic: Story = { ...ServerSide, globals: { locale: "ar" } };
export const LiveTailArabic: Story = { ...LiveTail, globals: { locale: "ar" } };
