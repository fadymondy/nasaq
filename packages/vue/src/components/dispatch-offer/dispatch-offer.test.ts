import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NasaqProvider } from "../../provider";
import { NqDispatchOffer } from ".";

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

const base = { pickup: { name: "Al-Quds Bakery", nameAr: "مخبز القدس", address: "12 Main St" }, dropoff: { name: "Sara Odeh", nameAr: "سارة عودة" }, feeMinor: 1500 };

describe("NqDispatchOffer", () => {
  it("renders the route, the fee in USD and the actions", () => {
    const w = mount(NqDispatchOffer, { props: { ...base, cashToCollectMinor: 8500, distanceMeters: 2400, etaSeconds: 300, orderCount: 2 } });
    expect(w.attributes("data-slot")).toBe("dispatch-offer");
    expect(w.attributes("data-mode")).toBe("courier");
    expect(w.attributes("aria-label")).toBe("New delivery offer");
    expect(w.classes()).toEqual(expect.arrayContaining(["rounded-card", "bg-card", "shadow-md"]));
    expect(w.find('[data-stop="pickup"]').text()).toContain("Al-Quds Bakery");
    expect(w.find('[data-stop="pickup"]').text()).toContain("12 Main St");
    expect(w.find('[data-stop="dropoff"]').text()).toContain("Sara Odeh");
    expect(w.find('[data-slot="offer-fee"]').text()).toBe("$15.00");
    expect(w.find('[data-slot="offer-cash"]').text()).toContain("$85.00");
    expect(w.text()).toContain("2 orders");
    expect(w.text()).toContain("2.4 km");
    expect(w.text()).toContain("5 min");
    expect(w.find('[data-slot="timer-ring"]').exists()).toBe(false);
  });

  it("counts down, announces only at the ends and expires once", async () => {
    vi.useFakeTimers();
    let clock = 1_000_000;
    const w = mount(NqDispatchOffer, { props: { ...base, expiresAt: clock + 30_000, now: () => clock } });
    expect(w.find('[data-slot="timer-ring"]').attributes("data-tone")).toBe("primary");
    expect(w.find('[role="status"]').text()).toBe("30 seconds left to answer");
    clock += 15_000;
    await vi.advanceTimersByTimeAsync(250);
    expect(w.find('[role="status"]').text()).toBe("");
    clock += 10_000;
    await vi.advanceTimersByTimeAsync(250);
    expect(w.find('[data-slot="timer-ring"]').attributes("data-tone")).toBe("warning");
    expect(w.find('[role="status"]').text()).toBe("5 seconds left to answer");
    clock += 6_000;
    await vi.advanceTimersByTimeAsync(250);
    await vi.advanceTimersByTimeAsync(1000);
    expect(w.emitted("expire")).toHaveLength(1);
    expect(w.attributes("data-expired")).toBeDefined();
    expect(w.find("h2").text()).toBe("Offer expired");
    expect(w.findAll("button")[1]!.attributes("disabled")).toBeDefined();
    expect(w.classes()).toContain("opacity-80");
  });

  it("emits accept and decline", async () => {
    const w = mount(NqDispatchOffer, { props: base });
    const [decline, accept] = w.findAll("button");
    await accept!.trigger("click");
    await decline!.trigger("click");
    expect(w.emitted("accept")).toHaveLength(1);
    expect(w.emitted("decline")).toHaveLength(1);
  });

  it("dispatcher mode has no countdown, Offer to driver and Cancel", async () => {
    const w = mount(NqDispatchOffer, { props: { ...base, mode: "dispatcher", expiresAt: Date.now() + 1000 } });
    expect(w.attributes("data-mode")).toBe("dispatcher");
    expect(w.find('[data-slot="timer-ring"]').exists()).toBe(false);
    expect(w.find("h2").text()).toBe("Offer to a driver");
    expect(w.text()).toContain("Driver earns");
    const [cancel, offer] = w.findAll("button");
    expect(cancel!.text()).toBe("Cancel");
    await offer!.trigger("click");
    await cancel!.trigger("click");
    expect(w.emitted("offer")).toHaveLength(1);
    expect(w.emitted("decline")).toHaveLength(1);
  });

  it("uses Arabic, the Arabic names and SAR under an Arabic provider", () => {
    const w = mount(
      { components: { NasaqProvider, NqDispatchOffer }, props: ["c"], template: `<NasaqProvider locale="ar" target="scope"><NqDispatchOffer v-bind="c" /></NasaqProvider>` },
      { props: { c: base } },
    );
    expect(w.text()).toContain("عرض توصيل جديد");
    expect(w.text()).toContain("مخبز القدس");
    expect(w.text()).toContain("سارة عودة");
    expect(w.text()).toMatch(/SAR|ر\.س/);
    expect(w.text()).toContain("قبول");
  });

  it("merges user classes last", () => {
    const w = mount(NqDispatchOffer, { props: base, attrs: { class: "p-8" } });
    expect(w.classes()).toContain("p-8");
    expect(w.classes()).not.toContain("p-4");
  });
});
