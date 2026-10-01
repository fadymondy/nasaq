import { TimeEntryList, TimeTracker, Timesheet } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { demoEntries, timeProjects } from "./_billing-demo";
import { useAr, wait } from "./_profile-demo";

const meta = { title: "Components/Productivity/TimeTracker", component: TimeTracker, parameters: { layout: "padded" } } satisfies Meta<typeof TimeTracker>;
export default meta;
type Story = StoryObj;

function TrackerDemo({ running }: { running?: boolean }) {
  const ar = useAr();
  return (
    <div className="max-w-xl">
      <TimeTracker
        projects={timeProjects(ar)}
        defaultRunning={running ? { projectId: "web", taskId: "ui", note: ar ? "مراجعة الشريط الجانبي" : "Sidebar review", startedAt: Date.now() - 40 * 60 * 1000 } : null}
        onStart={async () => {
          await wait(300);
        }}
        onStop={async () => {
          await wait(300);
        }}
      />
    </div>
  );
}

function ListDemo({ empty }: { empty?: boolean }) {
  const ar = useAr();
  const [entries, setEntries] = useState(() => (empty ? [] : demoEntries(ar)));
  return (
    <div className="max-w-xl">
      <TimeEntryList
        entries={entries}
        projects={timeProjects(ar)}
        onAdd={async (input) => {
          await wait(300);
          setEntries((all) => [{ id: String(Date.now()), ...input }, ...all]);
        }}
        onEdit={async (entry, input) => {
          await wait(300);
          setEntries((all) => all.map((e) => (e.id === entry.id ? { ...e, ...input } : e)));
        }}
        onDelete={(entry) => setEntries((all) => all.filter((e) => e.id !== entry.id))}
      />
    </div>
  );
}

function SheetDemo() {
  const ar = useAr();
  return <Timesheet entries={demoEntries(ar)} projects={timeProjects(ar)} />;
}

export const Default: Story = { render: () => <TrackerDemo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <TrackerDemo /> };
export const Running: Story = { render: () => <TrackerDemo running /> };
export const Entries: Story = { render: () => <ListDemo /> };
export const EntriesArabic: Story = { globals: { locale: "ar" }, render: () => <ListDemo /> };
export const NoEntries: Story = { render: () => <ListDemo empty /> };
export const WeekTimesheet: Story = { render: () => <SheetDemo /> };
export const TimesheetArabic: Story = { globals: { locale: "ar" }, render: () => <SheetDemo /> };
