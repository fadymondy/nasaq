// The Blade install-prompt example under real Alpine: the install dialog (every platform path) and the per-device push opt-in.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import nasaq from "../src/alpine";
import { detectInstallPlatform, nextAskAt, shouldAsk } from "../src/alpine/install-prompt-logic";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = () => new Promise((r) => setTimeout(r, 30));

// happy-dom answers getAttribute / hasAttribute from a stale cache after Alpine rebinds an attribute; the live attribute list is right.
const live = (el: Element, name: string) => [...el.attributes].find((a) => a.name === name);
Element.prototype.getAttribute = function (this: Element, name: string) {
  return live(this, name)?.value ?? null;
};
Element.prototype.hasAttribute = function (this: Element, name: string) {
  return live(this, name) !== undefined;
};

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
  host.innerHTML = rendered("install-prompt");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const hidden = (el: Element | null) => !el || getComputedStyle(el).display === "none";
const dialogs = () => [...document.querySelectorAll<HTMLElement>('[data-slot="install-prompt"]')];
const dialog = (platform: string) => dialogs().find((d) => d.getAttribute("data-platform") === platform)!;
const byText = (root: ParentNode, text: string) => [...root.querySelectorAll<HTMLElement>("button")].find((b) => b.textContent?.trim() === text)!;
const open = async (host: HTMLElement, label: string) => {
  byText(host, label).click();
  await tick();
};
const push = (host: HTMLElement, n: number) => host.querySelectorAll<HTMLElement>('[data-slot="push-opt-in"]')[n]!;

describe("helpers", () => {
  it("detects the path and the snooze", () => {
    expect(detectInstallPlatform("Mozilla/5.0 (iPhone)", false)).toBe("ios");
    expect(detectInstallPlatform("Mozilla/5.0 (iPhone)", true)).toBe("installed");
    expect(detectInstallPlatform("Chrome", false, true)).toBe("prompt");
    expect(detectInstallPlatform("Firefox", false)).toBe("unsupported");
    expect(nextAskAt(0, 1)).toBe(86_400_000);
    expect(shouldAsk(5, 10)).toBe(false);
    expect(shouldAsk(10, 10)).toBe(true);
    expect(shouldAsk(1, null)).toBe(true);
  });
});

describe("install dialog (Blade example)", () => {
  it("is closed until opened, then shows the benefits", async () => {
    const host = await mount();
    expect(dialogs().every(hidden)).toBe(true);
    await open(host, "Install the app");
    const d = dialog("prompt") ?? dialogs()[0];
    expect(hidden(d)).toBe(false);
    expect(d.textContent).toContain("Install Nasaq Courier");
    expect(d.querySelectorAll("ul li")).toHaveLength(3);
    expect(d.textContent).toContain("Keeps working when the connection drops");
    expect(byText(d, "Install")).toBeTruthy();
  });

  it("shows the iPhone steps and no Install button", async () => {
    const host = await mount();
    await open(host, "iPhone steps");
    const d = dialog("ios");
    expect(hidden(d)).toBe(false);
    expect(d.querySelectorAll("ol li")).toHaveLength(2);
    expect(d.textContent).toContain("Tap the Share button in the toolbar");
    expect(hidden(byText(d, "Install"))).toBe(true);
    expect(hidden(byText(d, "Done"))).toBe(false);
  });

  it("shows the installed confirmation with only Done", async () => {
    const host = await mount();
    await open(host, "Installed");
    const d = dialog("installed");
    expect(d.textContent).toContain("Nasaq Courier is installed");
    expect(hidden(byText(d, "Not now"))).toBe(true);
    byText(d, "Done").click();
    await tick();
    expect(hidden(d)).toBe(true);
  });

  it("Not now reports when to ask again and closes", async () => {
    const host = await mount();
    const seen = vi.fn();
    host.addEventListener("nq-install-dismiss", seen);
    await open(host, "Install the app");
    const d = dialogs().find((x) => !hidden(x))!;
    const before = Date.now();
    byText(d, "Not now").click();
    await tick();
    expect(seen).toHaveBeenCalledTimes(1);
    const next = (seen.mock.calls[0]![0] as CustomEvent).detail.nextAskAt as number;
    expect(next).toBeGreaterThanOrEqual(before + 14 * 86_400_000);
    expect(hidden(d)).toBe(true);
  });

  it("opens the browser prompt on Install and turns installed when accepted", async () => {
    const host = await mount();
    const prompt = vi.fn(() => Promise.resolve());
    const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), { prompt, userChoice: Promise.resolve({ outcome: "accepted" as const }) });
    window.dispatchEvent(event);
    await tick();
    expect(event.defaultPrevented).toBe(true);
    const installed = vi.fn();
    host.addEventListener("nq-install", installed);
    await open(host, "Install the app");
    const d = dialogs().find((x) => !hidden(x))!;
    expect(d.getAttribute("data-platform")).toBe("prompt");
    byText(d, "Install").click();
    await tick();
    expect(prompt).toHaveBeenCalledTimes(1);
    expect((installed.mock.calls[0]![0] as CustomEvent).detail.outcome).toBe("accepted");
    expect(d.getAttribute("data-platform")).toBe("installed");
    expect(d.textContent).toContain("is installed");
  });

  it("follows appinstalled and closes with Escape", async () => {
    const host = await mount();
    await open(host, "Install the app");
    const d = dialogs().find((x) => !hidden(x))!;
    window.dispatchEvent(new Event("appinstalled"));
    await tick();
    expect(d.getAttribute("data-platform")).toBe("installed");
    d.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await tick();
    expect(hidden(d)).toBe(true);
  });
});

