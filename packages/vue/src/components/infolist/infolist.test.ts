import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NqInfolist, type InfolistItem } from ".";

const items: InfolistItem[] = [
  { id: "name", label: "Name", labelAr: "الاسم", value: "Acme Trading" },
  { id: "status", label: "Status", type: "enum", value: "active", options: { active: { label: "Active", labelAr: "نشط", variant: "success" } } },
  { id: "vip", label: "VIP", type: "boolean", value: true },
  { id: "off", label: "Off", type: "boolean", value: false },
  { id: "email", label: "Email", type: "email", value: "hello@acme.test", copyable: true },
  { id: "site", label: "Site", type: "url", value: "javascript:alert(1)" },
  { id: "note", label: "Note" },
];

describe("NqInfolist", () => {
  it("renders a described group with dl rows", () => {
    const w = mount(NqInfolist, { props: { items, label: "Customer" } });
    expect(w.attributes("role")).toBe("group");
    expect(w.attributes("aria-label")).toBe("Customer");
    expect(w.findAll('[data-slot="infolist-item"]')).toHaveLength(7);
    expect(w.find("dl").classes()).toContain("sm:grid-cols-2");
    expect(w.findAll("dt")).toHaveLength(7);
  });

  it("turns enum and boolean into badges, links email, copies, shows Not set", () => {
    const w = mount(NqInfolist, { props: { items } });
    const badges = w.findAll('[data-slot="badge"]').map((b) => b.text());
    expect(badges).toEqual(expect.arrayContaining(["Active", "Yes", "No"]));
    expect(w.get('a[href="mailto:hello@acme.test"]').attributes("dir")).toBe("ltr");
    expect(w.find('[data-slot="copy-button"]').exists()).toBe(true);
    expect(w.text()).toContain("Not set");
  });

  it("does not link unsafe urls and hides empty rows when showEmpty is false", () => {
    const w = mount(NqInfolist, { props: { items, showEmpty: false } });
    expect(w.find('a[href^="javascript"]').exists()).toBe(false);
    expect(w.findAll('[data-slot="infolist-item"]')).toHaveLength(6);
  });

  it("uses Arabic labels in Arabic", () => {
    const w = mount(NqInfolist, { props: { items, locale: "ar" } });
    expect(w.text()).toContain("الاسم");
    expect(w.text()).toContain("نشط");
    expect(w.text()).toContain("نعم");
  });

  it("groups rows into sections with headings", () => {
    const w = mount(NqInfolist, { props: { sections: [{ id: "a", title: "General", items: items.slice(0, 1) }], columns: 1 } });
    expect(w.get("h3").text()).toBe("General");
    expect(w.find("dl").classes()).not.toContain("sm:grid-cols-2");
  });
});
