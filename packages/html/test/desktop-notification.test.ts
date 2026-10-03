// The rendered Blade example (card, permission prompt, stack) mounted under real Alpine, plus the dismiss clock on a short timer.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

beforeAll(() => {
  Alpine.plugin(nasaq);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).Alpine = Alpine;
  Alpine.start();
});

afterEach(() => {
  vi.unstubAllGlobals();
  for (const el of [...document.body.children]) {
    Alpine.destroyTree(el as HTMLElement);
    el.remove();
  }
});

async function mountHtml(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

describe("desktop-notification card (Blade example)", () => {
  it("renders the Windows card and dispatches nq-action, then removes itself on close", async () => {
    const host = await mountHtml(rendered("desktop-notification"));
    const card = host.querySelector<HTMLElement>('[data-slot="desktop-notification"][data-platform="windows"]')!;
    expect(card.getAttribute("role")).toBe("alert");
    expect(card.querySelector('[role="group"]')!.getAttribute("aria-label")).toBe("Nasaq");
    const seen: string[] = [];
    host.addEventListener("nq-action", (e) => seen.push((e as CustomEvent).detail.id));
    host.addEventListener("nq-close", () => seen.push("close"));
    [...card.querySelectorAll<HTMLButtonElement>('[role="group"] button')].find((b) => b.textContent!.trim() === "Open")!.click();
    expect(seen).toEqual(["open"]);
    card.querySelector<HTMLButtonElement>('button[aria-label="Close"]')!.click();
    await tick();
    expect(seen).toEqual(["open", "close"]);
    expect(host.contains(card)).toBe(false);
  });

  it("keeps the card when nq-close is prevented, and the body button is disabled unless activatable", async () => {
    const host = await mountHtml(rendered("desktop-notification"));
    host.addEventListener("nq-close", (e) => e.preventDefault());
    const card = host.querySelector<HTMLElement>('[data-platform="windows"]')!;
    card.querySelector<HTMLButtonElement>('button[aria-label="Close"]')!.click();
    await tick();
    expect(host.contains(card)).toBe(true);
    expect(card.querySelector<HTMLButtonElement>("button[disabled]")).not.toBeNull();
  });

  it("closes after dismissAfter and pauses while hovered", async () => {
    const host = await mountHtml(`<div x-data="nqDesktopNotification(120)" x-on:mouseenter="pause()" x-on:mouseleave="resume()" id="card"><button x-on:click="close()">x</button></div>`);
    const card = host.querySelector<HTMLElement>("#card")!;
    let closed = 0;
    host.addEventListener("nq-close", () => closed++);
    card.dispatchEvent(new Event("mouseenter"));
    await tick(250);
    expect(closed).toBe(0);
    card.dispatchEvent(new Event("mouseleave"));
    await tick(60);
    expect(closed).toBe(0);
    await tick(150);
    expect(closed).toBe(1);
    expect(host.contains(card)).toBe(false);
  });
});

describe("desktop-notification stack (Blade example)", () => {
  it("shows the newest first and slides each entry in, and closing a card removes its slot", async () => {
    const host = await mountHtml(rendered("desktop-notification"));
    const stack = host.querySelector<HTMLElement>('[data-slot="desktop-notification-stack"]')!;
    expect(stack.getAttribute("role")).toBe("region");
    const slots = [...stack.querySelectorAll<HTMLElement>("[data-stack-entry]")];
    expect(slots.map((s) => s.dataset.stackEntry)).toEqual(["b", "a"]);
    expect(slots[0]!.className).toContain("opacity-100");
    slots[0]!.querySelector<HTMLButtonElement>('button[aria-label="Close"]')!.click();
    await tick();
    expect([...stack.querySelectorAll("[data-stack-entry]")].map((s) => (s as HTMLElement).dataset.stackEntry)).toEqual(["a"]);
  });
});

describe("notification permission prompt (Blade example)", () => {
  function stubNotification(permission: string, requestResult: string) {
    const request = vi.fn(async () => requestResult);
    vi.stubGlobal("Notification", { permission, requestPermission: request });
    return request;
  }
  const prompt = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-slot="desktop-notification-permission"]')!;
  const visible = (host: HTMLElement) => [...prompt(host).querySelectorAll<HTMLButtonElement>("button")].filter((b) => b.style.display !== "none").map((b) => b.textContent!.trim());

  it("is unsupported without the Notification API", async () => {
    const host = await mountHtml(rendered("desktop-notification"));
    expect(prompt(host).getAttribute("data-step")).toBe("unsupported");
    expect(prompt(host).querySelector("h3")!.textContent).toBe("Not available here");
    expect(visible(host)).toEqual([]);
  });

  it("asks, then follows the system's answer and shows the granted step", async () => {
    const request = stubNotification("default", "granted");
    const host = await mountHtml(rendered("desktop-notification"));
    expect(prompt(host).getAttribute("data-step")).toBe("ask");
    expect(prompt(host).querySelector("h3")!.textContent).toBe("Turn on desktop notifications?");
    expect(visible(host)).toEqual(["Not now", "Turn on"]);
    const events: string[] = [];
    host.addEventListener("nq-permission", (e) => events.push((e as CustomEvent).detail.permission));
    [...prompt(host).querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent!.trim() === "Turn on")!.click();
    await tick();
    expect(request).toHaveBeenCalledTimes(1);
    expect(events).toEqual(["granted"]);
    expect(prompt(host).getAttribute("data-step")).toBe("granted");
    expect(prompt(host).querySelector("h3")!.textContent).toBe("Desktop notifications are on");
    expect(visible(host)).toEqual(["Send a test"]);
  });

  it("explains how to unblock when denied and dispatches nq-open-settings", async () => {
    stubNotification("denied", "denied");
    const host = await mountHtml(rendered("desktop-notification"));
    expect(prompt(host).getAttribute("data-step")).toBe("denied");
    expect(visible(host)).toEqual(["Open settings"]);
    let opened = 0;
    host.addEventListener("nq-open-settings", () => opened++);
    [...prompt(host).querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent!.trim() === "Open settings")!.click();
    expect(opened).toBe(1);
  });
});
