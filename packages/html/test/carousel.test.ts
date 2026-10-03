import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

beforeAll(() => {
  Alpine.plugin(nasaq);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).Alpine = Alpine;
  Alpine.start();
});

// happy-dom has no layout: three 100px slides in a 100px viewport.
const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
const saved: Record<string, PropertyDescriptor | undefined> = {};
beforeEach(() => {
  saved.rect = Object.getOwnPropertyDescriptor(proto, "getBoundingClientRect");
  proto.getBoundingClientRect = function (this: HTMLElement) {
    const slot = this.dataset.slot;
    const viewport = this.closest<HTMLElement>('[data-slot="carousel-viewport"]');
    const scroll = Math.abs(viewport?.scrollLeft ?? 0);
    const rtl = this.closest("[dir]")?.getAttribute("dir") === "rtl";
    if (slot === "carousel-viewport") return { left: 0, right: 100, width: 100, top: 0, bottom: 10, height: 10 } as DOMRect;
    if (slot === "carousel-item") {
      const i = [...this.parentElement!.children].indexOf(this);
      const left = rtl ? 100 - (i + 1) * 100 + scroll : i * 100 - scroll;
      return { left, right: left + 100, width: 100, top: 0, bottom: 10, height: 10 } as DOMRect;
    }
    return { left: 0, right: 0, width: 0, top: 0, bottom: 0, height: 0 } as DOMRect;
  };
  for (const [key, value] of [["clientWidth", 100], ["scrollWidth", 300]] as const) {
    saved[key] = Object.getOwnPropertyDescriptor(proto, key);
    Object.defineProperty(proto, key, {
      configurable: true,
      get(this: HTMLElement) {
        return this.dataset?.slot === "carousel-viewport" ? value : 0;
      },
    });
  }
});

afterEach(() => {
  for (const el of [...document.body.children]) {
    Alpine.destroyTree(el as HTMLElement);
    el.remove();
  }
  for (const key of ["clientWidth", "scrollWidth"]) {
    if (saved[key]) Object.defineProperty(proto, key, saved[key]!);
    else delete proto[key];
  }
  if (saved.rect) Object.defineProperty(proto, "getBoundingClientRect", saved.rect);
});

async function mount(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

describe("carousel (Blade example)", () => {
  it("labels the slides, draws one dot per snap and disables previous at the start", async () => {
    const host = await mount(rendered("carousel"));
    const items = [...host.querySelectorAll('[data-slot="carousel-item"]')];
    expect(items.map((i) => i.getAttribute("aria-label"))).toEqual(["Slide 1 of 3", "Slide 2 of 3", "Slide 3 of 3"]);
    const dots = [...host.querySelectorAll<HTMLElement>('[data-slot="carousel-dots"] button')];
    expect(dots).toHaveLength(3);
    expect(dots[0]!.getAttribute("aria-current")).toBe("true");
    expect(dots[0]!.className).toContain("bg-primary");
    expect(dots[1]!.getAttribute("aria-label")).toBe("Go to slide 2");
    expect(dots[1]!.className).toContain("bg-nq-line-strong");
    expect(host.querySelector<HTMLElement>('[data-slot="carousel-dots"]')!.style.display).not.toBe("none");
    const prev = host.querySelector<HTMLElement>('[data-slot="carousel-previous"]')!;
    const next = host.querySelector<HTMLElement>('[data-slot="carousel-next"]')!;
    expect(prev.hasAttribute("disabled")).toBe(true);
    expect(prev.hasAttribute("data-disabled")).toBe(true);
    expect(next.hasAttribute("disabled")).toBe(false);
    expect(host.querySelector('[aria-live]')!.textContent).toBe("Slide 1 of 3");
  });

  it("next, a dot and the arrow keys scroll the viewport", async () => {
    const host = await mount(rendered("carousel"));
    const viewport = host.querySelector<HTMLElement>('[data-slot="carousel-viewport"]')!;
    const scrollTo = vi.fn();
    viewport.scrollTo = scrollTo as never;
    host.querySelector<HTMLElement>('[data-slot="carousel-next"]')!.click();
    expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ left: 100 }));
    host.querySelectorAll<HTMLElement>('[data-slot="carousel-dots"] button')[2]!.click();
    expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ left: 200 }));
    host.querySelector('[data-slot="carousel"]')!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(scrollTo).toHaveBeenCalledTimes(3);
  });

  it("follows scrolling: the selected dot, the live region and the enabled buttons update", async () => {
    const host = await mount(rendered("carousel"));
    const viewport = host.querySelector<HTMLElement>('[data-slot="carousel-viewport"]')!;
    viewport.scrollLeft = 100;
    viewport.dispatchEvent(new Event("scroll"));
    await tick(80);
    const dots = [...host.querySelectorAll('[data-slot="carousel-dots"] button')];
    expect(dots[1]!.getAttribute("aria-current")).toBe("true");
    expect(dots[0]!.hasAttribute("aria-current")).toBe(false);
    expect(host.querySelector("[aria-live]")!.textContent).toBe("Slide 2 of 3");
    expect(host.querySelector('[data-slot="carousel-previous"]')!.hasAttribute("disabled")).toBe(false);
    viewport.scrollLeft = 200;
    viewport.dispatchEvent(new Event("scroll"));
    await tick(80);
    expect(host.querySelector('[data-slot="carousel-next"]')!.hasAttribute("disabled")).toBe(true);
  });

  it("in RTL the arrows swap and the scroll is negative", async () => {
    const host = await mount(
      rendered("carousel").replace('dir="ltr"', 'dir="rtl"').replace('\\u0022rtl\\u0022:false', '\\u0022rtl\\u0022:true'),
    );
    const viewport = host.querySelector<HTMLElement>('[data-slot="carousel-viewport"]')!;
    const scrollTo = vi.fn();
    viewport.scrollTo = scrollTo as never;
    host.querySelector('[data-slot="carousel"]')!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ left: -100 }));
  });

  it("autoplay: the play/pause control shows and a touch stops it for good", async () => {
    const host = await mount(
      rendered("carousel").replace('\\u0022autoplay\\u0022:0', '\\u0022autoplay\\u0022:1000'),
    );
    const live = host.querySelector("[aria-live]")!;
    expect(live.getAttribute("aria-live")).toBe("off");
    host.querySelector('[data-slot="carousel"]')!.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    await tick();
    expect(live.getAttribute("aria-live")).toBe("polite");
  });
});
