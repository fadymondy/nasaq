import { mount } from "@vue/test-utils";
import { Database } from "lucide-vue-next";
import { describe, expect, it } from "vitest";
import { NqSourceBadge } from ".";

describe("NqSourceBadge", () => {
  it("renders icon and label with the React classes", () => {
    const w = mount(NqSourceBadge, { props: { label: "Postgres", icon: Database, color: "red" } });
    expect(w.element.tagName).toBe("SPAN");
    expect(w.classes()).toEqual(expect.arrayContaining(["h-6", "px-2", "rounded-control"]));
    expect(w.find('[data-slot="source-badge-icon"]').attributes("style")).toContain("color");
    expect(w.find(".truncate").text()).toBe("Postgres");
    expect(w.attributes("role")).toBeUndefined();
  });

  it("compact is icon only with an accessible name; md size; href makes an external link", () => {
    const c = mount(NqSourceBadge, { props: { label: "Postgres", icon: Database, compact: true } });
    expect(c.attributes("role")).toBe("img");
    expect(c.attributes("aria-label")).toBe("Postgres");
    expect(c.attributes("title")).toBe("Postgres");
    expect(c.classes()).toContain("w-6");
    expect(c.find(".truncate").exists()).toBe(false);
    const a = mount(NqSourceBadge, { props: { label: "GitHub", size: "md", href: "https://github.com" } });
    expect(a.element.tagName).toBe("A");
    expect(a.attributes("rel")).toBe("noopener noreferrer");
    expect(a.attributes("target")).toBe("_blank");
    expect(a.classes()).toContain("h-7");
    expect(a.classes()).toContain("hover:bg-nq-hover");
  });
});
