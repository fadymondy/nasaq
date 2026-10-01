import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqApprovalQueue, type ApprovalItem } from ".";

const NOW = Date.parse("2026-01-01T12:00:00Z");
const items: ApprovalItem[] = [
  { id: "a", kind: "action", status: "pending", title: "Send digest", createdAt: NOW - 1000, args: { key: "secret" }, redact: ["key"] },
  { id: "b", kind: "review", status: "pending", title: "Review copy", createdAt: NOW - 2000, criteria: [{ id: "c1", label: "Tone", met: false }] },
  { id: "c", kind: "request", status: "approved", title: "Old one", createdAt: NOW - 5000, decidedBy: "Sam" },
];
const settle = () => new Promise((r) => setTimeout(r, 250));

describe("NqApprovalQueue", () => {
  it("shows pending items first tab, redacts secrets and blocks approve on unmet criteria", () => {
    const w = mount(NqApprovalQueue, { props: { items, now: NOW, onApprove: vi.fn(), onReject: vi.fn() } });
    const rows = w.findAll('[data-slot="approval-item"]');
    expect(rows).toHaveLength(2);
    expect(w.text()).not.toContain("secret");
    const approveB = w.findAll("button").find((b) => b.attributes("aria-label")?.includes("Review copy") && b.text().includes("Approve"))!;
    expect(approveB.attributes("disabled")).toBeDefined();
  });

  it("approves through the callback", async () => {
    const onApprove = vi.fn(async () => {});
    const w = mount(NqApprovalQueue, { props: { items, now: NOW, onApprove, onReject: vi.fn() } });
    const btn = w.findAll("button").find((b) => b.attributes("aria-label")?.includes("Send digest") && b.text().includes("Approve"))!;
    await btn.trigger("click");
    await flushPromises();
    expect(onApprove).toHaveBeenCalledWith("a");
  });

  it("shows an error from the callback", async () => {
    const onApprove = vi.fn(async () => ({ error: "Nope" }));
    const w = mount(NqApprovalQueue, { props: { items, now: NOW, onApprove, onReject: vi.fn() } });
    const btn = w.findAll("button").find((b) => b.attributes("aria-label")?.includes("Send digest") && b.text().includes("Approve"))!;
    await btn.trigger("click");
    await flushPromises();
    await settle();
    expect(w.text()).toContain("Nope");
  });
});
