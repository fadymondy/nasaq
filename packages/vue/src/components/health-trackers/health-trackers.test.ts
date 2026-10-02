import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { h } from "vue";
import { NasaqProvider } from "../../provider";
import { NqCupTracker, NqFlaggedEntries, NqFoodCatalogue, NqFoodItemBuilder, NqQuickLogStrip, cupCounts, cupState, foodDraftCompleteness, foodDraftValid, verdictCounts, verdictTone, type FoodCatalogueItem } from ".";

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

const families = [{ id: "caffeine", name: "Caffeine", nameAr: "الكافيين" }];
const items: FoodCatalogueItem[] = [
  { id: "tea", kind: "drink", name: "Green tea", verdict: "safe", verdictSource: "you", pinned: true },
  { id: "coffee", kind: "drink", name: "Espresso", verdict: "trigger", triggerFamilies: ["caffeine"] },
  { id: "yogurt", kind: "food", name: "Yogurt", verdict: "unreviewed" },
];

describe("health helpers", () => {
  it("works out cups, verdicts and completeness", () => {
    expect(cupState(0, 2, 5)).toBe("filled");
    expect(cupState(2, 2, 5)).toBe("next");
    expect(cupState(3, 2, 5)).toBe("empty");
    expect(cupCounts(9, 4)).toEqual({ filled: 4, total: 4 });
    expect(verdictCounts(items)).toEqual({ safe: 1, trigger: 1, unreviewed: 1 });
    expect(verdictTone("unreviewed")).toBe("neutral");
    const draft = { kind: "food" as const, name: "Egg", verdict: "trigger" as const, triggerFamilies: [] };
    expect(foodDraftValid(draft)).toBe(false);
    expect(foodDraftCompleteness(draft).missing).toContain("families");
  });
});

describe("NqCupTracker", () => {
  it("draws the cups and logs the next one", async () => {
    const onLog = vi.fn(async () => {});
    const w = mount(NqCupTracker, { props: { filled: 2, total: 5, onLog, class: "extra" } });
    expect(w.attributes("data-slot")).toBe("cup-tracker");
    expect(w.classes()).toContain("extra");
    expect(w.get('[role="group"]').attributes("aria-label")).toBe("2 of 5 cups logged today");
    expect(w.findAll('[data-state="filled"]')).toHaveLength(2);
    expect(w.findAll('[data-state="empty"]')).toHaveLength(2);
    await w.get('button[data-state="next"]').trigger("click");
    await flushPromises();
    expect(onLog).toHaveBeenCalledTimes(1);
  });

  it("shows the wait and the error", async () => {
    const w = mount(NqCupTracker, { props: { filled: 1, total: 3, waitLabel: "0:12", onLog: async () => ({ error: "Too soon" }) } });
    expect(w.get("button").attributes("aria-label")).toBe("Wait 0:12 for the next cup");
    await w.get("button").trigger("click");
    await flushPromises();
    expect(w.get('[role="alert"]').text()).toBe("Too soon");
  });

  it("says the day is done", () => {
    const w = mount(NqCupTracker, { props: { filled: 3, total: 3, onLog: async () => {} } });
    expect(w.text()).toContain("Every cup logged");
    expect(w.find("button").exists()).toBe(false);
  });
});

describe("NqQuickLogStrip", () => {
  it("logs an item and shows the flagged warning, then a refusal with Log anyway", async () => {
    const onLog = vi.fn(async (_i: unknown, o: { override: boolean }) => (o.override ? undefined : { error: "Over the limit", canOverride: true }));
    const w = mount(NqQuickLogStrip, { props: { items: [{ id: "a", name: "Water" }], onLog } });
    expect(w.attributes("data-slot")).toBe("quick-log-strip");
    await w.get("button").trigger("click");
    await flushPromises();
    expect(w.text()).toContain("Over the limit");
    await w.findAll("button").find((b) => b.text() === "Log anyway")!.trigger("click");
    await flushPromises();
    expect(onLog).toHaveBeenLastCalledWith({ id: "a", name: "Water" }, { override: true });
    expect(w.text()).toContain("Logged Water");
  });

  it("shows the empty state with a link", () => {
    const w = mount(NqQuickLogStrip, { props: { items: [], onLog: async () => {}, catalogueHref: "/catalogue" } });
    expect(w.get("a").attributes("href")).toBe("/catalogue");
  });
});

