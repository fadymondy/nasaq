import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";
import {
  countByStatus,
  feedbackInstallSnippet,
  filterHubIssues,
  isShake,
  moveLauncherSpot,
  normalizePosition,
  parseLauncherSpot,
  snapLauncherSpot,
  spotFromPosition,
} from "../src/alpine/feedback-reporter-logic";

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
  host.innerHTML = rendered("feedback-reporter");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const slot = (host: HTMLElement, name: string) => host.querySelector<HTMLElement>(`[data-slot="${name}"]`)!;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (el: HTMLElement) => Alpine.$data(el) as Record<string, any>;
const toggle = (scope: HTMLElement, text: string) => [...scope.querySelectorAll<HTMLElement>('[data-slot="toggle"]')].find((b) => b.textContent?.trim().startsWith(text))!;

describe("feedback model", () => {
  it("normalizes positions, counts and detects shakes", () => {
    expect(normalizePosition("tab", "top-start")).toBe("edge-start");
    expect(normalizePosition("circle", "edge-end")).toBe("bottom-end");
    expect(countByStatus([{ id: "a", title: "x", status: "open" }])).toEqual({ all: 1, open: 1, "in-progress": 0, resolved: 0 });
    expect(isShake([1, 2, 3], 3)).toBe(true);
    expect(feedbackInstallSnippet({ shape: "pill", position: "bottom-end", label: "Hi" }, "react")).toContain("NEXT_PUBLIC_MAHAAM_FEEDBACK_KEY");
  });
});

describe("feedback-reporter (Blade example)", () => {
  it("draws the launcher with a normalized position", async () => {
    const host = await mount();
    const launcher = host.querySelector<HTMLElement>('[data-slot="feedback-launcher"]')!;
    expect(launcher.getAttribute("data-shape")).toBe("pill");
    expect(launcher.getAttribute("data-position")).toBe("bottom-end");
    expect(launcher.textContent).toContain("Feedback");
  });

  it("filters the hub by status", async () => {
    const host = await mount();
    const hub = slot(host, "feedback-hub");
    const rows = () => [...hub.querySelectorAll<HTMLElement>("li[data-status]")].filter((li) => li.style.display !== "none");
    expect(rows()).toHaveLength(4);
    toggle(hub, "Resolved").click();
    await tick();
    expect(rows().map((li) => li.dataset.status)).toEqual(["resolved"]);
    toggle(hub, "Resolved").click();
    await tick();
    expect(rows()).toHaveLength(4);
  });

  it("blocks voted and resolved reports and fires a vote event", async () => {
    const host = await mount();
    const hub = slot(host, "feedback-hub");
    const votes = [...hub.querySelectorAll<HTMLButtonElement>("button[aria-pressed]:not([data-slot=toggle])")];
    expect(votes.map((b) => b.disabled)).toEqual([false, false, true, true]);
    let id = "";
    hub.addEventListener("nq-feedback-vote", (e) => (id = (e as CustomEvent).detail.id));
    votes[0]!.click();
    await tick();
    expect(id).toBe("a");
    expect(data(hub).busy).toBe(0);
    await tick(100);
    expect(data(hub).busy).toBeNull();
  });

  it("fires nq-report-new and nq-open-issue", async () => {
    const host = await mount();
    const hub = slot(host, "feedback-hub");
    const seen: string[] = [];
    hub.addEventListener("nq-report-new", () => seen.push("new"));
    hub.addEventListener("nq-open-issue", (e) => seen.push((e as CustomEvent).detail.id));
    [...hub.querySelectorAll("button")].find((b) => b.textContent?.includes("Report a problem"))!.click();
    [...hub.querySelectorAll("button")].find((b) => b.textContent?.includes("Cannot pay"))!.click();
    expect(seen).toEqual(["new", "a"]);
  });

  it("changes the preview and prints the install code", async () => {
    const host = await mount();
    const cfg = slot(host, "feedback-configurator");
    const preview = slot(cfg, "feedback-configurator-preview").querySelector<HTMLElement>('[data-slot="feedback-launcher"]')!;
    expect(preview.getAttribute("data-shape")).toBe("pill");
    expect(preview.getAttribute("tabindex")).toBe("-1");
    let detail: unknown = null;
    cfg.addEventListener("nq-feedback-config", (e) => (detail = (e as CustomEvent).detail));
    toggle(cfg, "Edge tab").click();
    await tick();
    expect(preview.getAttribute("data-shape")).toBe("tab");
    expect(preview.getAttribute("data-position")).toBe("edge-end");
    expect(preview.className).toContain("rounded-s-card");
    expect(detail).toMatchObject({ shape: "tab" });
    expect(cfg.querySelector("[data-slot=feedback-code] code")!.textContent).toContain("NEXT_PUBLIC_MAHAAM_FEEDBACK_KEY");
    toggle(cfg, "Circle").click();
    await tick();
    expect(preview.getAttribute("aria-label")).toBe("Feedback");
    expect(preview.getAttribute("data-position")).toBe("bottom-end");
    const input = cfg.querySelector<HTMLInputElement>("input")!;
    input.value = "Help";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect(preview.getAttribute("aria-label")).toBe("Help");
    expect(data(cfg).snippet("json")).toContain("Help");
  });

  it("opens the shake sheet and reports", async () => {
    const host = await mount();
    const root = slot(host, "shake-report");
    let reported = 0;
    root.addEventListener("nq-report", () => reported++);
    window.dispatchEvent(new CustomEvent("nq-shake-open"));
    await tick();
    expect(data(root).shown).toBe(true);
    const sheet = document.querySelector<HTMLElement>('[data-slot="shake-report-sheet"]')!;
    expect(sheet.textContent).toContain("Something wrong?");
    expect(sheet.querySelector('[role="switch"]')).not.toBeNull();
    [...sheet.querySelectorAll("button")].find((b) => b.textContent?.includes("Report a problem"))!.click();
    await tick();
    expect(reported).toBe(1);
    expect(data(root).shown).toBe(false);
  });

  it("fires nq-shake-enabled from the switch", async () => {
    const host = await mount();
    const root = slot(host, "shake-report");
    let on: boolean | null = null;
    root.addEventListener("nq-shake-enabled", (e) => (on = (e as CustomEvent).detail.enabled));
    window.dispatchEvent(new CustomEvent("nq-shake-open"));
    await tick();
    document.querySelector<HTMLElement>('[data-slot="shake-report-sheet"] [role="switch"]')!.click();
    await tick();
    expect(on).toBe(false);
  });
});

