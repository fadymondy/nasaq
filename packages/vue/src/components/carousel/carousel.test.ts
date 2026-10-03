import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent } from "vue";
import { NqCarousel, NqCarouselContent, NqCarouselDots, NqCarouselItem, NqCarouselNext, NqCarouselPlayPause, NqCarouselPrevious } from ".";

const Demo = defineComponent({
  components: { NqCarousel, NqCarouselContent, NqCarouselDots, NqCarouselItem, NqCarouselNext, NqCarouselPlayPause, NqCarouselPrevious },
  props: { carousel: { type: Object, default: () => ({}) } },
  template: `<NqCarousel label="Gallery" v-bind="carousel">
    <NqCarouselContent><NqCarouselItem>One</NqCarouselItem><NqCarouselItem>Two</NqCarouselItem><NqCarouselItem>Three</NqCarouselItem></NqCarouselContent>
    <NqCarouselPrevious /><NqCarouselNext /><NqCarouselDots /><NqCarouselPlayPause />
  </NqCarousel>`,
});

// happy-dom has no layout: three 100px slides in a 100px viewport.
const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
const saved: Record<string, PropertyDescriptor | undefined> = {};
function stubLayout() {
  const rect = Object.getOwnPropertyDescriptor(proto, "getBoundingClientRect");
  saved.rect = rect;
  proto.getBoundingClientRect = function (this: HTMLElement) {
    const slot = this.dataset.slot;
    const viewport = this.closest<HTMLElement>('[data-slot="carousel-viewport"]');
    const scroll = Math.abs(viewport?.scrollLeft ?? 0);
    const dir = getComputedStyle(this).direction;
    const rtl = this.closest("[dir]")?.getAttribute("dir") === "rtl" || dir === "rtl";
    if (slot === "carousel-viewport") return { left: 0, right: 100, width: 100, top: 0, bottom: 10, height: 10 } as DOMRect;
    if (slot === "carousel-item") {
      const i = [...this.parentElement!.children].indexOf(this);
      const left = rtl ? 100 - (i + 1) * 100 + scroll : i * 100 - scroll;
      return { left, right: left + 100, width: 100, top: 0, bottom: 10, height: 10 } as DOMRect;
    }
    return { left: 0, right: 0, width: 0, top: 0, bottom: 0, height: 0 } as DOMRect;
  };
  for (const [key, value] of [
    ["clientWidth", 100],
    ["scrollWidth", 300],
  ] as const) {
    saved[key] = Object.getOwnPropertyDescriptor(proto, key);
    Object.defineProperty(proto, key, {
      configurable: true,
      get(this: HTMLElement) {
        return this.dataset?.slot === "carousel-viewport" ? value : 0;
      },
    });
  }
}
function unstubLayout() {
  for (const key of ["clientWidth", "scrollWidth"]) {
    if (saved[key]) Object.defineProperty(proto, key, saved[key]!);
    else delete proto[key];
  }
  if (saved.rect) Object.defineProperty(proto, "getBoundingClientRect", saved.rect);
}

beforeEach(stubLayout);
afterEach(unstubLayout);

