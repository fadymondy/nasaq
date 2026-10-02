import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import type { QueueEntry } from "../waiting-screen";
import { NqClinicQueue } from ".";

const NOW = 1_800_000_000_000;
const base = { checkedInAt: NOW - 3_600_000 };
const queue = (): QueueEntry[] => [
  { ...base, id: "a", ticket: "A-001", number: 1, name: "Layla", status: "serving", room: "2", queuedAt: NOW - 3_000_000, calledAt: NOW - 900_000 },
  { ...base, id: "b", ticket: "A-002", number: 2, name: "Omar", status: "called", room: "2", queuedAt: NOW - 2_000_000, calledAt: NOW - 420_000, recalls: 1 },
  { ...base, id: "c", ticket: "A-003", number: 3, name: "Sara", status: "waiting", priority: "urgent", queuedAt: NOW - 600_000 },
  { ...base, id: "d", ticket: "A-004", number: 4, name: "Hadi", status: "waiting", queuedAt: NOW - 500_000 },
];

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

const mountIt = (props: Record<string, unknown> = {}, onAction: unknown = vi.fn(async () => {})) =>
  mount(NqClinicQueue, { props: { entries: queue(), onAction: onAction as never, now: NOW, ...props }, attachTo: document.body });

describe("NqClinicQueue", () => {
  it("shows who is next, the active cards and the table in call order", () => {
    const w = mountIt();
    expect(w.attributes("data-slot")).toBe("clinic-queue");
    expect(w.text()).toContain("Next in line: A-003");
    const cards = w.findAll('[data-slot="clinic-queue-active"]');
    expect(cards.map((c) => c.attributes("data-status"))).toEqual(["serving", "called"]);
    expect(cards[1]!.text()).toContain("Called 2 times");
    const tickets = w.findAll("tbody tr[data-row]").map((r) => r.findAll("td")[0]!.text());
    expect(tickets).toEqual(["A-001", "A-002", "A-003", "A-004"]);
  });

  it("warns about a call nobody answered", () => {
    const w = mountIt({ graceMinutes: 5 });
    expect(w.text()).toContain("A-002 has not answered for 7 min. Call again or skip.");
    expect(w.find('[data-slot="alert"]').attributes("role")).toBe("alert");
  });

  it("Call next sends the action without an id and blocks while it runs", async () => {
    let finish!: () => void;
    const onAction = vi.fn(() => new Promise<void>((r) => (finish = r)));
    const w = mountIt({}, onAction);
    const callNext = w.findAll("button").find((b) => b.text().includes("Call next"))!;
    await callNext.trigger("click");
    expect(onAction).toHaveBeenCalledWith("call-next", undefined);
    await nextTick();
    expect(callNext.attributes("disabled")).toBeDefined();
    finish();
    await nextTick();
  });

  it("card buttons run the move for that ticket and an error shows a danger alert", async () => {
    const onAction = vi.fn(async () => ({ error: "Room is busy" }));
    const w = mountIt({}, onAction);
    const start = w.findAll('[data-slot="clinic-queue-active"] button').find((b) => b.text() === "Start visit")!;
    await start.trigger("click");
    await nextTick();
    expect(onAction).toHaveBeenCalledWith("start", "b");
    expect(w.text()).toContain("Room is busy");
  });

  it("a thrown action shows the failure message", async () => {
    const onAction = vi.fn(async () => {
      throw new Error("x");
    });
    const w = mountIt({}, onAction);
    await w.findAll('[data-slot="clinic-queue-active"] button').find((b) => b.text() === "Finish visit")!.trigger("click");
    await nextTick();
    await nextTick();
    expect(w.text()).toContain("That did not work. Try again.");
  });

  it("has a row menu on every row", () => {
    const w = mountIt();
    expect(w.findAll('[data-slot="data-table-row-actions"]')).toHaveLength(4);
  });

  it("speaks Arabic with the provider", () => {
    document.documentElement.lang = "ar";
    const ar = mountIt();
    expect(ar.text()).toContain("طابور المرضى");
    expect(ar.text()).toContain("نداء التالي");
  });
});
