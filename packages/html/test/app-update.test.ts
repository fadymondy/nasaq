// The Blade app-update example under real Alpine: the pill, the sheet, the forced gate and the release manager.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import nasaq from "../src/alpine";
import { clampUpdatePercent, countBelow, formatUpdateSize, formatUpdateSpeed, formatUpdateTime, isUpdateRequired, minBuildProblem, secondsLeft } from "../src/alpine/app-update-logic";

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
  host.innerHTML = rendered("app-update");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const state = async (detail: Record<string, unknown>) => {
  window.dispatchEvent(new CustomEvent("nq-update-state", { detail }));
  await tick();
};
const hidden = (el: Element) => getComputedStyle(el).display === "none";
const pills = (host: HTMLElement) => [...host.querySelectorAll<HTMLElement>('[data-slot="update-pill"]')];
const sheet = () => document.querySelector<HTMLElement>('[data-slot="update-sheet"]');
const isHidden = (el: HTMLElement | null) => !el || hidden(el);
const byText = (root: ParentNode, text: string) => [...root.querySelectorAll<HTMLElement>("button")].find((b) => b.textContent?.trim() === text)!;

describe("helpers", () => {
  it("decides, clamps and formats", () => {
    expect(isUpdateRequired(10, 12)).toBe(true);
    expect(isUpdateRequired(12, null)).toBe(false);
    expect(clampUpdatePercent(140)).toBe(100);
    expect(formatUpdateSize(48_200_000)).toBe("46 MB");
    expect(formatUpdateSpeed(3_200_000)).toBe("3.1 MB/s");
    expect(formatUpdateTime(65)).toBe("1:05");
    expect(secondsLeft(100, 50, 10)).toBe(5);
    expect(countBelow([{ build: 1, users: 3 }, { build: 5, users: 2 }], 3)).toBe(3);
    expect(minBuildProblem(9, 4)).toBe("too-high");
  });
});

describe("update pill (Blade example)", () => {
  it("renders each state and follows nq-update-state", async () => {
    const host = await mount();
    const [available, downloading, ready, error] = pills(host) as [HTMLElement, HTMLElement, HTMLElement, HTMLElement];
    expect(available.textContent?.trim()).toBe("Update available");
    expect(available.getAttribute("title")).toBe("Version 2.4.0");
    expect(downloading.getAttribute("data-status")).toBe("downloading");
    expect(downloading.textContent?.trim()).toBe("Downloading 42%");
    const fill = downloading.querySelector<HTMLElement>('[data-slot="update-pill-fill"]')!;
    expect(fill.style.inlineSize).toBe("42%");
    expect(hidden(fill)).toBe(false);
    expect(hidden(available.querySelector('[data-slot="update-pill-fill"]')!)).toBe(true);
    expect(ready.textContent?.trim()).toBe("Restart to update");
    expect(ready.className).toContain("bg-nq-success-soft");
    expect(error.textContent?.trim()).toBe("Update failed");
    expect(error.className).toContain("bg-nq-danger-soft");

    await state({ status: "downloading", progress: 73.4 });
    expect(available.getAttribute("data-status")).toBe("downloading");
    expect(available.textContent?.trim()).toBe("Downloading 73%");
    expect(available.querySelector<HTMLElement>('[data-slot="update-pill-fill"]')!.style.inlineSize).toBe("73.4%");
    expect(available.className).not.toContain("bg-nq-success-soft");
    await state({ status: "ready" });
    expect(available.textContent?.trim()).toBe("Restart to update");
    expect(available.className).toContain("bg-nq-success-soft");
  });
});

describe("update sheet (Blade example)", () => {
  it("opens from the pill, shows the notes, and reports Download and Later", async () => {
    const host = await mount();
    expect(isHidden(sheet())).toBe(true);
    pills(host)[0]!.click();
    await tick();
    const panel = sheet()!;
    expect(isHidden(panel)).toBe(false);
    expect(panel.getAttribute("data-status")).toBe("available");
    expect(panel.querySelector('[data-slot="sheet-title"]')!.textContent?.trim()).toBe("Version 2.4.0 is ready");
    expect(panel.querySelectorAll("section li")).toHaveLength(3);
    expect(panel.textContent).toContain("46 MB");
    expect(panel.textContent).toContain("Beta");
    expect(hidden(panel.querySelector('[data-slot="update-progress"]')!)).toBe(true);

    const download = vi.fn();
    host.addEventListener("nq-update-download", download);
    byText(panel, "Download update").click();
    expect(download).toHaveBeenCalledTimes(1);

    await state({ status: "downloading", progress: 50, speed: 1_048_576 });
    const progress = panel.querySelector<HTMLElement>('[data-slot="progress"]')!;
    expect(hidden(panel.querySelector('[data-slot="update-progress"]')!)).toBe(false);
    expect(progress.getAttribute("aria-valuenow")).toBe("50");
    expect(panel.querySelector<HTMLElement>('[data-slot="progress-indicator"]')!.style.width).toBe("50%");
    expect(panel.textContent).toContain("1 MB/s");
    expect(panel.textContent).toContain("0:23 left");
    expect(byText(panel, "Download update").hasAttribute("disabled")).toBe(true);

    await state({ status: "ready" });
    expect(hidden(byText(panel, "Restart now"))).toBe(false);
    expect(panel.textContent).toContain("The update is downloaded.");
    const restart = vi.fn();
    host.addEventListener("nq-update-restart", restart);
    byText(panel, "Restart now").click();
    expect(restart).toHaveBeenCalledTimes(1);

    await state({ status: "error" });
    expect(byText(panel, "Try again")).toBeTruthy();
    expect(panel.textContent).toContain("The download did not finish.");

    const later = vi.fn();
    host.addEventListener("nq-update-later", later);
    byText(panel, "Later").click();
    await tick();
    expect(later).toHaveBeenCalledTimes(1);
    expect(isHidden(sheet())).toBe(true);
  });

  it("closes with Escape", async () => {
    const host = await mount();
    pills(host)[0]!.click();
    await tick();
    sheet()!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await tick();
    expect(isHidden(sheet())).toBe(true);
  });
});

