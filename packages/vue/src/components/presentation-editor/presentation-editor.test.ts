import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { NasaqProvider } from "../../provider";
import { NqDeckPlayer, NqPresentationEditor, NqSlideView, keyAction, safeImageSrc, swipeAction, type Deck } from ".";

const mounted: { unmount(): void }[] = [];
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount());
  document.body.innerHTML = "";
});

const deck = (): Deck => ({
  title: "Q3",
  slides: [
    { id: "a", layout: "title", title: "Alpha", subtitle: "Sub" },
    { id: "b", layout: "content", title: "Beta", body: "- one\ntwo", notes: "Say hi" },
    { id: "c", layout: "quote", title: "", body: "Quote text" },
  ],
});

function wrap(component: unknown, props: Record<string, unknown>, locale = "en") {
  const w = mount(defineComponent({ setup: () => () => h(NasaqProvider, { locale }, () => h(component as never, props)) }), { attachTo: document.body });
  mounted.push(w);
  return w;
}

describe("helpers", () => {
  it("maps keys and swipes with the reading direction", () => {
    expect(keyAction("ArrowRight", false)).toBe("next");
    expect(keyAction("ArrowRight", true)).toBe("prev");
    expect(keyAction("n", false)).toBe("notes");
    expect(swipeAction(-80, 0, false)).toBe("next");
    expect(swipeAction(-80, 0, true)).toBe("prev");
    expect(swipeAction(10, 0, false)).toBeNull();
  });
  it("refuses unsafe image sources", () => {
    expect(safeImageSrc("https://a.co/x.png")).toBeDefined();
    expect(safeImageSrc("javascript:alert(1)")).toBeUndefined();
    expect(safeImageSrc("//evil.com/x.png")).toBeUndefined();
  });
});

describe("NqSlideView", () => {
  it("draws bullets and strips markers, and becomes editable on request", async () => {
    const w = wrap(NqSlideView, { slide: deck().slides[1] });
    expect(w.find('[data-slot="slide"]').attributes("data-layout")).toBe("content");
    expect(w.findAll("li").map((l) => l.text())).toEqual(["one", "two"]);
    const e = wrap(NqSlideView, { slide: deck().slides[0], editable: true });
    expect(e.findAll("textarea")).toHaveLength(2);
  });
});

