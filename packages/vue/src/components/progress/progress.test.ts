import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NqMeter, NqProgress } from ".";

describe("NqProgress", () => {
  it("is a labelled progressbar with a width and the formatted value", () => {
    const w = mount(NqProgress, { props: { value: 45, label: "Uploading files" } });
    const root = w.find('[data-slot="progress"]');
    expect(root.attributes("role")).toBe("progressbar");
    expect(root.attributes("aria-valuenow")).toBe("45");
    expect(root.attributes("aria-valuetext")).toBe("45%");
    expect(root.attributes("aria-labelledby")).toBe(w.find("span").attributes("id"));
    expect(root.attributes("data-progressing")).toBe("");
    expect(w.text()).toContain("Uploading files");
    expect(w.text()).toContain("45%");
    const fill = w.find('[data-slot="progress-indicator"]');
    expect(fill.attributes("style")).toContain("width: 45%");
    expect(fill.classes()).toContain("bg-primary");
    expect(w.find('[data-slot="progress-track"]').classes()).toContain("h-2");
  });

  it("is indeterminate with a null value, complete at max, and merges classes", () => {
    const w = mount(NqProgress, { props: { value: null, tone: "success", size: "sm", class: "max-w-xs" }, attrs: { "aria-label": "Working" } });
    expect(w.attributes("data-indeterminate")).toBe("");
    expect(w.attributes("aria-valuenow")).toBeUndefined();
    expect(w.find('[data-slot="progress-indicator"]').classes()).toEqual(expect.arrayContaining(["w-full", "bg-nq-success"]));
    expect(w.find('[data-slot="progress-track"]').classes()).toContain("h-1");
    expect(w.classes()).toContain("max-w-xs");
    const done = mount(NqProgress, { props: { value: 100 } });
    expect(done.attributes("data-complete")).toBe("");
  });
});

describe("NqMeter", () => {
  it("derives the tone from the thresholds", () => {
    const tone = (value: number) => mount(NqMeter, { props: { value, label: "Seats", valueText: `${value} of 100 seats` } });
    expect(tone(50).attributes("data-tone")).toBe("default");
    expect(tone(85).attributes("data-tone")).toBe("warning");
    expect(tone(97).attributes("data-tone")).toBe("danger");
    const w = tone(85);
    expect(w.attributes("role")).toBe("meter");
    expect(w.find('[data-slot="meter-indicator"]').classes()).toContain("bg-nq-warning");
    expect(w.text()).toContain("85 of 100 seats");
  });
});
