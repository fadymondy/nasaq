import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NqFeatureStory } from ".";

describe("NqFeatureStory", () => {
  it("renders the copy and points, and labels the section by its title", () => {
    const w = mount(NqFeatureStory, { props: { eyebrow: "SDK", title: "Hear users", description: "d", points: ["a", "b"] }, slots: { media: "<i>pic</i>", action: "<a>go</a>" } });
    expect(w.attributes("data-slot")).toBe("feature-story");
    const h = w.find("h2");
    expect(h.text()).toBe("Hear users");
    expect(w.find("section").attributes("aria-labelledby")).toBe(h.attributes("id"));
    expect(w.findAll("li").map((l) => l.text())).toEqual(["a", "b"]);
    expect(w.text()).toContain("pic");
    expect(w.text()).toContain("go");
  });

  it("reverse moves the copy after the media on wide containers; titleAs sets the heading", () => {
    const w = mount(NqFeatureStory, { props: { title: "T", reverse: true, titleAs: "h3" }, slots: { media: "m" } });
    expect(w.find("h3").exists()).toBe(true);
    expect(w.find("section > div").classes()).toContain("@3xl:order-2");
  });
});
