import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NqClientPortal, portalBudget, portalProgress, portalVisibleInvoices } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const base = {
  project: { name: "New platform", client: "Tamkeen Co.", due: "2026-12-01" },
  tasks: [
    { id: "t1", title: "Calendar", status: "done" as const, assignee: "Huda Salem" },
    { id: "t2", title: "Payments", status: "doing" as const },
  ],
  requests: [{ id: "r1", title: "Add a logo", status: "pending" as const, createdAt: "2026-09-20T09:00:00Z" }],
  weeks: [
    { week: "2026-09-07", hours: 20 },
    { week: "2026-09-14", hours: 25 },
  ],
  budgetHours: 50,
  invoices: [
    { id: "i1", number: "INV-1", status: "open" as const, issueDate: "2026-09-25", amount: 100 },
    { id: "i2", number: "INV-2", status: "draft" as const, issueDate: "2026-09-26", amount: 900 },
  ],
  currency: "USD",
  activity: [{ id: "a1", title: "Calendar finished", at: "2026-09-26T10:00:00Z" }],
};
const mk = (extra: Record<string, unknown> = {}) => mount(NqClientPortal, { props: { ...base, ...extra }, attachTo: document.body });

describe("portal logic", () => {
  it("counts progress, warns on the budget and hides drafts", () => {
    expect(portalProgress(base.tasks).percent).toBe(50);
    expect(portalProgress([]).percent).toBe(0);
    expect(portalBudget(50, 45).tone).toBe("warning");
    expect(portalBudget(50, 60).over).toBe(true);
    expect(portalVisibleInvoices(base.invoices)).toHaveLength(1);
  });
});

describe("NqClientPortal", () => {
  it("renders the header, the ring and the hour tiles", () => {
    const w = mk();
    expect(w.find('[data-slot="client-portal"]').exists()).toBe(true);
    expect(w.find("h1").text()).toBe("New platform");
    expect(w.find('[data-slot="portal-ring"] svg').attributes("aria-label")).toBe("50% done");
    expect(w.text()).toContain("1 of 2 tasks done");
    expect(w.text()).toContain("45");
    w.unmount();
  });

  it("speaks Arabic", () => {
    const w = mk({ locale: "ar" });
    expect(w.text()).toContain("نظرة عامة");
    w.unmount();
  });

  it("emits the tab change", async () => {
    const onTabChange = vi.fn();
    const w = mk({ onTabChange });
    await w.findAll('[role="tab"]').find((b) => b.text() === "Board")!.trigger("mousedown");
    await w.findAll('[role="tab"]').find((b) => b.text() === "Board")!.trigger("click");
    await flushPromises();
    expect(onTabChange).toHaveBeenCalledWith("board");
    w.unmount();
  });

  it("validates and sends a request", async () => {
    const onRequest = vi.fn(async () => {});
    const w = mk({ onRequest, defaultTab: "requests" });
    await w.find("form").trigger("submit");
    expect(w.text()).toContain("Tell us what you need.");
    await w.find("form input").setValue("A new report");
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(onRequest).toHaveBeenCalledWith({ title: "A new report", description: "" });
    expect(w.text()).toContain("Sent. We will reply here.");
    w.unmount();
  });

  it("never lists a draft invoice", () => {
    const w = mk({ defaultTab: "invoices" });
    expect(w.text()).toContain("INV-1");
    expect(w.text()).not.toContain("INV-2");
    w.unmount();
  });
});
