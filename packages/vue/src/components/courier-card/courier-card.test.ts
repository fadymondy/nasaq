import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NasaqProvider } from "../../provider";
import { NqCourierCard, NqCourierList } from ".";

const omar = { id: "c1", name: "Omar Haddad", nameAr: "عمر حداد", status: "available", vehicle: "motorbike", distanceMeters: 850, etaSeconds: 240, cashFloatMinor: 25000, activeOrders: 2 } as const;
const { id: _id, ...card } = omar;

describe("NqCourierCard", () => {
  it("renders status, vehicle, distance, eta and the cash float in USD", () => {
    const w = mount(NqCourierCard, { props: card });
    expect(w.attributes("data-slot")).toBe("courier-card");
    expect(w.attributes("data-status")).toBe("available");
    expect(w.classes()).toEqual(expect.arrayContaining(["rounded-card", "bg-card"]));
    expect(w.find('[data-slot="courier-dot"]').classes()).toContain("bg-nq-success");
    expect(w.find('[data-slot="courier-status"]').text()).toBe("Available");
    expect(w.text()).toContain("Motorbike");
    expect(w.text()).toContain("850 m away");
    expect(w.text()).toContain("ETA 4 min");
    expect(w.text()).toContain("$250.00");
    expect(w.text()).toContain("2 active orders");
    expect(w.find("button").exists()).toBe(false);
  });

  it("uses Arabic words, the Arabic name and SAR under an Arabic provider", () => {
    const w = mount(
      { components: { NasaqProvider, NqCourierCard }, props: ["c"], template: `<NasaqProvider locale="ar" target="scope"><NqCourierCard v-bind="c" /></NasaqProvider>` },
      { props: { c: card } },
    );
    expect(w.text()).toContain("عمر حداد");
    expect(w.text()).toContain("متاح");
    expect(w.text()).toContain("850 م بعيدًا");
    expect(w.text()).toMatch(/SAR|ر\.س/);
  });

  it("becomes a labelled toggle button when selectable and emits select", async () => {
    const w = mount(NqCourierCard, { props: { ...card, selectable: true, selected: true } });
    const btn = w.find("button");
    expect(btn.attributes("aria-pressed")).toBe("true");
    expect(btn.attributes("aria-label")).toBe("Omar Haddad, Available, selected");
    expect(w.attributes("data-selected")).toBe("");
    expect(w.classes()).toEqual(expect.arrayContaining(["border-primary", "ring-2"]));
    await btn.trigger("click");
    expect(w.emitted("select")).toHaveLength(1);
  });

  it("offline gets the hollow dot, dimmed; compact hides the detail lines; actions sit outside the button", () => {
    const w = mount(NqCourierCard, { props: { ...card, status: "offline", compact: true, selectable: true, class: "gap-4" }, slots: { actions: "<i data-x>Assign</i>" } });
    expect(w.find('[data-slot="courier-dot"]').classes()).toContain("border-nq-line-strong");
    expect(w.classes()).toEqual(expect.arrayContaining(["opacity-80", "gap-4"]));
    expect(w.classes()).not.toContain("gap-2");
    expect(w.text()).not.toContain("Motorbike");
    expect(w.find("button [data-x]").exists()).toBe(false);
    expect(w.find("[data-x]").exists()).toBe(true);
  });
});

describe("NqCourierList", () => {
  it("is a labelled list, marks the selected courier and emits the id", async () => {
    const w = mount(NqCourierList, { props: { couriers: [omar, { ...omar, id: "c2", name: "Sami" }], selectedId: "c2" }, attrs: { onSelectCourier: () => {} } });
    expect(w.attributes("role")).toBe("list");
    expect(w.attributes("aria-label")).toBe("Couriers");
    const cards = w.findAll('[data-slot="courier-card"]');
    expect(cards[1]!.attributes("data-selected")).toBe("");
    expect(cards[0]!.attributes("data-selected")).toBeUndefined();
    await cards[0]!.find("button").trigger("click");
    expect(w.emitted("selectCourier")![0]).toEqual(["c1"]);
    expect(w.emitted("update:selectedId")![0]).toEqual(["c1"]);
  });
});
