import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NasaqProvider } from "../../provider";
import { NqWorkflowMarketplace, type WorkflowListing } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const categories = [{ id: "comms", label: "Messaging" }];
const listings: WorkflowListing[] = [
  { id: "mail", kind: "step", name: "Send email", summary: "Send a templated email.", category: "comms", installs: 100, step: { inputs: ["Contact"], outputs: ["Message id"], fields: [{ name: "to", label: "To", kind: "text", required: true }] } },
  { id: "new", kind: "step", name: "New order", summary: "Starts on an order.", category: "comms", installs: 50, step: { role: "trigger" } },
  { id: "welcome", kind: "preset", name: "Welcome series", summary: "Greet customers.", category: "comms", installs: 10, preset: { steps: [{ id: "a", title: "Signs up" }, { id: "b", title: "Send email" }] } },
];
const cards = (w: ReturnType<typeof mount>) => w.findAll('[data-slot="catalog-card"]').map((c) => c.attributes("data-item"));

describe("NqWorkflowMarketplace", () => {
  it("is a catalog store with a kind switch and role badges", async () => {
    const w = mount(NqWorkflowMarketplace, { props: { listings, categories } });
    expect(w.attributes("data-slot")).toBe("catalog-store");
    expect(cards(w)).toEqual(["mail", "new", "welcome"]);
    expect(w.find('[data-item="welcome"]').text()).toContain("Preset");
    expect(w.find('[data-item="new"]').text()).toContain("Trigger");
    expect(w.find('[data-item="mail"]').text()).toContain("Action");
    await w.findAll("[data-slot=toggle]").find((b) => b.text() === "Presets")!.trigger("click");
    expect(cards(w)).toEqual(["welcome"]);
    await w.findAll("[data-slot=toggle]").find((b) => b.text() === "Steps")!.trigger("click");
    expect(cards(w)).toEqual(["mail", "new"]);
  });

  it("shows takes, gives and settings for a step, and the diagram for a preset", async () => {
    const w = mount(NqWorkflowMarketplace, { props: { listings, categories }, attachTo: document.body });
    await w.find('[data-item="mail"] h3 button').trigger("click");
    await flushPromises();
    let sheet = document.querySelector<HTMLElement>('[data-slot="sheet-content"]')!;
    expect(sheet.textContent).toContain("Takes");
    expect(sheet.textContent).toContain("Message id");
    expect(sheet.textContent).toContain("(required)");
    expect(sheet.querySelector("code")!.textContent).toBe("text");
    w.unmount();
    document.body.innerHTML = "";
    const w2 = mount(NqWorkflowMarketplace, { props: { listings, categories }, attachTo: document.body });
    await w2.find('[data-item="welcome"] h3 button').trigger("click");
    await flushPromises();
    sheet = document.querySelector<HTMLElement>('[data-slot="sheet-content"]')!;
    expect(sheet.textContent).toContain("What it does");
    expect(sheet.textContent).toContain("2 steps");
    expect(sheet.querySelector('[data-slot="workflow-network"]')).not.toBeNull();
    w2.unmount();
  });

  it("hands the original listing to onInstall", async () => {
    const onInstall = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqWorkflowMarketplace, { props: { listings, categories, onInstall } });
    await w.find('[data-item="mail"] [data-slot=install-button]').trigger("click");
    await flushPromises();
    expect(onInstall).toHaveBeenCalledWith(listings[0]);
  });

  it("reads in Arabic", () => {
    const w = mount({ components: { NasaqProvider, NqWorkflowMarketplace }, setup: () => ({ listings, categories }), template: `<NasaqProvider locale="ar"><NqWorkflowMarketplace :listings="listings" :categories="categories" /></NasaqProvider>` });
    expect(w.text()).toContain("قوالب جاهزة");
    expect(w.text()).toContain("قالب");
  });
});
