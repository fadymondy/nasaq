import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { connector, networkLinks, NqWorkflowNetwork, rowsFor } from ".";

const steps = [
  { id: "ask", title: "Customer asks", owner: "Customer" },
  { id: "check", title: "Within 14 days?", kind: "decision" as const },
  { id: "pay", title: "Refund issued", kind: "output" as const },
];

describe("NqWorkflowNetwork", () => {
  it("renders a figure with a card per step, kind badges and a step count", () => {
    const w = mount(NqWorkflowNetwork, { props: { steps, title: "Refunds", caption: "How it works", layout: "horizontal" } });
    expect(w.attributes("data-slot")).toBe("workflow-network");
    expect(w.attributes("data-layout")).toBe("horizontal");
    expect(w.find("h3").text()).toBe("Refunds");
    expect(w.find("figcaption").text()).toBe("How it works");
    expect(w.find(".sr-only").text()).toBe("3 steps");
    const cards = w.findAll("[data-step]");
    expect(cards.map((c) => c.attributes("data-step"))).toEqual(["ask", "check", "pay"]);
    expect(cards[1]!.classes()).toContain("border-nq-accent/60");
    expect(cards[1]!.text()).toContain("Decision");
    expect(cards[2]!.text()).toContain("Result");
    expect(cards[0]!.text()).toContain("Customer");
    expect(cards[0]!.element.tagName).toBe("DIV");
  });

  it("vertical layout is one column and highlight rings the card", () => {
    const w = mount(NqWorkflowNetwork, { props: { steps, layout: "vertical", highlight: "check" } });
    expect(w.attributes("data-layout")).toBe("vertical");
    expect(w.findAll("[data-step]")[1]!.classes()).toContain("ring-nq-brand");
  });

  it("listening to step-click turns the cards into buttons", async () => {
    const w = mount(NqWorkflowNetwork, { props: { steps, layout: "horizontal", onStepClick: () => {} } });
    const card = w.find("[data-step='check']");
    expect(card.element.tagName).toBe("BUTTON");
    await card.trigger("click");
    expect(w.emitted("step-click")![0]![0]).toMatchObject({ id: "check" });
  });

  it("geometry helpers: default chain, balanced rows, connectors", () => {
    expect(networkLinks(["a", "b", "c"])).toEqual([
      { from: 0, to: 1 },
      { from: 1, to: 2 },
    ]);
    expect(rowsFor(5, 4)).toEqual([3, 2]);
    const c = connector({ x: 0, y: 0, w: 100, h: 40 }, { x: 140, y: 0, w: 100, h: 40 });
    expect(c.d.startsWith("M 100 20")).toBe(true);
  });
});
