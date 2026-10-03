import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NqPlanCard, NqPlanGrid } from ".";

describe("NqPlanCard", () => {
  it("renders name, price, features and wires aria-labelledby to the heading", () => {
    const w = mount(NqPlanCard, {
      props: { name: "Team", description: "For teams.", priceNote: "Billed yearly", features: ["Unlimited", { label: "SSO", included: false }], featuresTitle: "Includes", footnote: "No card" },
      slots: { price: "<b>$12</b>", action: "<button>Go</button>" },
    });
    expect(w.attributes("data-slot")).toBe("plan-card");
    expect(w.classes()).toEqual(expect.arrayContaining(["rounded-card", "p-6", "bg-nq-surface"]));
    const h = w.find("h3");
    expect(h.text()).toBe("Team");
    expect(w.attributes("aria-labelledby")).toBe(h.attributes("id"));
    expect(w.text()).toContain("$12");
    expect(w.text()).toContain("Billed yearly");
    expect(w.text()).toContain("No card");
    const [a, b] = w.findAll("li");
    expect(a!.attributes("data-included")).toBe("");
    expect(a!.classes()).toContain("text-foreground");
    expect(b!.attributes("data-included")).toBeUndefined();
    expect(b!.classes()).toContain("text-muted-foreground");
    expect(b!.find(".sr-only").text()).toBe("(Not included)");
  });

  it("highlighted tints the surface and uses the primary pill", () => {
    const w = mount(NqPlanCard, { props: { name: "Team", highlighted: true, badge: "Most popular", class: "extra" } });
    expect(w.attributes("data-highlighted")).toBe("");
    expect(w.classes()).toEqual(expect.arrayContaining(["shadow-lg", "ring-2", "extra"]));
    const pill = w.find('[data-slot="plan-card-badge"]');
    expect(pill.text()).toBe("Most popular");
    expect(pill.classes()).toContain("bg-primary");
    expect(pill.classes()).toContain("start-6");
  });

  it("current shows the Current plan pill unless a badge is set", () => {
    const w = mount(NqPlanCard, { props: { name: "Solo", current: true } });
    expect(w.attributes("data-current")).toBe("");
    expect(w.classes()).toContain("ring-nq-line-strong");
    expect(w.find('[data-slot="plan-card-badge"]').text()).toBe("Current plan");
    expect(mount(NqPlanCard, { props: { name: "Solo", current: true, badge: "Save 20%" } }).find('[data-slot="plan-card-badge"]').text()).toBe("Save 20%");
  });

  it("a feature hint wraps the label in a focusable tooltip trigger", () => {
    const w = mount(NqPlanCard, { props: { name: "Team", features: [{ label: "SSO", hint: "SAML" }] } });
    const trigger = w.find("li span[tabindex='0']");
    expect(trigger.text()).toBe("SSO");
    expect(trigger.classes()).toContain("cursor-help");
  });
});

describe("NqPlanGrid", () => {
  it("is a container with a column flow from 48rem", () => {
    const w = mount(NqPlanGrid, { slots: { default: "<i>x</i>" } });
    expect(w.attributes("data-slot")).toBe("plan-grid");
    expect(w.classes()).toContain("@container");
    expect(w.element.firstElementChild?.className).toContain("@3xl:grid-flow-col");
  });
});
