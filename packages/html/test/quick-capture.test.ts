// The Blade quick-capture example (packages/php/examples/rendered/quick-capture.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import nasaq from "../src/alpine";
import { buildCapture, captureShortcutKeys, extractCaptureTags, matchesCaptureShortcut, parseCaptureShortcut } from "../src/alpine/quick-capture";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

beforeAll(() => {
  Alpine.plugin(nasaq);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).Alpine = Alpine;
  Alpine.start();
});

afterEach(() => {
  for (const el of [...document.body.children]) {
    Alpine.destroyTree(el as HTMLElement);
    el.remove();
  }
});

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("quick-capture");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const popup = () => document.querySelector<HTMLElement>('[data-slot="quick-capture"]')!;
const area = () => document.querySelector<HTMLTextAreaElement>('[data-slot="textarea"]')!;
const shortcut = () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "K", code: "KeyK", ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true }));
async function type(value: string) {
  area().value = value;
  area().dispatchEvent(new Event("input", { bubbles: true }));
  await tick();
}
const rootData = (host: HTMLElement) => Alpine.$data(host.querySelector<HTMLElement>("[x-data]")!) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

describe("quick-capture logic", () => {
  it("matches the shortcut by physical key and reads tags and links", () => {
    expect(parseCaptureShortcut("K")).toBeNull();
    const spec = parseCaptureShortcut("Mod+Shift+K");
    const ev = { key: "ل", code: "KeyK", ctrlKey: true, metaKey: false, altKey: false, shiftKey: true };
    expect(matchesCaptureShortcut(spec, ev, false)).toBe(true);
    expect(matchesCaptureShortcut(spec, { ...ev, ctrlKey: false, metaKey: true }, false)).toBe(false);
    expect(captureShortcutKeys(spec, false)).toEqual(["Ctrl", "Shift", "K"]);
    expect(extractCaptureTags("a #Idea #عمل #idea")).toEqual(["idea", "عمل"]);
    expect(buildCapture({ text: "https://x.dev/a", now: 0 })).toMatchObject({ kind: "link", url: "https://x.dev/a" });
  });
});

describe("quick-capture (Blade example)", () => {
  it("opens from the shortcut, labels itself and toggles closed", async () => {
    await mount();
    expect(popup().style.display).toBe("none");
    shortcut();
    await tick();
    expect(popup().style.display).toBe("");
    expect(popup().hasAttribute("data-open")).toBe(true);
    expect(popup().getAttribute("data-presentation")).toBe("dialog");
    expect(popup().getAttribute("role")).toBe("dialog");
    const title = popup().querySelector('[data-slot="dialog-title"]')!;
    expect(title.id).toBeTruthy();
    expect(popup().getAttribute("aria-labelledby")).toBe(title.id);
    expect(popup().textContent).toContain("Quick capture");
    shortcut();
    await tick();
    expect(popup().hasAttribute("data-open")).toBe(false);
  });

  it("closes on Escape and the close button", async () => {
    const host = await mount();
    rootData(host).show();
    await tick();
    popup().dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await tick();
    expect(popup().hasAttribute("data-open")).toBe(false);
    rootData(host).show();
    await tick();
    popup().querySelector<HTMLButtonElement>('[aria-label="Close"]')!.click();
    await tick();
    expect(popup().hasAttribute("data-open")).toBe(false);
    rootData(host).show();
    await tick();
    [...popup().querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.trim() === "Cancel")!.click();
    await tick();
    expect(popup().hasAttribute("data-open")).toBe(false);
  });

  it("shows typed and suggested tags, saves with Ctrl+Enter and closes", async () => {
    const host = await mount();
    const onCapture = vi.fn();
    rootData(host).onCapture = onCapture;
    const events: CustomEvent[] = [];
    host.addEventListener("capture", (e) => events.push(e as CustomEvent));
    shortcut();
    await tick();
    await type("Call Sam #urgent");
    const chips = [...popup().querySelectorAll('[data-slot="badge"]')].map((b) => b.textContent);
    expect(chips).toEqual(["#urgent"]);
    const toggles = popup().querySelectorAll<HTMLButtonElement>("button[aria-pressed]");
    expect(toggles).toHaveLength(2);
    toggles[0]!.click();
    await tick();
    expect(toggles[0]!.getAttribute("aria-pressed")).toBe("true");
    area().dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true, bubbles: true, cancelable: true }));
    await tick();
    expect(onCapture).toHaveBeenCalledTimes(1);
    expect(onCapture.mock.calls[0]![0]).toMatchObject({ kind: "note", text: "Call Sam #urgent", tags: ["idea", "urgent"] });
    expect(events[0]!.detail.text).toBe("Call Sam #urgent");
    expect(popup().hasAttribute("data-open")).toBe(false);
  });

  it("keeps the text and shows an alert when saving fails", async () => {
    const host = await mount();
    rootData(host).onCapture = () => ({ error: "Offline" });
    shortcut();
    await tick();
    await type("hello");
    expect(popup().querySelector<HTMLButtonElement>('[data-slot="button"].bg-primary')!.disabled).toBe(false);
    popup().querySelector<HTMLButtonElement>('[data-slot="button"].bg-primary')!.click();
    await tick();
    const alert = popup().querySelector<HTMLElement>('[role="alert"]')!;
    expect(alert.textContent).toBe("Offline");
    expect(alert.style.display).toBe("");
    expect(area().getAttribute("aria-describedby")).toBe(alert.id);
    expect(area().getAttribute("aria-invalid")).toBe("true");
    expect(area().value).toBe("hello");
    expect(popup().hasAttribute("data-open")).toBe(true);
    await type("hello again");
    expect(area().hasAttribute("aria-invalid")).toBe(false);
  });

  it("will not save an empty capture and stops listening after teardown", async () => {
    const host = await mount();
    const onCapture = vi.fn();
    rootData(host).onCapture = onCapture;
    shortcut();
    await tick();
    expect(popup().querySelector<HTMLButtonElement>('[data-slot="button"].bg-primary')!.disabled).toBe(true);
    await rootData(host).save();
    expect(onCapture).not.toHaveBeenCalled();
    expect(popup().querySelector('[role="alert"]')!.textContent).toBe("Type something to capture.");
    for (const el of [...document.body.children]) {
      Alpine.destroyTree(el as HTMLElement);
      el.remove();
    }
    shortcut();
    await tick();
    expect(document.querySelector('[data-slot="quick-capture"]')).toBeNull();
  });
});
