import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { NasaqProvider } from "../../provider";
import type { CommerceProduct } from "../store-listing/commerce";
import {
  merchActiveDeals,
  merchCountdownParts,
  merchDealProgress,
  merchRecordViewed,
  merchRelatedProducts,
  merchViewedProducts,
  NqStoreBrandStrip,
  NqStoreCategoryTiles,
  NqStoreCountdown,
  NqStoreFlashDeals,
  NqStoreHeroBanner,
  NqStoreProductCarousel,
  NqStorePromoBanners,
} from ".";

afterEach(() => {
  document.body.innerHTML = "";
  vi.useRealTimers();
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

const mk = (id: string, name: string, extra: Partial<CommerceProduct> = {}): CommerceProduct => ({
  id,
  name,
  brand: "Nasaq Goods",
  category: "Clothing",
  images: [],
  options: [],
  variants: [{ id: `${id}-1`, options: {}, price: 2900, stock: 5 }],
  ...extra,
});
const products = [mk("tee", "Everyday tee"), mk("hoodie", "Zip hoodie"), mk("cap", "Canvas cap", { brand: "Atlas", category: "Accessories", tags: ["summer"] })];

const wrap = (comp: object, props: Record<string, unknown>, locale = "en") =>
  mount({ components: { NasaqProvider, C: comp }, setup: () => ({ props, locale }), template: `<NasaqProvider :locale="locale"><C v-bind="props" /></NasaqProvider>` }, { attachTo: document.body });

describe("merch model", () => {
  it("splits time and flags done", () => {
    expect(merchCountdownParts(90_061_000, 0)).toMatchObject({ days: 1, hours: 1, minutes: 1, seconds: 1, done: false });
    expect(merchCountdownParts(0, 5).done).toBe(true);
    expect(merchCountdownParts(Number.NaN, 5).done).toBe(true);
  });
  it("keeps live deals, soonest first, and clamps progress", () => {
    const deals = [
      { id: "a", endsAt: 300 },
      { id: "b", endsAt: 200 },
      { id: "c", endsAt: 100 },
      { id: "d", endsAt: 900, startsAt: 500 },
    ];
    expect(merchActiveDeals(deals, 150).map((d) => d.id)).toEqual(["b", "a"]);
    expect(merchDealProgress(30, 40)).toBe(75);
    expect(merchDealProgress(80, 40)).toBe(100);
    expect(merchDealProgress(undefined, 40)).toBe(0);
  });
  it("records viewed ids and ranks related products", () => {
    expect(merchRecordViewed(["a", "b", "c"], "b", 3)).toEqual(["b", "a", "c"]);
    expect(merchViewedProducts(products, ["cap", "gone", "tee"], "tee").map((p) => p.id)).toEqual(["cap"]);
    expect(merchRelatedProducts(products, products[0]!).map((p) => p.id)).toEqual(["hoodie"]);
  });
});

describe("NqStoreCategoryTiles", () => {
  it("renders linked tiles with counts, emits select and hides the heading on null", async () => {
    const w = mount(NqStoreCategoryTiles, { props: { items: [{ id: "tops", label: "Tops", count: 1200 }, { id: "caps", label: "Caps", href: "/caps" }] }, attachTo: document.body });
    expect(w.attributes("data-slot")).toBe("store-category-tiles");
    expect(w.attributes("aria-labelledby")).toBe("store-cats-h");
    expect(w.find("h2").text()).toBe("Shop by category");
    const links = w.findAll("a");
    expect(links.map((a) => a.attributes("href"))).toEqual(["#tops", "/caps"]);
    expect(links[0]!.text()).toContain("Items: 1,200");
    await links[0]!.trigger("click");
    expect(w.emitted("select")![0]![0]).toMatchObject({ id: "tops" });
    await w.setProps({ title: null });
    expect(w.find("h2").exists()).toBe(false);
    expect(w.attributes("aria-label")).toBe("Shop by category");
    w.unmount();
  });
  it("speaks Arabic", () => {
    const w = wrap(NqStoreCategoryTiles, { items: [{ id: "a", label: "أ", count: 3 }] }, "ar");
    expect(w.text()).toContain("تسوّق حسب القسم");
    expect(w.text()).toContain("3 منتجات");
    w.unmount();
  });
});

describe("banners", () => {
  const banners = [
    { id: "a", title: "Summer", description: "Light layers", href: "/summer", tone: "dark" as const },
    { id: "b", title: "Sale", cta: "See deals" },
  ];
  it("shows a single hero banner as is", async () => {
    const w = mount(NqStoreHeroBanner, { props: { items: [banners[0]!] }, attachTo: document.body });
    expect(w.attributes("data-slot")).toBe("store-hero-banner");
    expect(w.find('[data-slot="carousel"]').exists()).toBe(false);
    expect(w.find("h2").text()).toBe("Summer");
    const cta = w.find("a");
    expect(cta.attributes("href")).toBe("/summer");
    expect(cta.text()).toContain("Shop now");
    expect(w.find(".bg-foreground").exists()).toBe(true);
    await cta.trigger("click");
    expect(w.emitted("select")![0]![0]).toMatchObject({ id: "a" });
    w.unmount();
  });
  it("turns several hero banners into a carousel and renders nothing when empty", () => {
    const w = mount(NqStoreHeroBanner, { props: { items: banners }, attachTo: document.body });
    expect(w.find('[data-slot="carousel"]').exists()).toBe(true);
    expect(w.findAll('[data-slot="carousel-item"]')).toHaveLength(2);
    w.unmount();
    expect(mount(NqStoreHeroBanner, { props: { items: [] } }).html()).toBe("<!--v-if-->");
  });
  it("lays promo banners out by count", () => {
    const w = mount(NqStorePromoBanners, { props: { items: banners }, attachTo: document.body });
    expect(w.find("ul").classes()).toContain("md:grid-cols-2");
    expect(w.findAll("li")).toHaveLength(2);
    expect(w.findAll("a")[1]!.classes()).toContain("bg-secondary");
    expect(w.text()).toContain("See deals");
    w.unmount();
  });
});

describe("NqStoreCountdown", () => {
  it("renders padded units with a minute-level label and a fixed LTR order", () => {
    const now = 0;
    const w = mount(NqStoreCountdown, { props: { endsAt: now + 90_061_000, now } });
    expect(w.attributes("role")).toBe("timer");
    expect(w.attributes("dir")).toBe("ltr");
    expect(w.attributes("aria-label")).toBe("Time left: 1 days 01 hours 01 minutes");
    expect(w.findAll('[aria-hidden="true"]').map((s) => s.text())).toEqual(["1d", "01h", "01m", "01s"]);
  });
  it("drops the days unit under a day and says the deal ended at zero, firing expire once", async () => {
    const w = mount(NqStoreCountdown, { props: { endsAt: 3_661_000, now: 0 } });
    expect(w.findAll('[aria-hidden="true"]')).toHaveLength(3);
    await w.setProps({ now: 4_000_000 });
    expect(w.text()).toBe("This deal has ended");
    expect(w.attributes("role")).toBeUndefined();
    expect(w.emitted("expire")).toHaveLength(1);
  });
  it("ticks on the second boundary", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const w = mount(NqStoreCountdown, { props: { endsAt: 5000 } });
    expect(w.text()).toContain("05s");
    vi.advanceTimersByTime(2000);
    await nextTick();
    expect(w.text()).toContain("03s");
    w.unmount();
  });
});

describe("NqStoreFlashDeals", () => {
  const now = 1_000_000;
  const deals = [
    { id: "late", product: products[1]!, endsAt: now + 7_200_000, sold: 10, total: 40 },
    { id: "soon", product: products[0]!, endsAt: now + 3_600_000, sold: 45, total: 50 },
    { id: "over", product: products[2]!, endsAt: now - 1 },
  ];
  it("shows live deals soonest first with progress, and the soonest countdown", () => {
    const w = mount(NqStoreFlashDeals, { props: { deals, currency: "USD", now }, attachTo: document.body });
    expect(w.attributes("data-slot")).toBe("store-flash-deals");
    expect(w.find("h2").text()).toBe("Flash deals");
    expect(w.findAll('[data-slot="carousel-item"]')).toHaveLength(2);
    expect(w.find('[data-slot="carousel-item"]').text()).toContain("Everyday tee");
    expect(w.find('[data-slot="store-countdown"]').attributes("aria-label")).toBe("Time left: 01 hours 00 minutes");
    const bars = w.findAll('[role="progressbar"]');
    expect(bars.map((b) => b.attributes("aria-valuenow"))).toEqual(["90", "25"]);
    expect(w.text()).toContain("Almost gone");
    expect(w.text()).toContain("25% claimed");
    expect(w.text()).toContain("$29");
    w.unmount();
  });
  it("renders nothing and fires expire when every deal ended", () => {
    const w = mount(NqStoreFlashDeals, { props: { deals: [deals[2]!], now } });
    expect(w.find("section").exists()).toBe(false);
    expect(w.emitted("expire")).toHaveLength(1);
  });
  it("only enables the card buttons the caller bound, and forwards add-to-cart", async () => {
    const add = vi.fn();
    const plain = mount(NqStoreFlashDeals, { props: { deals, now }, attachTo: document.body });
    expect(plain.find('button[aria-label^="Quick view"]').exists()).toBe(false);
    plain.unmount();
    const w = mount(NqStoreFlashDeals, { props: { deals, now, onAddToCart: add }, attachTo: document.body });
    const button = w.findAll("button").find((b) => b.text().includes("Add to cart"))!;
    await button.trigger("click");
    expect(add).toHaveBeenCalledTimes(1);
    expect(add.mock.calls[0]![0]).toMatchObject({ id: "tee" });
    w.unmount();
  });
  it("uses SAR in Arabic", () => {
    const w = wrap(NqStoreFlashDeals, { deals, now }, "ar");
    expect(w.text()).toContain("عروض سريعة");
    expect(w.text()).toContain("ينتهي خلال");
    expect(w.text()).toMatch(/SAR|ر\.س/);
    w.unmount();
  });
});

describe("NqStoreProductCarousel", () => {
  it("renders a labelled carousel of cards with the per-view basis and a view-all link", () => {
    const w = mount(NqStoreProductCarousel, { props: { products, currency: "USD", title: "Recently viewed", viewAllHref: "/all", perView: 3 }, attachTo: document.body });
    expect(w.attributes("data-slot")).toBe("store-product-carousel");
    expect(w.attributes("aria-labelledby")).toBe("store-car-Recently-viewed");
    expect(w.find("h2").text()).toBe("Recently viewed");
    expect(w.find('[data-slot="carousel"]').attributes("aria-label")).toBe("Recently viewed carousel");
    const items = w.findAll('[data-slot="carousel-item"]');
    expect(items).toHaveLength(3);
    expect(items[0]!.classes()).toEqual(expect.arrayContaining(["basis-[70%]", "snap-start", "sm:basis-1/3", "lg:basis-1/3"]));
    expect(w.findAll('[data-slot="store-product-card"]')).toHaveLength(3);
    expect(w.find('a[href="/all"]').text()).toContain("View all");
    w.unmount();
  });
  it("defaults the heading, hides itself when empty and reflects wishlist ids", async () => {
    const w = mount(NqStoreProductCarousel, { props: { products, wishlistIds: ["tee"], onToggleWishlist: () => {} }, attachTo: document.body });
    expect(w.find("h2").text()).toBe("You may also like");
    expect(w.find('[aria-pressed="true"]').exists()).toBe(true);
    await w.setProps({ products: [] });
    expect(w.find("section").exists()).toBe(false);
    w.unmount();
  });
});

describe("NqStoreBrandStrip", () => {
  it("shows names or logos and links only when href or select is given", async () => {
    const brands = [{ id: "a", name: "Atlas" }, { id: "b", name: "Nord", href: "/nord", logo: "/nord.svg" }];
    const w = mount(NqStoreBrandStrip, { props: { brands }, attachTo: document.body });
    expect(w.attributes("aria-labelledby")).toBe("store-brands-h");
    expect(w.findAll("li")[0]!.find("a").exists()).toBe(false);
    expect(w.findAll("li")[0]!.text()).toBe("Atlas");
    const link = w.findAll("li")[1]!.find("a");
    expect(link.attributes("aria-label")).toBe("Shop Nord");
    expect(link.find("img").attributes("alt")).toBe("Nord");
    expect(link.find("img").attributes("loading")).toBe("lazy");
    w.unmount();
    const s = mount(NqStoreBrandStrip, { props: { brands, title: null, onSelect: vi.fn() }, attachTo: document.body });
    expect(s.find("h2").exists()).toBe(false);
    expect(s.attributes("aria-label")).toBe("Our brands");
    expect(s.findAll("a")).toHaveLength(2);
    s.unmount();
  });
});
