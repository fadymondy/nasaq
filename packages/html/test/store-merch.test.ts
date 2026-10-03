// The rendered Blade example (hero, tiles, flash deals, recently viewed) under real Alpine, with a fake clock for the countdown.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const HOUR = 3_600_000;

beforeAll(() => {
  Alpine.plugin(nasaq);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).Alpine = Alpine;
  Alpine.start();
});

afterEach(() => {
  vi.useRealTimers();
  for (const el of [...document.body.children]) {
    Alpine.destroyTree(el as HTMLElement);
    el.remove();
  }
});

/** The first deal ends 5 hours after the example was rendered; start the fake clock at that render time. */
async function mountAtRender() {
  const html = rendered("store-merch");
  const ends = Number(html.match(/\\u0022id\\u0022:\\u0022d1\\u0022,\\u0022endsAt\\u0022:(\d+)/)![1]);
  vi.useFakeTimers({ now: ends - 5 * HOUR });
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  Alpine.initTree(host);
  await vi.advanceTimersByTimeAsync(50);
  return { host, ends };
}

describe("store-merch (Blade example)", () => {
  it("renders the hero carousel, the category tiles and the recently viewed row", async () => {
    const { host } = await mountAtRender();
    const hero = host.querySelector('[data-slot="store-hero-banner"]')!;
    expect(hero.querySelectorAll('[data-slot="carousel-item"]')).toHaveLength(2);
    expect(hero.textContent).toContain("Summer collection");
    const tiles = [...host.querySelectorAll<HTMLAnchorElement>('[data-slot="store-category-tiles"] a')];
    expect(tiles.map((a) => a.getAttribute("data-id"))).toEqual(["tops", "bottoms", "accessories"]);
    expect(host.querySelector("#store-cats-h")!.textContent).toBe("Shop by category");
    const recent = host.querySelector('[data-slot="store-product-carousel"]')!;
    expect(recent.getAttribute("aria-labelledby")).toBe("store-car-Recently-viewed");
    expect(recent.querySelectorAll('[data-slot="store-product-card"]')).toHaveLength(3);
  });

  it("shows the time left on the soonest deal and ticks every second", async () => {
    const { host } = await mountAtRender();
    const deals = host.querySelector<HTMLElement>('[data-slot="store-flash-deals"]')!;
    expect(deals.querySelectorAll("[data-deal-id]")).toHaveLength(2);
    const timer = deals.querySelector<HTMLElement>('[data-slot="store-countdown"]')!;
    const digits = () => [...timer.querySelectorAll('[class*="tabular-nums"]')].slice(1).map((e) => e.textContent);
    expect(digits()).toEqual(["05", "00", "00"]);
    expect(timer.getAttribute("aria-label")).toBe("Time left: 05 hours 00 minutes");
    await vi.advanceTimersByTimeAsync(1000);
    expect(digits()).toEqual(["04", "59", "59"]);
    expect(timer.getAttribute("aria-label")).toBe("Time left: 04 hours 59 minutes");
    await vi.advanceTimersByTimeAsync(60_000);
    expect(timer.getAttribute("aria-label")).toBe("Time left: 04 hours 58 minutes");
  });

  it("drops an ended deal, then the whole strip, and fires nq-expire once", async () => {
    const { host, ends } = await mountAtRender();
    const deals = host.querySelector<HTMLElement>('[data-slot="store-flash-deals"]')!;
    let expired = 0;
    deals.addEventListener("nq-expire", () => expired++);
    vi.setSystemTime(ends + 1000);
    await vi.advanceTimersByTimeAsync(1000);
    expect([...deals.querySelectorAll("[data-deal-id]")].map((e) => e.getAttribute("data-deal-id"))).toEqual(["d2"]);
    expect(deals.querySelector('[data-slot="store-countdown"]')!.querySelectorAll('[class*="tabular-nums"]')[1]!.textContent).toBe("03");
    expect(expired).toBe(0);
    vi.setSystemTime(ends + 4 * HOUR + 1000);
    await vi.advanceTimersByTimeAsync(1000);
    expect(deals.querySelectorAll("[data-deal-id]")).toHaveLength(0);
    expect(deals.style.display).toBe("none");
    expect(expired).toBe(1);
    await vi.advanceTimersByTimeAsync(5000);
    expect(expired).toBe(1);
  });
});

describe("nqStoreCountdown", () => {
  it("counts down, shows the ended message at zero and fires nq-expire once", async () => {
    vi.useFakeTimers({ now: 1_000_000 });
    const host = document.createElement("div");
    host.innerHTML = `
      <span x-data="nqStoreCountdown({ endsAt: ${1_000_000 + 90_061_000} })" class="contents">
        <div role="timer" x-show="!done"><span x-show="showDays" id="d" x-text="d"></span><span id="h" x-text="h"></span><span id="m" x-text="m"></span><span id="s" x-text="s"></span></div>
        <span id="ended" x-show="done" style="display: none">ended</span>
      </span>`;
    document.body.append(host);
    let expired = 0;
    host.addEventListener("nq-expire", () => expired++);
    Alpine.initTree(host);
    await vi.advanceTimersByTimeAsync(10);
    const text = (id: string) => host.querySelector(`#${id}`)!.textContent;
    expect([text("d"), text("h"), text("m"), text("s")]).toEqual(["1", "01", "01", "01"]);
    vi.setSystemTime(1_000_000 + 90_062_000);
    await vi.advanceTimersByTimeAsync(1000);
    expect(expired).toBe(1);
    expect(host.querySelector<HTMLElement>("#ended")!.style.display).not.toBe("none");
    expect(host.querySelector<HTMLElement>('[role="timer"]')!.style.display).toBe("none");
    await vi.advanceTimersByTimeAsync(5000);
    expect(expired).toBe(1);
  });

  it("stays put with a fixed now", async () => {
    vi.useFakeTimers({ now: 5_000_000 });
    const host = document.createElement("div");
    host.innerHTML = `<span x-data="nqStoreCountdown({ endsAt: 3665000, now: 1000 })"><i id="t" x-text="h + ':' + m + ':' + s"></i></span>`;
    document.body.append(host);
    Alpine.initTree(host);
    await vi.advanceTimersByTimeAsync(3000);
    expect(host.querySelector("#t")!.textContent).toBe("01:01:04");
  });
});