describe("forced update gate (Blade example)", () => {
  it("blocks with only the download action", async () => {
    const host = await mount();
    const gate = host.querySelector<HTMLElement>('[data-slot="forced-update-gate"]')!;
    expect(gate.tagName).toBe("MAIN");
    expect(gate.textContent).not.toContain("The app");
    expect(gate.textContent).toContain("Please update to continue");
    expect(gate.textContent).toContain("You have build 100. The oldest supported build is 200.");
    expect(gate.querySelector('[data-slot="product-logo"]')).not.toBeNull();
    expect(gate.querySelectorAll("section li")).toHaveLength(3);
    const download = vi.fn();
    gate.addEventListener("nq-update-download", download);
    byText(gate, "Download update").click();
    expect(download).toHaveBeenCalledTimes(1);
    await state({ status: "ready" });
    expect(gate.getAttribute("data-status")).toBe("ready");
    expect(hidden(byText(gate, "Restart now"))).toBe(false);
    expect(hidden(byText(gate, "Download update"))).toBe(true);
  });
});

describe("release manager (Blade example)", () => {
  const manager = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-slot="release-manager"]')!;
  const input = (host: HTMLElement) => manager(host).querySelector<HTMLInputElement>('[data-slot="input"]')!;
  const type = async (host: HTMLElement, value: string) => {
    input(host).value = value;
    input(host).dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
  };

  it("lists the releases with the Min tag and the right row actions", async () => {
    const host = await mount();
    const rows = [...manager(host).querySelectorAll<HTMLElement>("tbody tr")] as [HTMLElement, HTMLElement, HTMLElement];
    expect(rows).toHaveLength(3);
    expect(rows[0].textContent).toContain("Publish");
    expect(rows[1].textContent).toContain("Roll back");
    expect(rows[1].textContent).toContain("50%");
    const min = [...manager(host).querySelectorAll<HTMLElement>("tbody [data-slot=badge]")].filter((b) => b.textContent?.trim() === "Min");
    expect(min.map(hidden)).toEqual([true, true, false]);
    expect(input(host).value).toBe("230");
    expect(byText(manager(host), "Save").hasAttribute("disabled")).toBe(true);
  });

  it("validates, warns who gets blocked, saves through the event", async () => {
    const host = await mount();
    const onSave = vi.fn((e: Event) => (e as CustomEvent).detail.waitUntil(Promise.resolve()));
    host.addEventListener("nq-release-min-build", onSave);
    const save = byText(manager(host), "Save");

    await type(host, "9999");
    expect(manager(host).textContent).toContain("That is newer than the latest release.");
    expect(input(host).getAttribute("aria-invalid")).toBe("true");
    expect(save.hasAttribute("disabled")).toBe(true);
    await type(host, "abc");
    expect(manager(host).textContent).toContain("Enter a whole number, 0 or more.");

    await type(host, "240");
    expect(input(host).hasAttribute("aria-invalid")).toBe(false);
    const warning = manager(host).querySelector<HTMLElement>('[data-slot="alert"]')!;
    expect(hidden(warning)).toBe(false);
    expect(warning.textContent).toContain("1,200 people are on a build below this");
    expect(save.hasAttribute("disabled")).toBe(false);

    save.click();
    await tick();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect((onSave.mock.calls[0]![0] as CustomEvent).detail.build).toBe(240);
    expect(manager(host).querySelector('[role="status"]')!.textContent).toBe("Saved");
    expect(save.hasAttribute("disabled")).toBe(true);
    expect(hidden(warning)).toBe(true);
  });

  it("shows the error when saving fails", async () => {
    const host = await mount();
    host.addEventListener("nq-release-min-build", (e) => (e as CustomEvent).detail.reject("Not allowed"));
    await type(host, "240");
    byText(manager(host), "Save").click();
    await tick();
    expect(manager(host).querySelector('[role="status"]')!.textContent).toBe("Not allowed");
    expect(byText(manager(host), "Save").hasAttribute("disabled")).toBe(false);
  });

  it("publishes and rolls back through events with a busy button", async () => {
    const host = await mount();
    let finish!: () => void;
    const seen: Array<[string, string]> = [];
    for (const name of ["nq-release-publish", "nq-release-rollback"]) {
      host.addEventListener(name, (e) => {
        seen.push([name, (e as CustomEvent).detail.id]);
        (e as CustomEvent).detail.waitUntil(new Promise<void>((r) => (finish = r)));
      });
    }
    const publish = byText(manager(host), "Publish");
    publish.click();
    await tick();
    expect(seen).toEqual([["nq-release-publish", "r3"]]);
    expect(publish.getAttribute("aria-busy")).toBe("true");
    expect(publish.hasAttribute("disabled")).toBe(true);
    finish();
    await tick();
    expect(publish.hasAttribute("aria-busy")).toBe(false);
    byText(manager(host), "Roll back").click();
    await tick();
    expect(seen[1]).toEqual(["nq-release-rollback", "r2"]);
  });
});