describe("NqFoodCatalogue", () => {
  it("lists the items with their verdicts", () => {
    const w = mount(NqFoodCatalogue, { props: { items, families } });
    expect(w.text()).toContain("Green tea");
    expect(w.text()).toContain("Unreviewed");
    expect(w.text()).toContain("Decided by you");
  });

  it("confirms before deleting", async () => {
    const onDelete = vi.fn(async () => {});
    const w = mount(NqFoodCatalogue, { props: { items, onDelete }, attachTo: document.body });
    const more = w.get('[aria-label="Actions for Green tea"]');
    await more.trigger("pointerdown", { button: 0, ctrlKey: false });
    await more.trigger("click");
    await flushPromises();
    const del = [...document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((e) => e.textContent?.trim() === "Delete");
    expect(del).toBeDefined();
    del!.click();
    await flushPromises();
    expect(document.body.textContent).toContain("Delete Green tea?");
    const confirmBtn = [...document.body.querySelectorAll<HTMLButtonElement>("button")].filter((b) => b.textContent?.trim() === "Delete").pop()!;
    confirmBtn.click();
    await flushPromises();
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: "tea" }));
  });
});

describe("NqFoodItemBuilder", () => {
  it("validates the name, then saves the draft", async () => {
    const onSave = vi.fn(async () => {});
    const w = mount(NqFoodItemBuilder, { props: { families, onSave } });
    expect(w.attributes("data-slot")).toBe("food-item-builder");
    await w.get("form").trigger("submit");
    await flushPromises();
    expect(onSave).not.toHaveBeenCalled();
    expect(w.text()).toContain("Give the item a name.");
    await w.get("input").setValue("Oats");
    await w.get("form").trigger("submit");
    await flushPromises();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect((onSave.mock.calls[0] as unknown as [{ name: string }])[0].name).toBe("Oats");
  });

  it("asks for a family when the verdict is trigger", async () => {
    const w = mount(NqFoodItemBuilder, { props: { families, onSave: async () => {} } });
    await w.get("input").setValue("Tea");
    await w.findAll('[role="radio"]').find((b) => b.text() === "Trigger")!.trigger("click");
    await w.get("form").trigger("submit");
    await flushPromises();
    expect(w.text()).toContain("A trigger needs at least one family.");
  });
});

describe("NqFlaggedEntries", () => {
  it("opens to the list of entries", async () => {
    const w = mount(NqFlaggedEntries, { props: { entries: [{ id: "f1", at: "2026-09-29T08:30:00Z", label: "Espresso", reason: "Too late", area: "Caffeine" }] }, attachTo: document.body });
    expect(w.text()).toContain("1 flagged");
    await w.get("button").trigger("click");
    await flushPromises();
    expect(w.text()).toContain("Too late");
  });

  it("loads lazily and retries", async () => {
    const onLoad = vi.fn().mockRejectedValueOnce(new Error("x")).mockResolvedValueOnce([]);
    const w = mount(NqFlaggedEntries, { props: { onLoad, count: 2 }, attachTo: document.body });
    expect(onLoad).not.toHaveBeenCalled();
    await w.get("button").trigger("click");
    await flushPromises();
    expect(w.text()).toContain("Could not load");
    await w.findAll("button").find((b) => b.text() === "Try again")!.trigger("click");
    await flushPromises();
    expect(w.text()).toContain("Nothing flagged today.");
  });
});

describe("Arabic", () => {
  it("speaks Arabic", () => {
    const w = mount({ render: () => h(NasaqProvider, { locale: "ar" }, () => h(NqCupTracker, { filled: 1, total: 4, onLog: async () => {} })) });
    expect(w.get('[role="group"]').attributes("aria-label")).toContain("من");
  });
});
