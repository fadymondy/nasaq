import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { boardIndex, EMPTY_ISSUE_FILTER, filterIssues, isIssueFilterActive, NqIssueBoard, NqIssueCard } from ".";

const statuses = [
  { id: "todo", name: "To do", hue: "gray" as const, stage: "todo" as const },
  { id: "done", name: "Shipped", hue: "green" as const, stage: "done" as const },
];
const labels = [{ id: "l1", name: "Payments", hue: "blue" as const }];
const people = [
  { id: "u1", name: "Layla Hassan" },
  { id: "u2", name: "Omar Said" },
];
const base = { projectId: "p", createdAt: "2026-09-20T09:00:00Z", priority: "high" as const, type: "bug" as const, labelIds: [] as string[] };
const issues = [
  { ...base, id: "a", key: "NSQ-1", title: "Refunds fail", statusId: "todo", assigneeId: "u1", reporterId: "u2", labelIds: ["l1"], dueDate: "2026-09-28", votes: 2, comments: 3 },
  { ...base, id: "b", key: "NSQ-2", title: "Receipt layout", statusId: "todo", assigneeId: "u2", reporterId: "u1" },
  { ...base, id: "c", key: "NSQ-3", title: "Saved cards", statusId: "todo" },
  { ...base, id: "d", key: "NSQ-4", title: "Old overdue", statusId: "done", dueDate: "2026-09-01" },
];
const NOW = Date.parse("2026-09-29T09:00:00Z");

afterEach(() => {
  document.body.innerHTML = "";
});

describe("issue-board logic", () => {
  it("filters by key, title, label name, assignee and reporter", () => {
    const name = (id: string) => (id === "l1" ? "Payments" : undefined);
    expect(filterIssues(issues, { ...EMPTY_ISSUE_FILTER, query: "nsq-2" }, name).map((i) => i.id)).toEqual(["b"]);
    expect(filterIssues(issues, { ...EMPTY_ISSUE_FILTER, query: "payments" }, name).map((i) => i.id)).toEqual(["a"]);
    expect(filterIssues(issues, { ...EMPTY_ISSUE_FILTER, assigneeId: "none" }).map((i) => i.id)).toEqual(["c", "d"]);
    expect(filterIssues(issues, { ...EMPTY_ISSUE_FILTER, reporterId: "u1" }).map((i) => i.id)).toEqual(["b"]);
    expect(isIssueFilterActive(EMPTY_ISSUE_FILTER)).toBe(false);
    expect(isIssueFilterActive({ ...EMPTY_ISSUE_FILTER, query: " x " })).toBe(true);
  });
  it("maps a drop among visible cards back to the full column", () => {
    const visible = new Set(["a", "c"]);
    expect(boardIndex(issues, visible, "d", "todo", 0)).toBe(0);
    expect(boardIndex(issues, visible, "d", "todo", 1)).toBe(2);
    expect(boardIndex(issues, visible, "d", "todo", 2)).toBe(3);
    expect(boardIndex(issues, new Set(), "d", "todo", 0)).toBe(3);
  });
});

describe("NqIssueCard", () => {
  it("shows type, key, priority, labels, counts, due state and assignee", () => {
    const w = mount(NqIssueCard, { props: { issue: issues[0]!, labels, people, votes: 2, comments: 3, now: NOW } });
    expect(w.attributes("data-slot")).toBe("issue-card");
    expect(w.find("bdi").text()).toBe("NSQ-1");
    expect(w.text()).toContain("Payments");
    expect(w.text()).toContain("High");
    expect(w.find("[data-due]").attributes("data-due")).toBe("overdue");
    expect(w.find("[data-due]").classes()).toContain("text-nq-danger-text");
    expect(w.text()).toContain("3 comments");
    expect(w.find('[aria-label="Assigned to Layla Hassan"]').exists()).toBe(true);
  });
  it("a finished issue is not overdue; the vote button toggles", async () => {
    const onVote = vi.fn();
    const w = mount(NqIssueCard, { props: { issue: issues[3]!, open: false, now: NOW, votes: 5, voted: true, onVote } });
    expect(w.find("[data-due]").attributes("data-due")).toBe("later");
    const btn = w.find("[data-slot=issue-card-vote]");
    expect(btn.attributes("aria-pressed")).toBe("true");
    expect(btn.attributes("aria-label")).toBe("Remove your vote, 5 votes");
    await btn.trigger("click");
    expect(onVote).toHaveBeenCalledWith(false);
  });
});

