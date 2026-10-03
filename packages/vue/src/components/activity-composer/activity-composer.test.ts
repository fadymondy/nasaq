import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NqActivityComposer, NqActivityTimeline, countByKind, isOverdue, splitActivities, validateActivity, type ActivityRecord } from ".";
import { NasaqProvider } from "../../provider";

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("lang");
  document.documentElement.removeAttribute("dir");
});

const now = new Date(2026, 8, 29, 9, 0).getTime();
const records: ActivityRecord[] = [
  { id: "n1", kind: "note", body: "Called back", at: new Date(2026, 8, 27, 10).toISOString() },
  { id: "t2", kind: "task", body: "Later task", at: new Date(2026, 9, 3, 10).toISOString() },
  { id: "t1", kind: "task", body: "Overdue task", at: new Date(2026, 8, 28, 10).toISOString() },
  { id: "e1", kind: "event", body: "Stage changed", at: new Date(2026, 8, 26, 10).toISOString(), actor: { name: "Omar" } },
  { id: "t3", kind: "task", body: "Finished task", at: new Date(2026, 8, 25, 10).toISOString(), done: true },
];

describe("activity logic", () => {
  it("puts open tasks first by due date, then history newest first", () => {
    const { open, history } = splitActivities(records);
    expect(open.map((a) => a.id)).toEqual(["t1", "t2"]);
    expect(history.map((a) => a.id)).toEqual(["n1", "e1", "t3"]);
  });
  it("flags overdue tasks and validates input", () => {
    expect(isOverdue(records[2]!, now)).toBe(true);
    expect(isOverdue(records[1]!, now)).toBe(false);
    expect(countByKind(records).task).toBe(3);
    expect(validateActivity({ kind: "note", body: " ", at: new Date() })).toBe("empty");
    expect(validateActivity({ kind: "call", body: "x", at: new Date(), durationMinutes: 2000 })).toBe("badDuration");
  });
});

describe("NqActivityComposer", () => {
  it("shows the duration only for calls, and submits the trimmed text", async () => {
    const onSubmit = vi.fn(async () => undefined);
    const w = mount(NqActivityComposer, { props: { onSubmit }, attachTo: document.body });
    expect(w.attributes("data-slot")).toBe("activity-composer");
    expect(w.find('input[type="number"]').exists()).toBe(false);
    await w.find("textarea").setValue("  hello  ");
    await w.trigger("submit");
    await flushPromises();
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const arg = (onSubmit.mock.calls[0] as unknown as [{ kind: string; body: string }])[0];
    expect(arg.kind).toBe("note");
    expect(arg.body).toBe("hello");
  });
  it("blocks an empty body with an alert and keeps the error from onSubmit", async () => {
    const onSubmit = vi.fn(async () => ({ error: "Nope" }));
    const w = mount(NqActivityComposer, { props: { onSubmit } });
    await w.trigger("submit");
    expect(w.find('[role="alert"]').text()).toBe("Write something first.");
    expect(onSubmit).not.toHaveBeenCalled();
    await w.find("textarea").setValue("x");
    await w.trigger("submit");
    await flushPromises();
    expect(w.find('[role="alert"]').text()).toBe("Nope");
    expect((w.find("textarea").element as HTMLTextAreaElement).value).toBe("x");
  });
  it("is Arabic inside an ar provider", () => {
    const w = mount({ components: { NasaqProvider, NqActivityComposer }, template: '<NasaqProvider locale="ar"><NqActivityComposer :on-submit="async () => undefined" /></NasaqProvider>' });
    expect(w.text()).toContain("تسجيل ملاحظة");
  });
});

describe("NqActivityTimeline", () => {
  it("renders Planned and History sections with an overdue badge", () => {
    const w = mount(NqActivityTimeline, { props: { activities: records, now } });
    expect(w.attributes("data-slot")).toBe("activity-timeline");
    expect(w.findAll("section")).toHaveLength(2);
    expect(w.findAll('[data-slot="timeline-item"]')).toHaveLength(5);
    expect(w.text()).toContain("Overdue");
    expect(w.text()).toContain("Planned");
  });
  it("ticks a task and shows an error from the callback", async () => {
    const onToggleTask = vi.fn(async () => ({ error: "Could not save" }));
    const w = mount(NqActivityTimeline, { props: { activities: records, now, onToggleTask }, attachTo: document.body });
    await w.find('button[role="checkbox"]').trigger("click");
    await flushPromises();
    expect(onToggleTask).toHaveBeenCalledWith("t1", true);
    expect(w.find('[role="alert"]').text()).toBe("Could not save");
  });
  it("shows the empty state and the loading skeleton", () => {
    expect(mount(NqActivityTimeline, { props: { activities: [] } }).text()).toContain("No activity yet");
    const loading = mount(NqActivityTimeline, { props: { activities: [], loading: true } });
    expect(loading.attributes("aria-busy")).toBe("true");
    expect(loading.findAll('[data-slot="skeleton"]')).toHaveLength(3);
  });
});
