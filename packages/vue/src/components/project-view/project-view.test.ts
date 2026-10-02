import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import type { Issue } from "../issue-view";
import { NqProjectOverview, NqProjectSchedule, NqProjectView, moveProjectIssue } from ".";

const statuses = [
  { id: "todo", name: "To do", hue: "gray" as const, stage: "todo" as const },
  { id: "doing", name: "In progress", hue: "blue" as const, stage: "active" as const },
  { id: "done", name: "Shipped", hue: "green" as const, stage: "done" as const },
];
const labels = [{ id: "l1", name: "Design", hue: "violet" as const }];
const people = [{ id: "u1", name: "Layla Hassan" }];
const project = { id: "p1", name: "Checkout", key: "NSQ", client: "Acme", status: "active" as const, progress: 40, startDate: "2026-09-01", dueDate: "2026-11-30" };
const mk = (id: string, statusId: string, extra: Partial<Issue> = {}): Issue => ({ id, key: `NSQ-${id}`, title: `Issue ${id}`, statusId, priority: "medium", type: "task", labelIds: [], projectId: "p1", createdAt: "2026-09-20T09:00:00Z", ...extra });
const issues = [mk("1", "doing", { dueDate: "2026-10-02" }), mk("2", "todo"), mk("3", "done")];
const base = () => ({ project, issues, statuses, labels, people, now: Date.parse("2026-09-29T09:00:00Z") });

describe("project logic", () => {
  it("moves an issue to a column position", () => {
    const next = moveProjectIssue(issues, "2", "doing", 0, statuses, Date.parse("2026-09-29T09:00:00Z"));
    expect(next.find((i) => i.id === "2")?.statusId).toBe("doing");
  });
});

describe("NqProjectView", () => {
  it("renders the header, tabs and counts", () => {
    const w = mount(NqProjectView, { props: base() });
    expect(w.attributes("data-slot")).toBe("project-view");
    expect(w.attributes("aria-label")).toBe("Checkout");
    expect(w.find("h1").text()).toBe("Checkout");
    const tabs = w.findAll("[role=tab]").map((t) => t.text());
    expect(tabs.map((t) => t.replace(/\d+/g, "").trim())).toEqual(["Overview", "Board", "List", "Timeline"]);
    expect(tabs[1]).toContain("2");
    expect(tabs[2]).toContain("3");
  });
  it("shows optional tabs only when given data and respects `tabs`", () => {
    const w = mount(NqProjectView, { props: { ...base(), activity: [], files: [], onSaveProject: async () => {} } });
    const labelsShown = w.findAll("[role=tab]").map((t) => t.text());
    expect(labelsShown).toEqual(expect.arrayContaining(["Files", "Settings"]));
    const only = mount(NqProjectView, { props: { ...base(), tabs: ["list", "overview"] } });
    expect(only.findAll("[role=tab]").map((t) => t.text().replace(/\d+/g, "").trim())).toEqual(["List", "Overview"]);
  });
  it("opens the New issue dialog only with onCreateIssue", async () => {
    expect(mount(NqProjectView, { props: base() }).text()).not.toContain("New issue");
    const w = mount(NqProjectView, { props: { ...base(), onCreateIssue: vi.fn() }, attachTo: document.body });
    expect(w.text()).toContain("New issue");
    w.unmount();
  });
  it("switches tab and reports it", async () => {
    const onTabChange = vi.fn();
    const w = mount(NqProjectView, { props: { ...base(), onTabChange } });
    const list = w.findAll("[role=tab]")[2]!;
    await list.trigger("mousedown", { button: 0 });
    await list.trigger("keydown", { key: "Enter" });
    await flushPromises();
    expect(w.find("[role=tab][data-state=active], [role=tab][aria-selected=true]").exists()).toBe(true);
  });
  it("renders in Arabic labels through labelsText", () => {
    const w = mount(NqProjectView, { props: { ...base(), labelsText: { tabs: { overview: "Vue d'ensemble" } } } });
    expect(w.findAll("[role=tab]")[0]!.text()).toBe("Vue d'ensemble");
  });
});

describe("parts", () => {
  const overviewText = { open: "Open", done: "Done", overdue: "Overdue", progress: "Progress", byStatus: "By status", byStatusHint: "", burndown: "Burndown", burndownHint: "", remaining: "Remaining", ideal: "Ideal", recent: "Recent", noActivity: "None", budget: "Budget", budgetHint: "", spent: "Spent", left: "Left", over: "Over", noBudget: "No budget", issues: "Issues" };
  it("renders the overview chart and budget", () => {
    const w = mount(NqProjectOverview, { props: { issues, statuses, today: "2026-09-29", budget: { total: 1000, spent: 400 }, t: overviewText } });
    expect(w.find("[data-slot=project-status-chart]").exists()).toBe(true);
    expect(w.text()).toContain("Budget");
  });
  it("renders the schedule empty state", () => {
    const w = mount(NqProjectSchedule, { props: { issues: [], statuses, today: "2026-09-29", t: { label: "Schedule", empty: "Nothing scheduled", emptyHint: "", unscheduled: "No dates", open: "Open", copyKey: "Copy key", actions: "Actions", today: "Today" } } });
    expect(w.text()).toContain("Nothing scheduled");
  });
});