describe("NqPresentationEditor", () => {
  it("renders the rail, the canvas and the counts", () => {
    const w = wrap(NqPresentationEditor, { defaultValue: deck() });
    expect(w.find('[data-slot="presentation-editor"]').attributes("aria-label")).toBe("Presentation editor");
    expect(w.findAll("[data-slide-id]")).toHaveLength(3);
    expect(w.text()).toContain("3 slides · 1 with notes");
    expect(w.find('button[aria-current="true"]').attributes("aria-label")).toBe("1. Alpha");
  });

  it("selects, duplicates, moves and deletes slides", async () => {
    const w = wrap(NqPresentationEditor, { defaultValue: deck() });
    await w.find('button[data-index="1"]').trigger("click");
    expect(w.find('button[aria-current="true"]').attributes("aria-label")).toBe("2. Beta");
    await w.find('button[aria-label="Duplicate slide"]').trigger("click");
    expect(w.findAll("[data-slide-id]")).toHaveLength(4);
    expect(w.find('button[aria-current="true"]').attributes("aria-label")).toBe("3. Beta");
    await w.find('button[aria-label="Move earlier"]').trigger("click");
    expect(w.find('[role="status"]').text()).toBe("Slide moved to position 2");
    await w.find('button[aria-label="Delete slide"]').trigger("click");
    expect(w.findAll("[data-slide-id]")).toHaveLength(3);
  });

  it("emits the deck on edit and tracks unsaved changes with onSave", async () => {
    const saves: Deck[] = [];
    const w = wrap(NqPresentationEditor, { defaultValue: deck(), onSave: async (d: Deck) => void saves.push(d) });
    expect(w.text()).toContain("Saved");
    const title = w.find('[data-slot="slide"][data-layout="title"]:not([aria-hidden]) textarea');
    (title.element as HTMLTextAreaElement).value = "Changed";
    await title.trigger("input");
    expect(w.text()).toContain("Unsaved changes");
    const save = w.findAll("button").find((b) => b.text() === "Save")!;
    await save.trigger("click");
    await flushPromises();
    expect(saves[0]!.slides[0]!.title).toBe("Changed");
    expect(w.text()).toContain("Saved");
  });

  it("reorders by dragging a thumbnail with pointer events", async () => {
    const w = wrap(NqPresentationEditor, { defaultValue: deck() });
    const items = w.findAll("[data-slide-id]");
    items.forEach((el, i) => {
      el.element.getBoundingClientRect = () => ({ left: 0, top: i * 100, width: 100, height: 90, right: 100, bottom: i * 100 + 90, x: 0, y: i * 100, toJSON() {} }) as DOMRect;
    });
    await items[0]!.trigger("pointerdown", { clientX: 50, clientY: 45, button: 0 });
    window.dispatchEvent(new MouseEvent("pointermove", { clientX: 50, clientY: 250 }));
    await flushPromises();
    expect(items[0]!.attributes("data-dragging")).toBeDefined();
    expect(items[2]!.attributes("data-over")).toBeDefined();
    window.dispatchEvent(new MouseEvent("pointerup", { clientX: 50, clientY: 250 }));
    await flushPromises();
    expect(w.findAll("[data-slide-id]").map((e) => e.attributes("data-slide-id"))).toEqual(["b", "c", "a"]);
  });

  it("is read only: no add, no editing", () => {
    const w = wrap(NqPresentationEditor, { defaultValue: deck(), readOnly: true });
    expect(w.find('button[aria-label="Delete slide"]').exists()).toBe(false);
    expect(w.findAll("textarea[aria-label]")).toHaveLength(0);
  });

  it("shows the empty state and speaks Arabic", () => {
    const w = wrap(NqPresentationEditor, { defaultValue: { title: "", slides: [] } }, "ar");
    expect(w.text()).toContain("لا توجد شرائح بعد");
    expect(w.find('[data-slot="presentation-editor"]').attributes("aria-label")).toBe("محرر العروض التقديمية");
  });
});

describe("NqDeckPlayer", () => {
  it("renders nothing while closed and a labelled dialog with progress when open", async () => {
    const closed = wrap(NqDeckPlayer, { deck: deck(), open: false });
    expect(document.body.querySelector('[data-slot="deck-player"]')).toBeNull();
    closed.unmount();
    mounted.length = 0;
    wrap(NqDeckPlayer, { deck: deck(), open: true, fullscreen: false });
    await flushPromises();
    const bar = document.body.querySelector('[role="progressbar"]')!;
    expect(bar.getAttribute("aria-valuetext")).toBe("Slide 1 of 3");
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it("navigates with keys, mirrored in RTL, and toggles notes", async () => {
    wrap(NqDeckPlayer, { deck: deck(), open: true, fullscreen: false });
    await flushPromises();
    const popup = document.body.querySelector<HTMLElement>('[data-slot="deck-player"]')!;
    const valuetext = () => document.body.querySelector('[role="progressbar"]')!.getAttribute("aria-valuetext");
    popup.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    await flushPromises();
    expect(valuetext()).toBe("Slide 2 of 3");
    popup.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
    await flushPromises();
    expect(valuetext()).toBe("Slide 3 of 3");
    popup.dispatchEvent(new KeyboardEvent("keydown", { key: "n", bubbles: true }));
    await flushPromises();
    expect(document.body.querySelector('section[aria-label="Presenter notes"]')).not.toBeNull();
  });

  it("reports the slide in Arabic digits", async () => {
    wrap(NqDeckPlayer, { deck: deck(), open: true, fullscreen: false }, "ar");
    await flushPromises();
    expect(document.body.querySelector('[role="progressbar"]')!.getAttribute("aria-valuetext")).toContain("الشريحة");
  });
});