describe("movable launcher and My reports", () => {
  it("snaps, steps and parses launcher spots", () => {
    expect(snapLauncherSpot({ x: 10, y: 300 }, { width: 400, height: 600 })).toEqual({ side: "start", y: 0.5 });
    expect(snapLauncherSpot({ x: 10, y: 300 }, { width: 400, height: 600 }, true).side).toBe("end");
    expect(snapLauncherSpot({ x: 390, y: 0 }, { width: 400, height: 600 }, false, 40).y).toBeCloseTo(36 / 600, 3);
    expect(spotFromPosition("top-end")).toEqual({ side: "end", y: 0.1 });
    expect(moveLauncherSpot({ side: "end", y: 0.07 }, "up").y).toBe(0.05);
    expect(moveLauncherSpot({ side: "end", y: 0.5 }, "start").side).toBe("start");
    expect(parseLauncherSpot('{"side":"start","y":0.2}')).toEqual({ side: "start", y: 0.2 });
    expect(parseLauncherSpot("{")).toBeNull();
    expect(filterHubIssues([{ id: "1", title: "a", status: "open", mine: true }, { id: "2", title: "b", status: "open" }], "mine")).toHaveLength(1);
  });

  it("renders the movable launcher with its hooks", async () => {
    const host = await mount();
    const l = host.querySelectorAll<HTMLElement>('[data-slot="feedback-launcher"]')[1]!;
    expect(l.hasAttribute("data-movable")).toBe(true);
    expect(l.getAttribute("aria-keyshortcuts")).toContain("Alt+ArrowLeft");
    expect(l.title).toContain("Drag to move");
    expect(l.className).toContain("touch-none");
    expect(host.querySelectorAll("[data-movable]")).toHaveLength(1);
  });

  it("moves with Alt + arrows, announces the spot and ignores a click right after a drag", async () => {
    const host = await mount();
    const l = host.querySelectorAll<HTMLElement>('[data-slot="feedback-launcher"]')[1]!;
    const spots: unknown[] = [];
    l.addEventListener("nq-feedback-spot", (e) => spots.push((e as CustomEvent).detail));
    l.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", altKey: true, bubbles: true, cancelable: true }));
    await tick();
    expect(l.getAttribute("data-side")).toBe("end");
    expect(l.hasAttribute("data-position")).toBe(false);
    expect(l.className).toContain("-translate-y-1/2");
    expect(l.className).not.toContain("bottom-4");
    expect(l.style.top).toBe("85%");
    l.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", altKey: true, bubbles: true, cancelable: true }));
    await tick();
    expect(l.getAttribute("data-side")).toBe("start");
    expect(l.style.getPropertyValue("inset-inline-start")).toBe("1rem");
    expect(spots).toMatchObject([{ side: "end", y: 0.85 }, { side: "start", y: 0.85 }]);
    // Without Alt nothing moves.
    l.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true, cancelable: true }));
    expect(spots).toHaveLength(2);
    // A drag swallows the click that follows it.
    let clicks = 0;
    l.addEventListener("click", () => clicks++);
    data(l).swallow = true;
    l.click();
    expect(clicks).toBe(0);
    l.click();
    expect(clicks).toBe(1);
  });

  it("shows Mine, Yours and filters to the visitor's reports", async () => {
    const host = await mount();
    const hub = slot(host, "feedback-hub");
    const rows = () => [...hub.querySelectorAll<HTMLElement>("li[data-status]")].filter((li) => li.style.display !== "none");
    expect(toggle(hub, "Mine").textContent).toContain("1");
    expect(hub.querySelector("li[data-mine]")!.textContent).toContain("Yours");
    expect(hub.querySelector("li[data-mine]")!.textContent).not.toContain("by Me");
    let filter = "";
    hub.addEventListener("nq-feedback-filter", (e) => (filter = (e as CustomEvent).detail.filter));
    toggle(hub, "Mine").click();
    await tick();
    expect(rows().map((li) => li.dataset.id)).toEqual(["d"]);
    expect(filter).toBe("mine");
  });

  it("shows the Load more row with the server total and spins while the host loads", async () => {
    const host = await mount();
    const hub = slot(host, "feedback-hub");
    expect(hub.textContent).toContain("Showing 4 of 9");
    toggle(hub, "Mine").click();
    await tick();
    expect(hub.textContent).toContain("Showing 1 of 1");
    const more = [...hub.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.includes("Load more"))!;
    hub.addEventListener("nq-load-more", (e) => (e as CustomEvent).detail.waitUntil(new Promise((done) => setTimeout(done, 50))));
    more.click();
    await tick();
    expect(more.getAttribute("aria-busy")).toBe("true");
    await tick(100);
    expect(more.hasAttribute("aria-busy")).toBe(false);
  });
});
