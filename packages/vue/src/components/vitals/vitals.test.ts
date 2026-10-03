import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NqVitals, bmiCategory, computeBmi, distanceToTarget } from ".";

const vitals = {
  weightKg: 84.2,
  heightCm: 178,
  bodyWaterPercent: 54.1,
  visceralFat: 11,
  hasBaseline: true,
  targets: { weight: { current: 84.2, target: 80, percent: 62, onTarget: false }, visceralFat: { current: 9, target: 9, percent: 100, onTarget: true } },
};

describe("NqVitals", () => {
  it("renders readings, a computed BMI with its category, and Not measured for gaps", () => {
    const w = mount(NqVitals, { props: { vitals, class: "extra" } });
    expect(w.attributes("data-slot")).toBe("vitals");
    expect(w.classes()).toContain("extra");
    expect(w.text()).toContain("84.2");
    expect(w.text()).toContain("26.6");
    expect(w.text()).toContain("Overweight");
    expect(w.text()).toContain("rough screening figure");
    expect(w.text()).toContain("Not measured");
  });

  it("draws one meter per target with state and the distance to go", () => {
    const w = mount(NqVitals, { props: { vitals } });
    const items = w.findAll('[data-slot="vitals-target"]');
    expect(items).toHaveLength(2);
    expect(items[0]!.attributes("data-on-target")).toBeUndefined();
    expect(items[0]!.text()).toContain("In progress");
    expect(items[0]!.text()).toContain("To go");
    expect(items[0]!.find('[data-slot="meter"]').attributes("aria-valuenow")).toBe("62");
    expect(items[1]!.attributes("data-on-target")).toBe("true");
    expect(items[1]!.text()).toContain("On target");
  });

  it("hides targets without a baseline, and shows empty and loading states", () => {
    expect(mount(NqVitals, { props: { vitals: { ...vitals, hasBaseline: false } } }).text()).toContain("Targets appear once");
    expect(mount(NqVitals, { props: { vitals: {} } }).text()).toContain("No measurements yet.");
    const l = mount(NqVitals, { props: { loading: true } });
    expect(l.attributes("aria-busy")).toBe("true");
  });

  it("can hide the heading", () => {
    const w = mount(NqVitals, { props: { vitals, hideHeading: true } });
    expect(w.find("h2").exists()).toBe(false);
    expect(w.attributes("aria-label")).toBe("Vitals");
  });

  it("computes BMI and its category", () => {
    expect(computeBmi(84.2, 178)).toBe(26.6);
    expect(computeBmi(undefined, 178)).toBeNull();
    expect(bmiCategory(17)).toBe("underweight");
    expect(bmiCategory(30)).toBe("obese");
    expect(distanceToTarget({ current: 84.2, target: 80, onTarget: false })).toBe(-4.2);
  });
});
