import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NqRating } from ".";

describe("NqRating", () => {
  it("shows one star, the score and a compact count, with a spoken summary", () => {
    const w = mount(NqRating, { props: { value: 4.8, count: 2140, countLabel: "workspaces" } });
    expect(w.attributes("data-slot")).toBe("rating");
    expect(w.find("svg").classes()).toEqual(expect.arrayContaining(["size-3.5", "fill-nq-accent"]));
    expect(w.find(".sr-only").text()).toBe("Rated 4.8 out of 5, 2.1K workspaces");
    expect(w.findAll("bdi").map((n) => n.text())).toEqual(["4.8", "2.1K"]);
    expect(w.text()).toContain("2.1K workspaces");
  });

  it("omits the count and merges classes", () => {
    const w = mount(NqRating, { props: { value: 4, max: 10, class: "text-body" } });
    expect(w.find(".sr-only").text()).toBe("Rated 4.0 out of 10");
    expect(w.text()).not.toContain("·");
    expect(w.classes()).toContain("text-body");
    expect(w.classes()).not.toContain("text-caption");
  });
});
