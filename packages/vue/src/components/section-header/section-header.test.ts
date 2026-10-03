import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NqSectionHeader } from ".";

describe("NqSectionHeader", () => {
  it("renders title, description and an action slot", () => {
    const w = mount(NqSectionHeader, { props: { title: "Essentials", description: "Install first.", headingId: "h" }, slots: { action: "<a>See all</a>" } });
    expect(w.attributes("data-slot")).toBe("section-header");
    expect(w.classes()).toEqual(expect.arrayContaining(["flex", "items-end", "justify-between"]));
    const h = w.find("h2");
    expect(h.text()).toBe("Essentials");
    expect(h.attributes("id")).toBe("h");
    expect(w.find("p").text()).toBe("Install first.");
    expect(w.find(".shrink-0").text()).toBe("See all");
  });

  it("as picks the heading level and omits empty parts", () => {
    const w = mount(NqSectionHeader, { props: { title: "Page", as: "h1", class: "gap-8" } });
    expect(w.find("h1").exists()).toBe(true);
    expect(w.find("p").exists()).toBe(false);
    expect(w.find(".shrink-0").exists()).toBe(false);
    expect(w.classes()).toContain("gap-8");
    expect(w.classes()).not.toContain("gap-4");
  });
});