describe("NqIssueBoard", () => {
  const mountBoard = (extra: Record<string, unknown> = {}) =>
    mount(NqIssueBoard, { props: { issues, statuses, labels, people, now: NOW, onMove: vi.fn(), ...extra }, attachTo: document.body });

  it("renders header, count, toolbar and a card per issue in its column", () => {
    const w = mountBoard();
    expect(w.attributes("data-slot")).toBe("issue-board");
    expect(w.attributes("aria-label")).toBe("Issue board");
    expect(w.find("h2").text()).toBe("Issues");
    expect(w.text()).toContain("4 issues");
    expect(w.findAll("[data-slot=issue-card]")).toHaveLength(4);
    expect(w.findAll("[data-slot=kanban-column]")).toHaveLength(2);
    expect(w.find("[data-slot=issue-board-assignee]").exists()).toBe(true);
    expect(w.find("[data-slot=issue-board-reporter]").exists()).toBe(true);
    expect(w.find("[data-slot=issue-card-vote]").exists()).toBe(false);
  });

  it("search narrows the cards and Clear filters restores them", async () => {
    const onFilterChange = vi.fn();
    const w = mountBoard({ onFilterChange });
    await w.find("input[type=search]").setValue("refunds");
    expect(w.findAll("[data-slot=issue-card]")).toHaveLength(1);
    expect(w.text()).toContain("1 of 4 issues");
    expect(onFilterChange).toHaveBeenLastCalledWith({ query: "refunds", assigneeId: null, reporterId: null });
    const clear = w.findAll("button").find((b) => b.text() === "Clear filters")!;
    await clear.trigger("click");
    expect(w.findAll("[data-slot=issue-card]")).toHaveLength(4);
    await w.find("input[type=search]").setValue("x");
    await w.find("input[type=search]").trigger("keydown", { key: "Escape" });
    expect((w.find("input[type=search]").element as HTMLInputElement).value).toBe("");
  });

  it("the assignee filter and the hidden reporter filter", async () => {
    const w = mountBoard();
    await w.find("[data-slot=issue-board-assignee]").setValue("none");
    expect(w.findAll("[data-slot=issue-card]")).toHaveLength(2);
    w.unmount();
    const noReporter = mountBoard({ issues: issues.map((i) => ({ ...i, reporterId: undefined })) });
    expect(noReporter.find("[data-slot=issue-board-reporter]").exists()).toBe(false);
  });

  it("New issue, votes and click open fire the callbacks; title null hides the header", async () => {
    const onCreate = vi.fn();
    const onVote = vi.fn();
    const onOpen = vi.fn();
    const w = mountBoard({ onCreate, onVote, onOpen });
    await w.findAll("button").find((b) => b.text() === "New issue")!.trigger("click");
    expect(onCreate).toHaveBeenCalled();
    await w.find("[data-slot=issue-card-vote]").trigger("click");
    expect(onVote).toHaveBeenCalledWith(expect.objectContaining({ id: "a" }), true);
    await w.find("[data-slot=issue-card]").trigger("click");
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: "a" }));
    w.unmount();
    const bare = mountBoard({ title: null });
    expect(bare.find("section[data-slot=issue-board] > header").exists()).toBe(false);
    expect(bare.attributes("aria-label")).toBe("Issue board");
  });

  it("keyboard drop reports the index among all the column's issues, hidden ones included", async () => {
    const onMove = vi.fn();
    const w = mountBoard({ onMove });
    await w.find("input[type=search]").setValue("NSQ-");
    await w.find("[data-slot=issue-board-assignee]").setValue("none");
    // Visible: c (todo), d (done). Lift d, move it into todo above c.
    const li = w.find('[data-card-id="d"]');
    await li.trigger("keydown", { key: " " });
    await li.trigger("keydown", { key: "ArrowLeft" });
    await nextTick();
    await w.find('[data-card-id="d"]').trigger("keydown", { key: " " });
    expect(onMove).toHaveBeenCalledWith("d", "todo", 2);
  });
});
