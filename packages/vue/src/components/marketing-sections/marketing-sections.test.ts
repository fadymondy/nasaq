import { mount } from "@vue/test-utils";
import { Zap } from "lucide-vue-next";
import { afterEach, describe, expect, it, vi } from "vitest";
import { h, nextTick } from "vue";
import { NasaqProvider } from "../../provider";
import { NqAppMockupHero, NqAuroraBackground, NqCtaBanner, NqFeatureGrid, NqGridBackground, NqHowItWorks, NqPricingPacks, NqSessionPlayback, formatSessionClock, sessionTimeline } from ".";

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

describe("backgrounds", () => {
  it("aurora and grid are decoration behind the children", () => {
    const a = mount(NqAuroraBackground, { props: { class: "h-40" }, slots: { default: "<p>hi</p>" } });
    expect(a.attributes("data-slot")).toBe("aurora-background");
    expect(a.classes()).toEqual(expect.arrayContaining(["relative", "isolate", "h-40"]));
    expect(a.find("[aria-hidden]").classes()).toContain("pointer-events-none");
    expect(a.findAll("span.blur-3xl")).toHaveLength(3);
    expect(a.text()).toBe("hi");
    const g = mount(NqGridBackground, { props: { pattern: "dots", cell: 24 } });
    expect(g.attributes("data-slot")).toBe("grid-background");
    expect(g.find("[aria-hidden]").attributes("style")).toContain("24px 24px");
  });
});

describe("NqHowItWorks", () => {
  it("numbers the steps, joins them and labels the section", () => {
    const w = mount(NqHowItWorks, { props: { title: "How", steps: [{ title: "Create", description: "d" }, { title: "Share" }, { title: "Sell", icon: Zap }] } });
    expect(w.attributes("data-slot")).toBe("how-it-works");
    const h2 = w.find("h2");
    expect(w.attributes("aria-labelledby")).toBe(h2.attributes("id"));
    const items = w.findAll("li");
    expect(items).toHaveLength(3);
    expect(items[0]!.find("span[dir=ltr]").text()).toBe("1");
    expect(items[2]!.find("svg").exists()).toBe(true);
    expect(w.findAll("li > span[aria-hidden]")).toHaveLength(2);
    expect(w.find("ol").attributes("style")).toContain("--steps: 3");
    expect(w.find("ol").classes()).toContain("@3xl:grid-cols-[repeat(var(--steps),minmax(0,1fr))]");
  });

  it("column layout is always vertical; titleAs sets the heading", () => {
    const w = mount(NqHowItWorks, { props: { title: "T", titleAs: "h3", layout: "column", steps: [{ title: "a" }] } });
    expect(w.find("h3").exists()).toBe(true);
    expect(w.find("ol").classes()).toContain("max-w-2xl");
  });
});

describe("NqFeatureGrid", () => {
  const features = [{ icon: Zap, title: "Fast", description: "Quick." }, { title: "Docs", href: "/docs", wide: true }];
  it("renders tiles, links and wide tiles", () => {
    const w = mount(NqFeatureGrid, { props: { title: "All", features } });
    expect(w.attributes("data-slot")).toBe("feature-grid");
    expect(w.find("ul").classes()).toContain("@4xl:grid-cols-3");
    const li = w.findAll("li");
    expect(li[0]!.find("div.rounded-card").exists()).toBe(true);
    const link = li[1]!.find("a");
    expect(link.attributes("href")).toBe("/docs");
    expect(li[1]!.classes()).toContain("@2xl:col-span-2");
    expect(link.find("svg").exists()).toBe(true);
  });

  it("mirrors the link arrow in Arabic and drops borders in plain", () => {
    const w = mount(NasaqProvider, { props: { locale: "ar" }, slots: { default: () => h(NqFeatureGrid, { features, variant: "plain", columns: 2 }) } });
    expect(w.find("a svg").classes()).toContain("-scale-x-100");
    expect(w.find("li div").classes()).not.toContain("border");
    expect(w.find("ul").classes()).toContain("@2xl:grid-cols-2");
  });
});

describe("NqCtaBanner", () => {
  it("brand tone sits on an aurora and the slots land", () => {
    const w = mount(NqCtaBanner, { props: { title: "Ready?", description: "Go", note: "No card" }, slots: { action: "<button>Start</button>", "secondary-action": "<a>Talk</a>" } });
    expect(w.attributes("data-slot")).toBe("cta-banner");
    expect(w.classes()).toContain("bg-nq-selected");
    expect(w.find('[data-slot="aurora-background"]').exists()).toBe(true);
    expect(w.attributes("aria-labelledby")).toBe(w.find("h2").attributes("id"));
    expect(w.text()).toContain("Start");
    expect(w.text()).toContain("Talk");
    expect(w.text()).toContain("No card");
  });

  it("neutral tone has no aurora; split puts the buttons at the end", () => {
    const w = mount(NqCtaBanner, { props: { title: "T", tone: "neutral", layout: "split" } });
    expect(w.find('[data-slot="aurora-background"]').exists()).toBe(false);
    expect(w.classes()).toContain("bg-nq-surface-soft");
    expect(w.find(".relative.flex").classes()).toContain("@2xl:justify-between");
  });
});

