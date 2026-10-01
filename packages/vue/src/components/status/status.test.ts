import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { Rocket } from "lucide-vue-next";
import { NqStatus } from ".";

describe("NqStatus", () => {
  it("renders an icon and a label with the tone attribute and classes", () => {
    const w = mount(NqStatus, { props: { tone: "success" }, slots: { default: "Done" } });
    expect(w.attributes("data-slot")).toBe("status");
    expect(w.attributes("data-tone")).toBe("success");
    expect(w.classes()).toContain("text-foreground");
    expect(w.find("svg").classes()).toContain("text-nq-success-text");
    expect(w.find("svg").attributes("aria-hidden")).toBe("true");
    expect(w.find("span.truncate").attributes("title")).toBe("Done");
  });

  it("tinted colours the label, a custom icon replaces the tone glyph, class merges last", () => {
    const w = mount(NqStatus, { props: { tone: "danger", tinted: true, icon: Rocket, class: "gap-3" }, slots: { default: "Late" } });
    expect(w.classes()).toContain("text-nq-danger-text");
    expect(w.classes()).not.toContain("text-foreground");
    expect(w.classes()).toContain("gap-3");
    expect(w.classes()).not.toContain("gap-1.5");
    expect(w.find("svg").exists()).toBe(true);
  });
});