describe("push opt-in (Blade example)", () => {
  it("lists the devices with the This device tag and a remove button for the others", async () => {
    const host = await mount();
    const p = push(host, 0);
    expect(p.textContent).toContain("Notifications on this device");
    expect(p.textContent).toContain("Pixel 9");
    expect(p.textContent).toContain("This device");
    expect(p.querySelectorAll("ul li")).toHaveLength(3);
    expect(p.querySelectorAll('button[aria-label^="Remove"]')).toHaveLength(2);
    expect(p.querySelector('[role="switch"]')!.getAttribute("aria-checked")).toBe("true");
    expect(p.textContent).toContain("This device will get notifications.");
    expect(p.textContent).toContain("Send a test");
    expect(hidden(p.querySelector('[data-slot="desktop-notification-permission"]')!.parentElement)).toBe(true);
  });

  it("reports the switch, and puts it back with the error when saving fails", async () => {
    const host = await mount();
    const p = push(host, 0);
    const sw = p.querySelector<HTMLElement>('[role="switch"]')!;
    const seen = vi.fn((e: Event) => (e as CustomEvent).detail.reject("Offline"));
    host.addEventListener("nq-push-subscribe", seen);
    sw.click();
    await tick();
    expect(seen).toHaveBeenCalledTimes(1);
    expect((seen.mock.calls[0]![0] as CustomEvent).detail.subscribed).toBe(false);
    expect(p.textContent).toContain("Offline");
    expect(sw.getAttribute("aria-checked")).toBe("true");
    expect(p.textContent).toContain("This device will get notifications.");
  });

  it("turns off when nobody objects", async () => {
    const host = await mount();
    const p = push(host, 0);
    const sw = p.querySelector<HTMLElement>('[role="switch"]')!;
    sw.click();
    await tick();
    expect(sw.getAttribute("aria-checked")).toBe("false");
    expect(p.textContent).toContain("This device will not get notifications.");
    expect(hidden(byText(p, "Send a test").parentElement)).toBe(true);
  });

  it("removes another device and sends a test", async () => {
    const host = await mount();
    const p = push(host, 0);
    const removed = vi.fn((e: Event) => (e as CustomEvent).detail.waitUntil(Promise.resolve()));
    const tested = vi.fn();
    host.addEventListener("nq-push-remove", removed);
    host.addEventListener("nq-push-test", tested);
    p.querySelector<HTMLElement>('button[aria-label="Remove Work laptop"]')!.click();
    await tick();
    expect((removed.mock.calls[0]![0] as CustomEvent).detail.id).toBe("d2");
    expect(hidden(p.querySelectorAll("ul li")[1] ?? null)).toBe(true);
    byText(p, "Send a test").click();
    expect(tested).toHaveBeenCalledTimes(1);
  });

  it("shows the soft ask and the install note before permission, then the switch once it is granted", async () => {
    const host = await mount();
    const p = push(host, 1);
    expect(p.textContent).toContain("install the app to your home screen first");
    expect(hidden(p.querySelector('[data-slot="desktop-notification-permission"]')!.parentElement)).toBe(false);
    expect(p.querySelector('[role="switch"]')!.closest('div[class*="flex-col"]')).not.toBeNull();
    window.dispatchEvent(new CustomEvent("nq-push-state", { detail: { permission: "granted" } }));
    await tick();
    expect(hidden(p.querySelector('[data-slot="desktop-notification-permission"]')!.parentElement)).toBe(true);
    expect(p.textContent).toContain("No other devices yet.");
    expect(p.querySelector('[role="switch"]')!.getAttribute("aria-checked")).toBe("false");
  });
});