describe("NqCarousel", () => {
  it("renders the React structure: region, slides labelled n of total, edge buttons", async () => {
    const w = mount(Demo, { attachTo: document.body });
    await flushPromises();
    const root = w.get('[data-slot="carousel"]');
    expect(root.attributes("role")).toBe("region");
    expect(root.attributes("aria-roledescription")).toBe("carousel");
    expect(root.attributes("aria-label")).toBe("Gallery");
    expect(root.classes()).toEqual(expect.arrayContaining(["relative", "rounded-card"]));
    const items = w.findAll('[data-slot="carousel-item"]');
    expect(items.map((i) => i.attributes("aria-label"))).toEqual(["Slide 1 of 3", "Slide 2 of 3", "Slide 3 of 3"]);
    expect(items[0]!.classes()).toEqual(expect.arrayContaining(["basis-full", "ps-4", "snap-start"]));
    expect(w.get('[data-slot="carousel-content"]').classes()).toContain("-ms-4");
    expect(w.get('[data-slot="carousel-previous"]').classes()).toContain("start-3");
    expect(w.get('[data-slot="carousel-next"]').classes()).toContain("end-3");
    expect(w.get('[data-slot="carousel-previous"]').attributes("aria-label")).toBe("Previous slide");
    w.unmount();
  });

  it("starts at the first slide: previous is disabled, next is enabled, one dot per snap", async () => {
    const w = mount(Demo, { attachTo: document.body });
    await flushPromises();
    expect(w.get('[data-slot="carousel-previous"]').attributes("data-disabled")).toBe("");
    expect(w.get('[data-slot="carousel-next"]').attributes("data-disabled")).toBeUndefined();
    const dots = w.findAll('[data-slot="carousel-dots"] button');
    expect(dots).toHaveLength(3);
    expect(dots[0]!.attributes("aria-current")).toBe("true");
    expect(dots[1]!.attributes("aria-current")).toBeUndefined();
    expect(dots[1]!.attributes("aria-label")).toBe("Go to slide 2");
    expect(w.get('[aria-live]').text()).toBe("Slide 1 of 3");
    w.unmount();
  });

  it("next scrolls the viewport to the next snap; the arrows follow the reading direction", async () => {
    const w = mount(Demo, { attachTo: document.body });
    await flushPromises();
    const viewport = w.get('[data-slot="carousel-viewport"]').element as HTMLElement;
    const scrollTo = vi.fn();
    viewport.scrollTo = scrollTo as never;
    await w.get('[data-slot="carousel-next"]').trigger("click");
    expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ left: 100 }));
    await w.get('[data-slot="carousel"]').trigger("keydown", { key: "ArrowRight" });
    expect(scrollTo).toHaveBeenCalledTimes(2);
    await w.get('[data-slot="carousel-dots"] button:nth-child(3)').trigger("click");
    expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ left: 200 }));
    w.unmount();
  });

  it("in RTL: dir is set, ArrowLeft goes to the next slide and scrolls negative", async () => {
    const w = mount(Demo, { props: { carousel: { dir: "rtl" } }, attachTo: document.body });
    await flushPromises();
    expect(w.get('[data-slot="carousel"]').attributes("dir")).toBe("rtl");
    const viewport = w.get('[data-slot="carousel-viewport"]').element as HTMLElement;
    const scrollTo = vi.fn();
    viewport.scrollTo = scrollTo as never;
    await w.get('[data-slot="carousel"]').trigger("keydown", { key: "ArrowLeft" });
    expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ left: -100 }));
    w.unmount();
  });

  it("localises the built-in labels in Arabic", async () => {
    const w = mount(Demo, { props: { carousel: { locale: "ar" } }, attachTo: document.body });
    await flushPromises();
    expect(w.get('[data-slot="carousel"]').attributes("dir")).toBe("rtl");
    expect(w.get('[data-slot="carousel-next"]').attributes("aria-label")).toBe("الشريحة التالية");
    expect(w.findAll('[data-slot="carousel-item"]')[1]!.attributes("aria-label")).toBe("الشريحة 2 من 3");
    w.unmount();
  });

  it("autoplay shows the play/pause control and stops for good on touch", async () => {
    const w = mount(Demo, { props: { carousel: { autoplay: 1000 } }, attachTo: document.body });
    await flushPromises();
    const button = w.get('[data-slot="carousel-play-pause"]');
    expect(button.attributes("aria-label")).toBe("Pause autoplay");
    expect(w.get("[aria-live]").attributes("aria-live")).toBe("off");
    await w.get('[data-slot="carousel"]').trigger("pointerdown");
    expect(w.get('[data-slot="carousel-play-pause"]').attributes("aria-label")).toBe("Start autoplay");
    expect(w.get("[aria-live]").attributes("aria-live")).toBe("polite");
    w.unmount();
  });

  it("has no play/pause control without autoplay", async () => {
    const w = mount(Demo, { attachTo: document.body });
    await flushPromises();
    expect(w.find('[data-slot="carousel-play-pause"]').exists()).toBe(false);
    w.unmount();
  });
});
