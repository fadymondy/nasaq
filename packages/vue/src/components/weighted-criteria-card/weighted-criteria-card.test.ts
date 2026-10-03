import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { NqWeightedCriteriaCard, addCriterion, criteriaShares, type WeightedCriterion } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const criteria: WeightedCriterion[] = [
  { id: "price", label: "Price", weight: "high", enabled: true },
  { id: "support", label: "Support", description: "Arabic support", weight: "medium", enabled: true },
  { id: "speed", label: "Speed", weight: "low", enabled: false },
];

describe("helpers", () => {
  it("shares sum to 1 and ignore disabled", () => {
    const s = criteriaShares(criteria);
    expect(s.get("price")).toBeCloseTo(0.6);
    expect(s.get("speed")).toBe(0);
  });
  it("addCriterion ignores blanks and duplicates", () => {
    expect(addCriterion(criteria, "  ", "x")).toHaveLength(3);
    expect(addCriterion(criteria, "price", "x")).toHaveLength(3);
    expect(addCriterion(criteria, "Quality", "x").at(-1)).toMatchObject({ id: "x", custom: true, weight: "medium" });
  });
});

describe("NqWeightedCriteriaCard", () => {
  it("renders the rows, count and share bars", () => {
    const w = mount(NqWeightedCriteriaCard, { props: { defaultCriteria: criteria, description: "Rank" } });
    expect(w.attributes("data-slot")).toBe("weighted-criteria-card");
    expect(w.classes()).toContain("min-w-0");
    const rows = w.findAll('[data-slot="weighted-criterion"]');
    expect(rows).toHaveLength(3);
    expect(rows[2]!.attributes("data-enabled")).toBeUndefined();
    expect(w.text()).toContain("What matters most?");
    expect(w.text()).toContain("2 of 3 included");
    expect(w.find("ul").attributes("aria-labelledby")).toBe(w.find('[data-slot="card-title"]').attributes("id"));
    expect(w.find('[role="switch"]').attributes("aria-label")).toBe("Include Price");
    expect(w.find('[role="group"]').attributes("aria-label")).toBe("Weight of Price");
  });

  it("adds a custom criterion, and only custom ones can be removed", async () => {
    const w = mount(NqWeightedCriteriaCard, { props: { defaultCriteria: criteria } });
    expect(w.find('button[aria-label^="Remove"]').exists()).toBe(false);
    await w.find("input").setValue("Quality");
    await w.find("form").trigger("submit");
    expect(w.findAll('[data-slot="weighted-criterion"]')).toHaveLength(4);
    expect(w.find('button[aria-label="Remove Quality"]').exists()).toBe(true);
    await w.find('button[aria-label="Remove Quality"]').trigger("click");
    expect(w.findAll('[data-slot="weighted-criterion"]')).toHaveLength(3);
  });

  it("accepts and locks, or shows an error", async () => {
    let got: WeightedCriterion[] = [];
    const w = mount(NqWeightedCriteriaCard, { props: { defaultCriteria: criteria, onAccept: (c: WeightedCriterion[]) => void (got = c) } });
    await w.findAll("button").at(-1)!.trigger("click");
    await new Promise((r) => setTimeout(r, 5));
    expect(got).toHaveLength(3);
    expect(w.attributes("data-sent")).toBe("true");
    expect(w.text()).toContain("Sent");

    const bad = mount(NqWeightedCriteriaCard, { props: { defaultCriteria: criteria, onAccept: () => ({ error: "Nope" }) } });
    await bad.findAll("button").at(-1)!.trigger("click");
    await new Promise((r) => setTimeout(r, 5));
    expect(bad.find('[role="alert"]').text()).toContain("Nope");
    expect(bad.attributes("data-sent")).toBeUndefined();
  });

  it("emits update:criteria when a switch flips", async () => {
    const c = mount(NqWeightedCriteriaCard, { props: { defaultCriteria: criteria } });
    await c.find('[role="switch"]').trigger("click");
    await nextTick();
    expect(c.emitted("update:criteria")?.at(-1)?.[0]).toMatchObject([{ id: "price", enabled: false }, {}, {}]);
  });
});
