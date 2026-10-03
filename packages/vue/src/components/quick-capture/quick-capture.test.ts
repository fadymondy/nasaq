import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { h } from "vue";
import { NasaqProvider } from "../../provider";
import { NqQuickCapture, buildCapture, matchesCaptureShortcut, parseCaptureShortcut } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const q = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel);
const area = () => q<HTMLTextAreaElement>('[data-slot="textarea"]')!;
async function type(value: string) {
  area().value = value;
  area().dispatchEvent(new Event("input", { bubbles: true }));
  await flushPromises();
}
const press = (init: KeyboardEventInit, target: EventTarget = window) => target.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init }));

describe("quick-capture logic", () => {
  it("parses shortcuts and builds a capture", () => {
    expect(parseCaptureShortcut("K")).toBeNull();
    const spec = parseCaptureShortcut("Ctrl+Shift+K");
    expect(matchesCaptureShortcut(spec, { key: "k", code: "KeyK", ctrlKey: true, metaKey: false, altKey: false, shiftKey: true }, false)).toBe(true);
    const c = buildCapture({ text: "Buy milk #todo #Home", tags: ["idea"], now: 0 });
    expect(c).toMatchObject({ kind: "note", title: "Buy milk #todo #Home", tags: ["idea", "todo", "home"] });
  });
});

describe("NqQuickCapture", () => {
  it("opens from the shortcut into a labelled dialog and removes the listener on unmount", async () => {
    const w = mount(NqQuickCapture, { props: { onCapture: vi.fn(), shortcut: "Ctrl+Shift+K", suggestedTags: ["idea"] }, attachTo: document.body });
    expect(q('[data-slot="quick-capture"]')).toBeNull();
    press({ key: "k", code: "KeyK", ctrlKey: true, shiftKey: true });
    await flushPromises();
    const content = q('[data-slot="quick-capture"]')!;
    expect(content.getAttribute("data-presentation")).toBe("dialog");
    expect(content.getAttribute("role")).toBe("dialog");
    expect(content.className).toContain("max-w-xl");
    expect(content.getAttribute("aria-labelledby")).toBe(q('[data-slot="dialog-title"]')!.id);
    expect(content.textContent).toContain("Quick capture");
    expect(area().getAttribute("aria-label")).toBe("Quick capture");
    expect(content.querySelector('button[aria-pressed="false"]')!.textContent).toContain("#idea");
    w.unmount();
    await flushPromises();
    press({ key: "k", code: "KeyK", ctrlKey: true, shiftKey: true });
    await flushPromises();
    expect(q('[data-slot="quick-capture"]')).toBeNull();
  });

  it("saves with Ctrl+Enter, hands over tags and destination, and closes", async () => {
    const onCapture = vi.fn();
    const w = mount(NqQuickCapture, {
      props: { onCapture, defaultOpen: true, destinations: [{ id: "inbox", label: "Inbox" }, { id: "read", label: "Read later" }], suggestedTags: ["idea"] },
      attachTo: document.body,
    });
    await flushPromises();
    await type("Call Sam #urgent");
    q('button[aria-pressed]')!.click();
    q('[role="radio"]:nth-of-type(2)')?.click();
    await flushPromises();
    press({ key: "Enter", ctrlKey: true }, area());
    await flushPromises();
    expect(onCapture).toHaveBeenCalledTimes(1);
    expect(onCapture.mock.calls[0]![0]).toMatchObject({ kind: "note", text: "Call Sam #urgent", tags: ["idea", "urgent"], destinationId: "read" });
    await new Promise((r) => setTimeout(r, 250));
    expect(q('[data-slot="quick-capture"]')).toBeNull();
    w.unmount();
  });

  it("keeps the text and shows an alert when saving returns an error", async () => {
    const w = mount(NqQuickCapture, { props: { onCapture: () => ({ error: "Offline" }), defaultOpen: true }, attachTo: document.body });
    await flushPromises();
    await type("hello");
    press({ key: "Enter", metaKey: true }, area());
    await flushPromises();
    const alert = q('[role="alert"]')!;
    expect(alert.textContent).toBe("Offline");
    expect(area().getAttribute("aria-describedby")).toBe(alert.id);
    expect(area().value).toBe("hello");
    expect(q('[data-slot="quick-capture"]')).not.toBeNull();
    w.unmount();
  });

  it("panel clears after saving and shows the clipped page", async () => {
    const onCapture = vi.fn();
    const w = mount(NqQuickCapture, {
      props: { onCapture, presentation: "panel", page: { title: "Docs", url: "https://x.dev/a", selection: "quote" }, destinations: [{ id: "inbox", label: "Inbox" }, { id: "read", label: "Read" }] },
      attachTo: document.body,
    });
    expect(w.attributes("data-presentation")).toBe("panel");
    expect(w.find('[data-slot="quick-capture-page"]').text()).toContain("https://x.dev/a");
    // a clip can be saved with no note
    await w.findAll("button").find((b) => b.text() === "Save")!.trigger("click");
    await flushPromises();
    expect(onCapture.mock.calls[0]![0]).toMatchObject({ kind: "clip", url: "https://x.dev/a", pageTitle: "Docs", selection: "quote" });
    expect(w.find('[role="status"]').text()).toBe("Saved to Inbox.");
    w.unmount();
  });

  it("is Arabic under an Arabic provider", async () => {
    const w = mount({ render: () => h(NasaqProvider, { defaultLocale: "ar", target: "scope" }, () => h(NqQuickCapture, { onCapture: vi.fn(), presentation: "panel" })) }, { attachTo: document.body });
    await flushPromises();
    expect(w.text()).toContain("التقاط سريع");
    expect(w.text()).toContain("حفظ");
    w.unmount();
  });
});
