import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NasaqProvider } from "../../provider";
import { NqStoreOrderTimeline, trackingModel } from ".";

const events = [
  { at: "2026-09-20T10:00:00Z", kind: "placed", label: "Order placed" },
  { at: "2026-09-20T10:05:00Z", kind: "paid", label: "Payment confirmed" },
  { at: "2026-09-21T09:00:00Z", kind: "note", label: "Note added", note: "Gift wrap please" },
];

describe("NqStoreOrderTimeline tracking", () => {
  it("draws five steps with state, aria-current and times", () => {
    const w = mount(NqStoreOrderTimeline, {
      props: { status: "shipped", payment: "paid", placedAt: "2026-09-20T10:00:00Z", events, tracking: { carrier: "Aramex", number: "AB 123" }, trackingTemplate: "https://t.example/?n={number}", class: "gap-6" },
    });
    expect(w.attributes("data-slot")).toBe("store-order-timeline");
    expect(w.attributes("data-variant")).toBe("tracking");
    expect(w.attributes("aria-label")).toBe("Order progress");
    expect(w.classes()).toEqual(expect.arrayContaining(["flex", "gap-6"]));
    expect(w.classes()).not.toContain("gap-4");
    const steps = w.findAll("li");
    expect(steps.map((s) => s.attributes("data-state"))).toEqual(["done", "done", "current", "upcoming", "upcoming"]);
    expect(steps[1]!.text()).toContain("Payment confirmed");
    expect(steps[3]!.text()).toContain("Next");
    expect(steps[2]!.attributes("aria-current")).toBe("step");
    expect(steps[0]!.find("time").exists()).toBe(true);
    expect(w.find("ol").attributes("data-percent")).toBe("50");
    const link = w.find("a");
    expect(link.attributes("href")).toBe("https://t.example/?n=AB%20123");
    expect(link.attributes("rel")).toBe("noreferrer");
    expect(w.text()).toContain("Carrier: Aramex");
  });

  it("marks a cancelled order: banner, skipped steps", () => {
    const w = mount(NqStoreOrderTimeline, { props: { status: "cancelled", placedAt: "2026-09-20T10:00:00Z" } });
    expect(w.text()).toContain("Order cancelled");
    const states = w.findAll("li").map((s) => s.attributes("data-state"));
    expect(states).toEqual(["done", "skipped", "skipped", "skipped", "skipped"]);
    expect(w.findAll("li")[1]!.classes()).toContain("border-dashed");
  });

  it("cash on delivery relabels the paid step and adds a note; partial shows a badge", () => {
    const w = mount(NqStoreOrderTimeline, { props: { status: "partially-fulfilled", payment: "cod" } });
    expect(w.text()).toContain("Order confirmed");
    expect(w.text()).toContain("Pay the courier when it arrives");
    expect(w.text()).toContain("Part of this order has shipped");
  });

  it("speaks Arabic under an Arabic provider", () => {
    const w = mount({
      components: { NasaqProvider, NqStoreOrderTimeline },
      template: `<NasaqProvider locale="ar" target="scope"><NqStoreOrderTimeline status="paid" /></NasaqProvider>`,
    });
    expect(w.find("section").attributes("aria-label")).toBe("تقدّم الطلب");
    expect(w.text()).toContain("تأكيد الدفع");
  });

  it("exports the pure model", () => {
    expect(trackingModel({ status: "delivered" }).percent).toBe(100);
  });
});

describe("NqStoreOrderTimeline activity", () => {
  it("lists events newest first with the internal badge on notes", () => {
    const w = mount(NqStoreOrderTimeline, { props: { variant: "activity", status: "paid", events } });
    expect(w.attributes("data-variant")).toBe("activity");
    expect(w.attributes("aria-label")).toBe("Activity");
    const items = w.findAll('[data-slot="timeline-item"]');
    expect(items).toHaveLength(3);
    expect(items[0]!.text()).toContain("Note added");
    expect(items[0]!.text()).toContain("Internal");
    expect(items[0]!.text()).toContain("Gift wrap please");
    expect(items[2]!.text()).toContain("Order placed");
    expect(w.find("form").exists()).toBe(false);
  });

  it("shows the empty text, and the composer only with an add-note listener", async () => {
    const empty = mount(NqStoreOrderTimeline, { props: { variant: "activity", status: "pending" } });
    expect(empty.text()).toContain("Nothing has happened to this order yet.");

    const notes: string[] = [];
    const w = mount(NqStoreOrderTimeline, { props: { variant: "activity", status: "pending" }, attrs: { onAddNote: (n: string) => notes.push(n) } });
    const submit = w.find("button[type=submit]");
    expect(submit.attributes("disabled")).toBeDefined();
    const area = w.find("textarea");
    expect(area.attributes("aria-label")).toBe("Add a note");
    await area.setValue("  call the customer ");
    expect(w.find("button[type=submit]").attributes("disabled")).toBeUndefined();
    await w.find("form").trigger("submit");
    expect(notes).toEqual(["call the customer"]);
    expect((w.find("textarea").element as HTMLTextAreaElement).value).toBe("");
  });
});
