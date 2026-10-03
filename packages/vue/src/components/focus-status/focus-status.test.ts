import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NasaqProvider } from "../../provider";
import { h } from "vue";
import { focusStateOf, NqDoNotDisturbToggle, NqFocusAvatar, NqFocusStatusChip } from ".";

describe("focusStateOf", () => {
  it("derives the presence, do not disturb first", () => {
    expect(focusStateOf(null)).toBe("available");
    expect(focusStateOf({ phase: "focus", status: "idle" })).toBe("available");
    expect(focusStateOf({ phase: "focus", status: "paused" })).toBe("focus");
    expect(focusStateOf({ phase: "shortBreak", status: "running" })).toBe("break");
    expect(focusStateOf({ phase: "focus", status: "running" }, true)).toBe("dnd");
  });
});

describe("NqFocusStatusChip", () => {
  it("renders the word, the state and the time left", () => {
    const w = mount(NqFocusStatusChip, { props: { state: "focus", seconds: 754 } });
    expect(w.element.tagName).toBe("SPAN");
    expect(w.attributes("data-slot")).toBe("focus-status");
    expect(w.attributes("data-state")).toBe("focus");
    expect(w.classes()).toEqual(expect.arrayContaining(["h-7", "rounded-full", "text-foreground"]));
    expect(w.text()).toContain("In focus");
    const time = w.find("[dir=ltr]");
    expect(time.text()).toBe("12:34");
    expect(time.attributes("aria-label")).toBe("12:34 left");
  });

  it("hides the time when available and lets text replace the word", () => {
    const w = mount(NqFocusStatusChip, { props: { state: "available", seconds: 60, text: "Design review" } });
    expect(w.text()).toBe("Design review");
    expect(w.find("[dir=ltr]").exists()).toBe(false);
  });

  it("becomes a button when it has a click listener", async () => {
    const onClick = vi.fn();
    const w = mount(NqFocusStatusChip, { props: { state: "dnd" }, attrs: { onClick } });
    expect(w.element.tagName).toBe("BUTTON");
    expect(w.attributes("type")).toBe("button");
    expect(w.classes()).toContain("cursor-pointer");
    await w.trigger("click");
    expect(onClick).toHaveBeenCalled();
  });

  it("speaks Arabic in an Arabic provider", () => {
    const w = mount({ render: () => h(NasaqProvider, { defaultLocale: "ar", target: "scope" }, () => h(NqFocusStatusChip, { state: "break" })) });
    expect(w.text()).toContain("في استراحة");
  });
});

describe("NqFocusAvatar", () => {
  it("shows the presence dot with a name and an icon on big sizes", () => {
    const w = mount(NqFocusAvatar, { props: { name: "Fady Mondy", state: "focus" } });
    expect(w.attributes("data-slot")).toBe("focus-avatar");
    expect(w.find('[data-slot="avatar"]').exists()).toBe(true);
    const dot = w.find('[role="img"][title]');
    expect(dot.attributes("aria-label")).toBe("In focus");
    expect(dot.classes()).toEqual(expect.arrayContaining(["-end-0.5", "size-4", "bg-primary"]));
    expect(dot.find("svg").exists()).toBe(true);
  });

  it("small sizes show a plain dot, hideAvailable removes it", () => {
    const small = mount(NqFocusAvatar, { props: { name: "A B", state: "dnd", size: "sm" } });
    const dot = small.find('[role="img"][title]');
    expect(dot.classes()).toContain("size-3");
    expect(dot.find("svg").exists()).toBe(false);
    const hidden = mount(NqFocusAvatar, { props: { name: "A B", state: "available", hideAvailable: true } });
    expect(hidden.find('[title]').exists()).toBe(false);
  });
});

describe("NqDoNotDisturbToggle", () => {
  it("shows the until time while on and emits changes", async () => {
    const w = mount(NqDoNotDisturbToggle, { props: { modelValue: true, until: "6:00 PM" } });
    expect(w.attributes("data-slot")).toBe("do-not-disturb");
    expect(w.attributes("data-state")).toBe("on");
    expect(w.text()).toContain("Until");
    expect(w.text()).toContain("6:00 PM");
    const sw = w.find('[role="switch"]');
    expect(sw.attributes("aria-checked")).toBe("true");
    expect(w.find("label").attributes("for")).toBe(sw.attributes("id"));
    await sw.trigger("click");
    await flushPromises();
    expect(w.emitted("update:modelValue")![0]).toEqual([false]);
  });

  it("is off without the until line", () => {
    const w = mount(NqDoNotDisturbToggle, { props: { modelValue: false, until: "6:00 PM" } });
    expect(w.attributes("data-state")).toBe("off");
    expect(w.text()).not.toContain("Until");
  });
});
