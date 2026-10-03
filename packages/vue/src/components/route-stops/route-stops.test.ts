import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { h } from "vue";
import { NqRouteStops } from ".";

const stops = [
  { id: "p1", kind: "pickup", name: "Bakery", status: "done", orderRef: "1042" },
  { id: "p2", kind: "pickup", name: "Grocer", nameAr: "بقال", address: "Main St" },
  { id: "d1", kind: "dropoff", name: "Sara", cashMinor: 10000, note: "Ring twice" },
  { id: "d2", kind: "dropoff", name: "Omar", status: "failed" },
] as const;

describe("NqRouteStops", () => {
  it("lists the stops, marks the first pending one as current and sums the cash", () => {
    const w = mount(NqRouteStops, { props: { stops } });
    expect(w.attributes("data-slot")).toBe("route-stops");
    expect(w.attributes("aria-label")).toBe("Trip stops");
    expect(w.find('[data-slot="route-summary"]').text()).toContain("1 of 4 stops done");
    expect(w.find('[data-slot="route-cash-pending"]').text()).toBe("$100.00");
    const items = w.findAll("li[data-stop]");
    expect(items.map((i) => i.attributes("data-status"))).toEqual(["done", "pending", "pending", "failed"]);
    expect(items[1]!.attributes("data-current")).toBe("");
    expect(items[1]!.attributes("aria-current")).toBe("step");
    expect(items[2]!.attributes("data-current")).toBeUndefined();
    expect(items[1]!.text()).toContain("Next stop");
    expect(items[0]!.text()).toContain("Done");
    expect(items[3]!.text()).toContain("Failed");
    expect(items[2]!.find('[data-slot="stop-cash"]').text()).toContain("$100.00");
    expect(items[0]!.find("span.bg-primary").exists()).toBe(true);
    expect(items[3]!.find("span.border-nq-danger").exists()).toBe(true);
  });

  it("hides the summary, renders actions for the current stop only, and selects a stop", async () => {
    const w = mount(NqRouteStops, {
      props: { stops, hideSummary: true, selectable: true },
      slots: { actions: (p: { stop: { id: string }; current: boolean }) => h("i", { "data-act": "", "data-for": p.stop.id }) },
    });
    expect(w.find('[data-slot="route-summary"]').exists()).toBe(false);
    expect(w.findAll("[data-act]")).toHaveLength(1);
    expect(w.find("[data-act]").attributes("data-for")).toBe("p2");
    await w.findAll("li[data-stop] button")[2]!.trigger("click");
    expect((w.emitted("selectStop")![0] as unknown[])[0]).toMatchObject({ id: "d1" });
  });

  it("uses Arabic names and SAR in Arabic", () => {
    const w = mount(NqRouteStops, { props: { stops, locale: "ar" } });
    expect(w.text()).toContain("بقال");
    expect(w.text()).toContain("المحطة التالية");
    expect(w.find('[data-slot="route-cash-pending"]').text()).toMatch(/SAR|ر\.س/);
  });
});
