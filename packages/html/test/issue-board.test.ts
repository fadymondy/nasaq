// The Blade issue-board example (packages/php/examples/rendered/issue-board.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";
import { boardIndex, EMPTY_FILTER, filterIssues, isFilterActive } from "../src/alpine/issue-board-logic";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = () => new Promise((r) => setTimeout(r, 40));

beforeAll(() => {
  Alpine.plugin(nasaq);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).Alpine = Alpine;
  Alpine.start();
});

afterEach(() => {
  for (const el of [...document.body.children]) {
    Alpine.destroyTree(el as HTMLElement);
    el.remove();
  }
});

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("issue-board");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
}

const cards = () => [...document.querySelectorAll<HTMLElement>('[data-slot="issue-card"]')];
const keys = () => cards().map((c) => c.querySelector("bdi")!.textContent);
const root = () => document.querySelector<HTMLElement>('[data-slot="issue-board"]')!;
const type = async (el: HTMLInputElement, value: string) => {
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  await tick();
};
const choose = async (el: HTMLSelectElement, value: string) => {
  el.value = value;
  el.dispatchEvent(new Event("change", { bubbles: true }));
  await tick();
};

describe("issue-board logic", () => {
  const issues = [
    { id: "a", key: "NSQ-1", title: "Refunds fail", statusId: "todo", labelNames: ["Payments"], assigneeId: "u1", reporterId: "u2" },
    { id: "b", key: "NSQ-2", title: "Receipt", statusId: "todo", assigneeId: "u2", reporterId: "u1" },
    { id: "c", key: "NSQ-3", title: "Cards", statusId: "todo" },
  ];
  it("filters and maps a drop among visible cards", () => {
    expect(filterIssues(issues, { ...EMPTY_FILTER, query: "payments" }).map((i) => i.id)).toEqual(["a"]);
    expect(filterIssues(issues, { ...EMPTY_FILTER, assigneeId: "none" }).map((i) => i.id)).toEqual(["c"]);
    expect(isFilterActive(EMPTY_FILTER)).toBe(false);
    expect(boardIndex(issues, new Set(["a", "c"]), "x", "todo", 1)).toBe(2);
    expect(boardIndex(issues, new Set(), "x", "todo", 0)).toBe(3);
  });
});

describe("issue-board (Blade example)", () => {
  it("renders header, count, toolbar, columns and a card per issue", async () => {
    await mount();
    expect(root().getAttribute("aria-label")).toBe("Issues");
    expect(root().querySelector("h2")!.textContent).toBe("Issues");
    expect(root().querySelector("header span")!.textContent).toBe("3 issues");
    expect(document.querySelectorAll('[data-slot="kanban-column"]')).toHaveLength(3);
    expect(keys().sort()).toEqual(["NSQ-1", "NSQ-2", "NSQ-3"]);
    expect(document.querySelector('[data-slot="issue-board-assignee"]')).not.toBeNull();
    expect(document.querySelector('[data-slot="issue-board-reporter"]')).not.toBeNull();
  });

  it("cards show votes, counts, the due state and the assignee", async () => {
    await mount();
    const first = cards().find((c) => c.textContent!.includes("NSQ-1"))!;
    expect(first.querySelector('[data-slot="issue-card-vote"]')!.getAttribute("aria-label")).toBe("Upvote, 12 votes");
    expect(first.textContent).toContain("Payments");
    expect(first.querySelector("[data-due]")!.getAttribute("data-due")).toBe("overdue");
    expect(first.querySelector("[data-due]")!.className).toContain("text-nq-danger-text");
    expect(first.querySelector('[aria-label="Assigned to Layla Hassan"]')).not.toBeNull();
    const voted = cards().find((c) => c.textContent!.includes("NSQ-3"))!;
    expect(voted.querySelector('[data-slot="issue-card-vote"]')!.getAttribute("aria-pressed")).toBe("true");
  });

  it("the vote button toggles and fires nq-vote; a card click fires nq-open", async () => {
    await mount();
    const events: [string, unknown][] = [];
    for (const n of ["nq-vote", "nq-open"]) root().addEventListener(n, (e) => events.push([n, (e as CustomEvent).detail]));
    const card = cards().find((c) => c.textContent!.includes("NSQ-2"))!;
    card.querySelector<HTMLElement>('[data-slot="issue-card-vote"]')!.click();
    await tick();
    expect(events).toEqual([["nq-vote", { id: "i2", voted: true }]]);
    const again = cards().find((c) => c.textContent!.includes("NSQ-2"))!;
    expect(again.querySelector('[data-slot="issue-card-vote"]')!.getAttribute("aria-label")).toBe("Remove your vote, 4 votes");
    again.click();
    expect(events[1]).toEqual(["nq-open", { id: "i2" }]);
  });

  it("search narrows the cards and Clear filters restores them", async () => {
    await mount();
    const input = root().querySelector<HTMLInputElement>("input[type=search]")!;
    await type(input, "refunds");
    expect(keys()).toEqual(["NSQ-1"]);
    expect(root().querySelector("header span")!.textContent).toBe("1 of 3 issues");
    const clear = [...root().querySelectorAll("button")].find((b) => b.textContent!.trim() === "Clear filters")!;
    clear.click();
    await tick();
    expect(cards()).toHaveLength(3);
    expect(input.value).toBe("");
    await type(input, "x");
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    await tick();
    expect(input.value).toBe("");
  });

  it("the assignee filter fires nq-filter-change", async () => {
    await mount();
    const seen: unknown[] = [];
    root().addEventListener("nq-filter-change", (e) => seen.push((e as CustomEvent).detail));
    await choose(root().querySelector<HTMLSelectElement>('[data-slot="issue-board-assignee"] select, select[data-slot="issue-board-assignee"]')!, "none");
    expect(keys()).toEqual(["NSQ-3"]);
    expect(seen.at(-1)).toEqual({ query: "", assigneeId: "none", reporterId: null });
  });

  it("a keyboard drop reports the index among all the column's issues, hidden ones included", async () => {
    await mount();
    const moves: unknown[] = [];
    root().addEventListener("move", (e) => moves.push((e as CustomEvent).detail));
    await choose(root().querySelector<HTMLSelectElement>('[data-slot="issue-board-assignee"] select, select[data-slot="issue-board-assignee"]')!, "none");
    // Only NSQ-3 (done) is visible. Lift it and move it into "In progress", where NSQ-1 is hidden.
    const li = () => document.querySelector<HTMLElement>('[data-card-id="i3"]')!;
    li().dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true }));
    await tick();
    li().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true, cancelable: true }));
    await tick();
    li().dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true }));
    await tick();
    expect(moves).toEqual([{ cardId: "i3", toColumn: "doing", toIndex: 1 }]);
  });
});
