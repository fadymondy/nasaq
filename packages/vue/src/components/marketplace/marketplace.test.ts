import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NasaqProvider } from "../../provider";
import { highestRisk, pickFeatured, validateDraft } from "./marketplace-format";
import { NqMarketplace, NqMarketplaceDetail, NqPermissionList, NqPublishForm, NqTemplateGallery, type MarketplaceListing } from ".";

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("lang");
  document.documentElement.removeAttribute("dir");
});

const categories = [
  { id: "tools", label: "Tools" },
  { id: "data", label: "Data" },
];
const listings: MarketplaceListing[] = [
  {
    id: "a",
    name: "Alpha",
    summary: "First tool",
    category: "tools",
    installs: 1200,
    featured: true,
    publisher: "Nasaq",
    version: "1.2.0",
    permissions: [
      { id: "r", label: "Read", risk: "low" },
      { id: "b", label: "Billing", risk: "high" },
    ],
    changelog: [{ version: "1.2.0", date: "2026-09-01", notes: ["Faster"] }],
    reviews: [{ id: "x", author: "Sara", rating: 5, date: "2026-09-20", body: "Great" }],
    links: [{ label: "Docs", href: "https://example.com" }],
  },
  { id: "b", name: "Beta", summary: "Second", category: "data", installs: 50 },
];

describe("marketplace logic", () => {
  it("ranks risk, validates drafts and picks featured", () => {
    expect(highestRisk([{ risk: "low" }, { risk: "high" }])).toBe("high");
    expect(highestRisk([])).toBeNull();
    expect(validateDraft({ name: "", summary: "", description: "", category: "", version: "x", repository: "http://a", price: 0, tags: [], permissions: [] })).toMatchObject({ name: "required", category: "required", version: "invalid" });
    expect(pickFeatured(listings, 3).map((l) => l.id)).toEqual(["a"]);
  });
});

describe("NqPermissionList", () => {
  it("sorts the riskiest first and spells risk out", () => {
    const w = mount(NqPermissionList, { props: { permissions: listings[0]!.permissions! } });
    const rows = w.findAll("li");
    expect(rows.map((r) => r.attributes("data-risk"))).toEqual(["high", "low"]);
    expect(rows[0]!.text()).toContain("High");
  });
});

describe("NqMarketplace", () => {
  it("shows featured, opens a detail page and goes back", async () => {
    const onSelectedChange = vi.fn();
    const w = mount(NqMarketplace, { props: { listings, categories, onSelectedChange } });
    expect(w.attributes("data-slot")).toBe("marketplace");
    expect(w.find('[data-featured="a"]').exists()).toBe(true);
    await w.find('[data-featured="a"] button').trigger("click");
    expect(onSelectedChange).toHaveBeenCalledWith("a");
    expect(w.find('[data-slot="marketplace-detail"]').attributes("data-listing")).toBe("a");
    await w.findAll("button").find((b) => b.text() === "Back to the store")!.trigger("click");
    expect(onSelectedChange).toHaveBeenLastCalledWith(null);
    expect(w.attributes("data-slot")).toBe("marketplace");
  });

  it("installs from the detail page and shows an error", async () => {
    const onInstall = vi.fn().mockResolvedValue({ error: "Quota reached" });
    const w = mount(NqMarketplace, { props: { listings, categories, onInstall } });
    await w.find('[data-featured="a"] button').trigger("click");
    await w.find("[data-slot=install-button]").trigger("click");
    await flushPromises();
    expect(onInstall).toHaveBeenCalled();
    expect(w.find('[role="alert"]').text()).toBe("Quota reached");
  });

  it("marks the listing installed after a successful install", async () => {
    const onInstall = vi.fn().mockResolvedValue({});
    const w = mount(NqMarketplace, { props: { listings, categories, onInstall } });
    await w.find('[data-featured="a"] button').trigger("click");
    await w.find("[data-slot=install-button]").trigger("click");
    await flushPromises();
    expect(w.find("[data-slot=install-button]").attributes("data-state")).toBe("installed");
  });

  it("reads in Arabic", () => {
    const w = mount({ components: { NasaqProvider, NqMarketplace }, setup: () => ({ listings, categories }), template: `<NasaqProvider locale="ar"><NqMarketplace :listings="listings" :categories="categories" /></NasaqProvider>` });
    expect(w.find("section h2").text()).not.toBe("Featured");
  });
});

describe("NqMarketplaceDetail", () => {
  it("renders details, permissions and links", () => {
    const w = mount(NqMarketplaceDetail, { props: { listing: listings[0]! } });
    expect(w.text()).toContain("by Nasaq");
    expect(w.text()).toContain("Billing");
    expect(w.find('a[href="https://example.com"]').attributes("target")).toBe("_blank");
    expect(w.find('[data-slot="permission-list"]').exists()).toBe(true);
  });
});

describe("NqPublishForm", () => {
  it("blocks an empty submit with field errors", async () => {
    const onSubmit = vi.fn().mockResolvedValue({});
    const w = mount(NqPublishForm, { props: { categories, onSubmit } });
    await w.find("form").trigger("submit");
    expect(onSubmit).not.toHaveBeenCalled();
    expect(w.text()).toContain("This is required.");
  });
});

describe("NqTemplateGallery", () => {
  const templates = [
    { id: "t1", name: "Report", summary: "Weekly", category: "tools" },
    { id: "t2", name: "Funnel", summary: "Sales", category: "data" },
  ];
  it("filters by category and uses a template", async () => {
    const onUse = vi.fn().mockResolvedValue({ error: "Nope" });
    const w = mount(NqTemplateGallery, { props: { templates, categories, onUse } });
    expect(w.findAll("[data-template]")).toHaveLength(2);
    await w.findAll("[data-slot=chip]").find((c) => c.text() === "Data")!.trigger("click");
    expect(w.findAll("[data-template]").map((t) => t.attributes("data-template"))).toEqual(["t2"]);
    await w.find("[data-template] button").trigger("click");
    await flushPromises();
    expect(onUse).toHaveBeenCalledWith(templates[1]);
    expect(w.find('[role="alert"]').text()).toBe("Nope");
  });
});
