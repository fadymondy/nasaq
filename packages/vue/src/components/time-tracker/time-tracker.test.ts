import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NqTimeEntryList, NqTimesheet, NqTimeTracker, type TimeEntry, type TimeProject } from ".";
import { buildGrid, formatClock, formatHours, parseDuration } from "./time-math";

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

const projects: TimeProject[] = [
  { id: "web", name: "Website", tasks: [{ id: "ui", name: "UI polish" }] },
  { id: "app", name: "Mobile app" },
];
const entries: TimeEntry[] = [
  { id: "1", date: "2026-09-28", seconds: 5400, projectId: "web", taskId: "ui", note: "Header" },
  { id: "2", date: "2026-09-28", seconds: 1800, projectId: "app" },
  { id: "3", date: "2026-09-29", seconds: 3600, projectId: "web", taskId: "ui" },
];

describe("time helpers", () => {
  it("reads typed durations and formats clocks", () => {
    expect(parseDuration("1:30")).toBe(5400);
    expect(parseDuration("1.5h")).toBe(5400);
    expect(parseDuration("90m")).toBe(5400);
    expect(parseDuration("45")).toBe(45 * 60);
    expect(parseDuration("abc")).toBeNull();
    expect(formatClock(3725)).toBe("1:02:05");
    expect(formatHours(5400)).toBe("1:30");
    expect(buildGrid(entries, ["2026-09-28", "2026-09-29"], (e) => e.projectId).total).toBe(10800);
  });
});

describe("NqTimeTracker", () => {
  it("asks for a project before starting", async () => {
    const onStart = vi.fn();
    const w = mount(NqTimeTracker, { props: { projects, onStart }, attachTo: document.body });
    expect(w.find('[role="timer"]').text()).toContain("0:00:00");
    await w.find("button").trigger("click");
    await flushPromises();
    expect(onStart).not.toHaveBeenCalled();
    expect(w.text()).toContain("Choose a project.");
  });

  it("restores a running timer, ticks, and stops with the elapsed seconds", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-29T09:00:00"));
    const onStop = vi.fn(async () => undefined);
    const w = mount(NqTimeTracker, {
      props: { projects, onStop, defaultRunning: { projectId: "web", taskId: "ui", startedAt: Date.now() - 65_000 } },
      attachTo: document.body,
    });
    expect(w.find('[data-slot="time-tracker"]').exists()).toBe(true);
    expect(w.find('[role="timer"]').text()).toContain("0:01:05");
    expect(w.text()).toContain("Website / UI polish");
    await vi.advanceTimersByTimeAsync(2000);
    expect(w.find('[role="timer"]').text()).toContain("0:01:07");
    const stop = w.findAll("button").find((b) => b.text() === "Stop timer")!;
    await stop.trigger("click");
    await flushPromises();
    expect(onStop).toHaveBeenCalledWith(expect.objectContaining({ projectId: "web", taskId: "ui", seconds: 67 }));
    expect(w.emitted("update:running")?.at(-1)).toEqual([null]);
    expect(w.find('[role="status"]').text()).toBe("Timer stopped");
  });

  it("keeps the timer running and shows the error when stop fails", async () => {
    const w = mount(NqTimeTracker, {
      props: { projects, onStop: async () => ({ error: "No connection" }), running: { projectId: "app", startedAt: Date.now() - 5000 } },
      attachTo: document.body,
    });
    await w.findAll("button").find((b) => b.text() === "Stop timer")!.trigger("click");
    await flushPromises();
    expect(w.find('[role="alert"]').text()).toBe("No connection");
    expect(w.emitted("update:running")).toBeUndefined();
  });
});

describe("NqTimeEntryList", () => {
  it("groups by day, newest first, with day totals and an empty state", () => {
    const w = mount(NqTimeEntryList, { props: { entries, projects }, attachTo: document.body });
    const cards = w.findAll('[data-slot="card"]');
    expect(cards).toHaveLength(2);
    expect(cards[0]!.text()).toContain("1:00");
    expect(cards[1]!.text()).toContain("2:00");
    expect(w.text()).toContain("Website / UI polish");
    expect(w.text()).toContain("Mobile app");
    const empty = mount(NqTimeEntryList, { props: { entries: [], projects, onAdd: async () => undefined }, attachTo: document.body });
    expect(empty.text()).toContain("No time logged yet");
  });

  it("calls onDelete from the row button", async () => {
    const onDelete = vi.fn();
    const w = mount(NqTimeEntryList, { props: { entries, projects, onDelete }, attachTo: document.body });
    await w.find('button[aria-label^="Delete entry"]').trigger("click");
    expect(onDelete).toHaveBeenCalledWith(entries[2]);
  });
});

describe("NqTimesheet", () => {
  it("totals a week by row and day", () => {
    const w = mount(NqTimesheet, { props: { entries, projects, date: new Date(2026, 8, 29) }, attachTo: document.body });
    const table = w.find("table");
    expect(table.exists()).toBe(true);
    const rows = table.findAll("tbody tr");
    expect(rows).toHaveLength(2);
    expect(rows[0]!.text()).toContain("Website / UI polish");
    expect(rows[0]!.text()).toContain("1:30");
    expect(table.find("tfoot").text()).toContain("3:00");
    expect(w.find('[data-slot="timesheet"]').exists()).toBe(true);
  });

  it("switches to a day and moves with the arrows", async () => {
    const w = mount(NqTimesheet, { props: { entries, projects, defaultDate: new Date(2026, 8, 29), defaultView: "day" }, attachTo: document.body });
    expect(w.find("table tbody").text()).toContain("1:00");
    expect(w.find("table tbody").text()).not.toContain("1:30");
    await w.find('button[aria-label="Previous"]').trigger("click");
    expect(w.emitted("update:date")).toHaveLength(1);
    expect(w.find("table tbody").text()).toContain("1:30");
  });
});