describe("NqPricingPacks", () => {
  const packs = [
    { id: "s", name: "Starter", credits: 500, price: 10 },
    { id: "p", name: "Pro", credits: 2500, bonus: 500, price: 30, highlighted: true, badge: "Best" },
  ];
  it("shows credits, bonus, price and unit price in USD", () => {
    const w = mount(NqPricingPacks, { props: { title: "Top up", packs } });
    expect(w.attributes("data-slot")).toBe("pricing-packs");
    const cards = w.findAll("article");
    expect(cards).toHaveLength(2);
    expect(cards[0]!.text()).toContain("500");
    expect(cards[0]!.text()).toContain("$10");
    expect(cards[0]!.text()).toContain("$0.02");
    expect(cards[1]!.classes()).toContain("bg-nq-selected");
    expect(cards[1]!.text()).toContain("+500");
    expect(cards[1]!.text()).toContain("Best");
    expect(w.find("ul").attributes("style")).toContain("--packs: 2");
  });

  it("uses SAR and Arabic labels in Arabic", () => {
    const w = mount(NasaqProvider, { props: { locale: "ar" }, slots: { default: () => h(NqPricingPacks, { packs }) } });
    const text = w.find("article").text();
    expect(text).toMatch(/SAR|ر\.س/);
    expect(text).toContain("شراء");
    expect(text).toContain("رصيد");
  });

  it("buy shows loading until the purchase settles and blocks the others", async () => {
    let done: () => void = () => {};
    const onPurchase = vi.fn(() => new Promise<void>((r) => (done = r)));
    const w = mount(NqPricingPacks, { props: { packs, onPurchase } });
    const buttons = w.findAll("button");
    await buttons[0]!.trigger("click");
    expect(onPurchase).toHaveBeenCalledWith(packs[0]);
    expect(buttons[0]!.attributes("aria-busy")).toBe("true");
    expect(buttons[1]!.attributes("disabled")).toBeDefined();
    done();
    await new Promise((r) => setTimeout(r, 0));
    await nextTick();
    expect(buttons[0]!.attributes("aria-busy")).toBeUndefined();
  });
});

describe("NqAppMockupHero", () => {
  it("renders the h1, actions, proof and a labelled frame", () => {
    const w = mount(NqAppMockupHero, { props: { title: "Book", description: "d", mockupLabel: "The map", frameTitle: "app.example.com" }, slots: { actions: "<button>Go</button>", proof: "Free", mockup: "<i>pic</i>" } });
    expect(w.attributes("data-slot")).toBe("app-mockup-hero");
    expect(w.find("h1").text()).toBe("Book");
    expect(w.find('[data-slot="aurora-background"]').exists()).toBe(true);
    expect(w.find('[data-slot="screenshot-frame"]').attributes("data-variant")).toBe("browser");
    expect(w.find('[role="img"]').attributes("aria-label")).toBe("The map");
    expect(w.text()).toContain("Free");
    expect(w.text()).toContain("app.example.com");
  });

  it("grid and none backgrounds", () => {
    expect(mount(NqAppMockupHero, { props: { title: "t", background: "grid" } }).find('[data-slot="grid-background"]').exists()).toBe(true);
    const none = mount(NqAppMockupHero, { props: { title: "t", background: "none" } });
    expect(none.find('[data-slot="aurora-background"]').exists()).toBe(false);
    expect(none.find('[data-slot="grid-background"]').exists()).toBe(false);
  });
});

describe("NqSessionPlayback", () => {
  const events = [
    { role: "user", text: "Hello there" },
    { role: "tool", title: "Read", text: "file" },
    { role: "assistant", text: "One two three" },
  ] as const;

  it("starts empty, with a labelled log, play button and scrubber", () => {
    const w = mount(NqSessionPlayback, { props: { events: [...events], autoPlay: false } });
    expect(w.attributes("data-slot")).toBe("session-playback");
    expect(w.find("[role=log]").attributes("aria-label")).toBe("AI session");
    expect(w.find("[role=log]").attributes("style")).toContain("height: 22rem");
    expect(w.find("[role=log]").text()).not.toContain("One");
    expect(w.find('[data-slot="button"]').attributes("aria-label")).toBe("Play");
    expect(w.find('[data-slot="slider"]').attributes("aria-label")).toBe("Playback position");
    expect(w.find("span[dir=ltr].tabular-nums").text()).toMatch(/^0:00 \/ 0:0\d$/);
  });

  it("shows the whole session under reduced motion and does not autoplay", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduce"), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
    const w = mount(NqSessionPlayback, { props: { events: [...events] } });
    await nextTick();
    expect(w.find("[role=log]").text()).toContain("Hello there");
    expect(w.find("[role=log]").text()).toContain("One two three");
    expect(w.find('[data-slot="button"]').attributes("aria-label")).toBe("Replay");
    expect(w.find('[role="slider"]').attributes("aria-valuenow")).toBe("100");
  });

  it("types words as time passes and ends", async () => {
    vi.useFakeTimers();
    let now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    vi.stubGlobal("requestAnimationFrame", (cb: (t: number) => void) => setTimeout(() => ((now += 100), cb(now)), 100) as unknown as number);
    vi.stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id));
    const w = mount(NqSessionPlayback, { props: { events: [...events], autoPlay: false } });
    await w.find('[data-slot="button"]').trigger("click");
    expect(w.find('[data-slot="button"]').attributes("aria-label")).toBe("Pause");
    await vi.advanceTimersByTimeAsync(300);
    expect(w.find("[role=log]").text()).toContain("Hello");
    await vi.advanceTimersByTimeAsync(20000);
    expect(w.find("[role=log]").text()).toContain("One two three");
    expect(w.emitted("end")).toBeTruthy();
    expect(w.find('[data-slot="button"]').attributes("aria-label")).toBe("Replay");
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("timeline helpers", () => {
    expect(sessionTimeline([...events]).total).toBeGreaterThan(0);
    expect(formatSessionClock(7000)).toBe("0:07");
  });
});
