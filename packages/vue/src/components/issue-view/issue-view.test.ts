import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import {
  ISSUE_PRIORITIES,
  NqIssueProperties,
  NqIssueQuickView,
  NqIssueView,
  NqPriorityIcon,
  NqStatusDot,
  NqTypeIcon,
  applyIssuePatch,
  issueDueState,
  issueEstimateSummary,
  issueParentCandidates,
  issueParseEstimate,
  issueSubProgress,
  type Issue,
} from ".";

const statuses = [
  { id: "todo", name: "To do", hue: "gray" as const, stage: "todo" as const },
  { id: "doing", name: "In progress", hue: "blue" as const, stage: "active" as const },
  { id: "done", name: "Shipped", hue: "green" as const, stage: "done" as const },
];
const labels = [{ id: "l1", name: "Design", hue: "violet" as const }];
const people = [{ id: "u1", name: "Layla Hassan" }];
const projects = [{ id: "p1", name: "Checkout" }];
const issue: Issue = { id: "i1", key: "NSQ-42", title: "Refunds fail", description: "<p>Broken</p>", statusId: "doing", priority: "high", type: "bug", labelIds: ["l1"], projectId: "p1", createdAt: "2026-09-20T09:00:00Z" };
const base = () => ({ issue, statuses, labels, people, projects });

describe("issue logic", () => {
  it("parses estimates and summarises logged time", () => {
    expect(issueParseEstimate("1h 30m")).toBe(1.5);
    expect(issueParseEstimate("abc")).toBeNull();
    expect(issueEstimateSummary(7200, 1).over).toBe(true);
  });
  it("derives due state, patches, sub-issue progress and parent candidates", () => {
    const now = Date.parse("2026-09-29T09:00:00Z");
    expect(issueDueState("2026-09-28", now)).toBe("overdue");
    expect(issueDueState("2026-09-29", now)).toBe("today");
    expect(applyIssuePatch(issue, { statusId: "done" }, statuses, now).completedAt).toBeTruthy();
    expect(issueSubProgress([{ statusId: "done" }, { statusId: "todo" }], statuses).percent).toBe(50);
    expect(issueParentCandidates("a", [{ id: "a" }, { id: "b", parentId: "a" }, { id: "c" }]).map((x) => x.id)).toEqual(["c"]);
    expect(ISSUE_PRIORITIES).toHaveLength(5);
  });
});

describe("marks", () => {
  it("render their slots", () => {
    expect(mount(NqStatusDot, { props: { hue: "green" } }).attributes("data-slot")).toBe("status-dot");
    expect(mount(NqPriorityIcon, { props: { priority: "urgent" } }).exists()).toBe(true);
    expect(mount(NqTypeIcon, { props: { type: "bug" } }).exists()).toBe(true);
  });
});

describe("NqIssueView", () => {
  it("renders the header, description and properties", () => {
    const w = mount(NqIssueView, { props: { ...base(), onUpdate: vi.fn(async () => undefined) }, attachTo: document.body });
    expect(w.attributes("data-slot")).toBe("issue-view");
    expect(w.get("h1").text()).toBe("Refunds fail");
    expect(w.text()).toContain("NSQ-42");
    expect(w.text()).toContain("In progress");
    expect(w.get('[data-slot="issue-description"]').text()).toContain("Broken");
    expect(w.findAll('[data-slot="issue-property"]')).toHaveLength(9);
    w.unmount();
  });

  it("saves a new title on Enter and rejects an empty one", async () => {
    const onUpdate = vi.fn(async () => undefined);
    const w = mount(NqIssueView, { props: { ...base(), onUpdate }, attachTo: document.body });
    await w.get("h1 button").trigger("click");
    const input = w.get("input[aria-label='Edit title']");
    await input.setValue("");
    await input.trigger("keydown", { key: "Enter" });
    expect(w.get("[role=alert]").text()).toBe("A title is required");
    await input.setValue("New title");
    await input.trigger("keydown", { key: "Enter" });
    await flushPromises();
    expect(onUpdate).toHaveBeenCalledWith({ title: "New title" });
    w.unmount();
  });

  it("is read-only without onUpdate and shows only the tabs with data", () => {
    const w = mount(NqIssueView, { props: { ...base(), thread: { comments: [], currentUser: { id: "u1", name: "Layla" } } }, attachTo: document.body });
    expect(w.find("h1 button").exists()).toBe(false);
    expect(w.findAll('[role="tab"]').map((t) => t.text())).toEqual(["Comments"]);
    w.unmount();
  });

  it("lists sub-issues and adds one", async () => {
    const onAddSubIssue = vi.fn(async () => undefined);
    const w = mount(NqIssueView, { props: { ...base(), subIssues: [{ id: "s1", key: "NSQ-43", title: "Fix tax", statusId: "done" }], onAddSubIssue }, attachTo: document.body });
    expect(w.get('[data-slot="issue-sub-issues"]').text()).toContain("NSQ-43");
    await w.get("form input").setValue("Write tests");
    await w.get("form").trigger("submit");
    await flushPromises();
    expect(onAddSubIssue).toHaveBeenCalledWith("Write tests");
    w.unmount();
  });
});

describe("NqIssueProperties", () => {
  it("marks the list busy state and shows the due hint", () => {
    const w = mount(NqIssueProperties, { props: { ...base(), issue: { ...issue, dueDate: "2026-09-28" }, now: Date.parse("2026-09-29T09:00:00Z"), onUpdate: vi.fn(async () => undefined) }, attachTo: document.body });
    expect(w.attributes("data-slot")).toBe("issue-properties");
    expect(w.text()).toContain("Overdue");
    w.unmount();
  });
});

describe("NqIssueQuickView", () => {
  it("opens a sheet with the drawer variant", async () => {
    mount(NqIssueQuickView, { props: { ...base(), open: true, onOpenFull: vi.fn() }, attachTo: document.body });
    await flushPromises();
    expect(document.body.querySelector('[data-slot="issue-view"]')?.getAttribute("data-variant")).toBe("drawer");
    expect(document.body.textContent).toContain("Open");
  });
});
