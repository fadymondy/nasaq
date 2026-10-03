import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NasaqProvider } from "../../provider";
import { h } from "vue";
import { NqBookingFlow } from ".";

const now = new Date(2030, 0, 10, 8, 0);
const slot = (hour: number) => {
  const start = new Date(2030, 0, 10, hour, 0);
  return { start, end: new Date(start.getTime() + 1800000), state: "available" as const, remaining: 1 };
};
const services = [
  { id: "s1", name: "Dental check-up", durationMinutes: 30, price: 60, category: "Dental" },
  { id: "s2", name: "Skin consultation", durationMinutes: 45, price: 90 },
];
const providers = [
  { id: "p1", name: "Dr. Omar", specialty: "Dentist", rating: 4.9, reviews: 12, serviceIds: ["s1"] },
  { id: "p2", name: "Dr. Huda", specialty: "Dermatologist", serviceIds: ["s2"] },
];
const locations = [
  { id: "l1", name: "Riyadh clinic" },
  { id: "l2", name: "Jeddah clinic" },
];

function mk(extra: Record<string, unknown> = {}) {
  const onSubmit = vi.fn(async () => ({ code: "NQ-1" }));
  const w = mount(NqBookingFlow, { props: { services, providers, getSlots: async () => [slot(9), slot(10)], onSubmit, now, ...extra }, attachTo: document.body });
  return { w, onSubmit };
}
const stepOf = (w: ReturnType<typeof mount>) => w.find('[data-slot="booking-flow"]').attributes("data-step");
const button = (w: ReturnType<typeof mount>, text: string) => {
  const b = w.findAll("button").find((x) => x.text().trim() === text);
  if (!b) throw new Error(`no button "${text}"`);
  return b;
};
async function pickCard(w: ReturnType<typeof mount>, text: string) {
  const c = w.findAll('[data-slot="radio-card"]').find((x) => x.text().includes(text));
  if (!c) throw new Error(`no card "${text}"`);
  await c.trigger("click");
  await flushPromises();
}

describe("NqBookingFlow", () => {
  it("starts on the service step when there is one branch, with the next button disabled", () => {
    const { w } = mk();
    expect(stepOf(w)).toBe("service");
    expect(w.find("h2").text()).toContain("What do you need?");
    expect(button(w, "Continue").attributes("disabled")).toBeDefined();
    expect(button(w, "Back").attributes("disabled")).toBeDefined();
    expect(w.text()).toContain("Nothing chosen yet.");
    w.unmount();
  });

  it("starts on the branch step when there are several", async () => {
    const { w } = mk({ locations });
    expect(stepOf(w)).toBe("location");
    await pickCard(w, "Jeddah clinic");
    await button(w, "Continue").trigger("click");
    expect(stepOf(w)).toBe("service");
    w.unmount();
  });

  it("filters doctors by the chosen service and walks to the confirmation", async () => {
    const { w, onSubmit } = mk();
    await pickCard(w, "Dental check-up");
    expect(w.find("aside").text()).toContain("$60");
    await button(w, "Continue").trigger("click");
    expect(stepOf(w)).toBe("provider");
    expect(w.text()).toContain("Dr. Omar");
    expect(w.text()).not.toContain("Dr. Huda");
    await pickCard(w, "Dr. Omar");
    await button(w, "Continue").trigger("click");
    await flushPromises();
    expect(stepOf(w)).toBe("time");
    const tiles = w.findAll('[data-slot="booking-slot"]');
    expect(tiles.length).toBeGreaterThan(0);
    await tiles[0]!.trigger("click");
    await button(w, "Continue").trigger("click");
    expect(stepOf(w)).toBe("details");

    // Invalid details keep the step and show the errors.
    await button(w, "Continue").trigger("click");
    expect(stepOf(w)).toBe("details");
    expect(w.findAll('[data-slot="field-error"]').length).toBeGreaterThan(0);
    const inputs = w.findAll("input");
    await inputs[0]!.setValue("Huda Salem");
    await inputs[1]!.setValue("+966 50 123 4567");
    await button(w, "Continue").trigger("click");
    expect(stepOf(w)).toBe("notes");
    await button(w, "Continue").trigger("click");
    expect(stepOf(w)).toBe("payment");
    expect(w.text()).toContain("$60");
    await button(w, "Continue").trigger("click");
    expect(stepOf(w)).toBe("review");
    expect(w.text()).toContain("Huda Salem");
    expect(w.text()).toContain("Pay at the visit");

    await button(w, "Confirm booking").trigger("click");
    await flushPromises();
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const arg = (onSubmit.mock.calls[0] as unknown as [{ serviceId: string; providerId: string; payment: string; total: number }])[0];
    expect(arg).toMatchObject({ serviceId: "s1", providerId: "p1", payment: "visit", total: 60 });
    expect(w.find('[data-slot="booking-flow"]').attributes("data-state")).toBe("confirmed");
    expect(w.text()).toContain("Your booking is confirmed");
    expect(w.text()).toContain("NQ-1");
    expect(w.find('[data-slot="booking-ticket"]').exists()).toBe(true);

    await button(w, "Book another visit").trigger("click");
    expect(stepOf(w)).toBe("service");
    w.unmount();
  });

  it("stays on review and shows the error the server returns", async () => {
    const onSubmit = vi.fn(async () => ({ error: "That time was just taken." }));
    const { w } = mk({ onSubmit, signedIn: { name: "Huda", phone: "+966 50 123 4567" } });
    await pickCard(w, "Dental check-up");
    await button(w, "Continue").trigger("click");
    await pickCard(w, "Dr. Omar");
    await button(w, "Continue").trigger("click");
    await flushPromises();
    await w.findAll('[data-slot="booking-slot"]')[0]!.trigger("click");
    await button(w, "Continue").trigger("click");
    expect(w.text()).toContain("Booking as Huda");
    for (let i = 0; i < 3; i++) await button(w, "Continue").trigger("click");
    expect(stepOf(w)).toBe("review");
    await button(w, "Confirm booking").trigger("click");
    await flushPromises();
    expect(stepOf(w)).toBe("review");
    expect(w.text()).toContain("That time was just taken.");
    w.unmount();
  });

  it("shows a retry when the times fail to load", async () => {
    const getSlots = vi.fn().mockRejectedValueOnce(new Error("x")).mockResolvedValue([slot(9)]);
    const { w } = mk({ getSlots });
    await pickCard(w, "Dental check-up");
    await button(w, "Continue").trigger("click");
    await pickCard(w, "Dr. Omar");
    await button(w, "Continue").trigger("click");
    await flushPromises();
    expect(w.text()).toContain("We could not load the times.");
    await button(w, "Try again").trigger("click");
    await flushPromises();
    expect(getSlots).toHaveBeenCalledTimes(2);
    expect(w.findAll('[data-slot="booking-slot"]').length).toBe(1);
    w.unmount();
  });

  it("renders Arabic strings and SAR in an Arabic locale, and merges class and data-slot", () => {
    const w = mount(
      { render: () => h(NasaqProvider, { locale: "ar" }, () => h(NqBookingFlow, { services, providers, getSlots: async () => [], onSubmit: async () => {}, now, class: "mine", "data-slot": "custom" })) },
      { attachTo: document.body },
    );
    const root = w.find("[data-step]");
    expect(root.classes()).toContain("mine");
    expect(root.attributes("data-slot")).toBe("custom");
    expect(w.text()).toContain("ما الذي تحتاجه؟");
    w.unmount();
  });
});
