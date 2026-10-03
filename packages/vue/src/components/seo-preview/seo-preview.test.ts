import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NqLengthMeter, NqSeoPreview, lengthMeter } from ".";

const meta = {
  title: "A complete guide to RTL design systems",
  description: "Learn how to build interfaces that work from right to left without a second stylesheet.",
  url: "https://example.com/blog/rtl-guide",
};

describe("NqSeoPreview", () => {
  it("renders the Google result with host, breadcrumb and meters", () => {
    const w = mount(NqSeoPreview, { props: { defaultValue: meta } });
    expect(w.attributes("data-slot")).toBe("seo-preview");
    const g = w.get('[data-slot="seo-google"]');
    expect(g.attributes("data-device")).toBe("desktop");
    expect(g.text()).toContain("example.com");
    expect(g.text()).toContain("rtl guide");
    expect(g.text()).toContain("A complete guide to RTL design systems");
    expect(w.findAll('[data-slot="length-meter"]')).toHaveLength(2);
    expect(w.findAll("input")).toHaveLength(0);
  });

  it("shows fields when it has an update listener and emits edits", async () => {
    const updates: unknown[] = [];
    const w = mount(NqSeoPreview, { props: { modelValue: meta, "onUpdate:modelValue": (v: unknown) => updates.push(v) } });
    const inputs = w.findAll("input");
    expect(inputs.length).toBeGreaterThan(0);
    await inputs[0]!.setValue("New title");
    expect(updates[0]).toMatchObject({ title: "New title", url: meta.url });
  });

  it("switches the device", async () => {
    const w = mount(NqSeoPreview, { props: { defaultValue: meta } });
    const mobile = w.findAll("button").find((b) => b.text() === "Mobile")!;
    await mobile.trigger("click");
    expect(w.get('[data-slot="seo-google"]').attributes("data-device")).toBe("mobile");
  });

  it("length meter reports status", () => {
    expect(lengthMeter("title", "").status).toBe("empty");
    const w = mount(NqLengthMeter, { props: { field: "title", text: "x".repeat(70) } });
    expect(w.attributes("data-status")).toBe("long");
    expect(w.text()).toContain("10 characters too long");
  });
});
