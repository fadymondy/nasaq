import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { Home, Inbox } from "lucide-vue-next";
import { NqBottomTabBar, NqFilterStrip, NqSwipeActionRow } from ".";

describe("NqBottomTabBar", () => {
  it("marks the active tab and emits update:modelValue", async () => {
    const w = mount(NqBottomTabBar, {
      props: { items: [{ value: "home", label: "Home", icon: Home }, { value: "inbox", label: "Inbox", icon: Inbox }], modelValue: "home" },
    });
    expect(w.find("nav").exists()).toBe(true);
    const buttons = w.findAll("a,button");
    expect(buttons.length).toBeGreaterThanOrEqual(2);
    const current = w.find('[aria-current="page"]');
    expect(current.exists()).toBe(true);
    expect(current.text()).toContain("Home");
    await buttons[1]!.trigger("click");
    expect(w.emitted("update:modelValue")![0]).toEqual(["inbox"]);
  });
});

describe("NqFilterStrip", () => {
  it("single select emits the id", async () => {
    const w = mount(NqFilterStrip, { props: { items: [{ value: "all", label: "All" }, { value: "open", label: "Open" }], modelValue: "all" } });
    const chips = w.findAll("button");
    expect(chips).toHaveLength(2);
    expect(chips[0]!.attributes("aria-pressed") ?? chips[0]!.attributes("aria-checked") ?? chips[0]!.attributes("data-selected")).toBeDefined();
    await chips[1]!.trigger("click");
    expect(w.emitted("update:modelValue")![0]).toEqual(["open"]);
  });
  it("multiple select emits an array", async () => {
    const w = mount(NqFilterStrip, { props: { items: [{ value: "a", label: "A" }, { value: "b", label: "B" }], modelValue: ["a"], multiple: true } });
    await w.findAll("button")[1]!.trigger("click");
    expect(w.emitted("update:modelValue")![0]).toEqual([["a", "b"]]);
  });
});

describe("NqSwipeActionRow", () => {
  it("renders the row and its actions", () => {
    const w = mount(NqSwipeActionRow, {
      props: { endActions: [{ id: "archive", label: "Archive", icon: Inbox, onSelect: () => {} }] },
      slots: { default: "<div>Design review</div>" },
    });
    expect(w.text()).toContain("Design review");
    expect(w.text()).toContain("Archive");
  });
});
