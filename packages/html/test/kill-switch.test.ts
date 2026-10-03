// The Blade kill-switch example (packages/php/examples/rendered/kill-switch.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms));

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
  host.innerHTML = rendered("kill-switch");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const visible = (el: Element | null) => !!el && (el as HTMLElement).style.display !== "none";
const running = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-slot="kill-switch"][data-paused="false"]')!;
const button = (scope: ParentNode, text: string) => [...scope.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.includes(text))!;
const dialog = () =>
  [...document.body.querySelectorAll<HTMLElement>('[data-slot="dialog-content"]')].find((c) => c.querySelector('[data-slot="dialog-title"]')?.textContent?.trim() === "Stop every automation?")!;
const hidden = (el: HTMLElement) => getComputedStyle(el).display === "none";

describe("kill-switch (Blade example)", () => {
  it("renders the running card, the paused card and the banner", async () => {
    const host = await mount();
    expect(host.querySelectorAll('[data-slot="kill-switch"]')).toHaveLength(2);
    expect(running(host).textContent).toContain("14 automations are active");
    expect(host.querySelector('[data-slot="kill-switch"][data-paused="true"]')!.textContent).toContain("Paused by Sara Ali");
    const banner = host.querySelector('[data-slot="paused-banner"]')!;
    expect(banner.getAttribute("role")).toBe("status");
    expect(banner.textContent).toContain("Automations are paused");
    expect(host.querySelectorAll('[data-slot="kill-switch-browser"]')).toHaveLength(2);
    expect(host.querySelector('[data-slot="kill-switch-browser"][data-current]')!.textContent).toContain("This browser");
  });

  it("requires a reason, then fires nq-kill-switch-stop and closes", async () => {
    const host = await mount();
    const root = running(host);
    const events: Array<{ reason: string }> = [];
    root.addEventListener("nq-kill-switch-stop", (e) => {
      const d = (e as CustomEvent).detail;
      events.push({ reason: d.reason });
      d.resolve();
    });
    button(root, "Stop all automations").click();
    await tick();
    expect(hidden(dialog())).toBe(false);
    button(dialog(), "Stop everything").click();
    await tick();
    expect(events).toHaveLength(0);
    expect(dialog().textContent).toContain("Give a reason.");
    const textarea = dialog().querySelector("textarea")!;
    textarea.value = "  Bad deploy ";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    button(dialog(), "Stop everything").click();
    await tick(80);
    expect(events).toEqual([{ reason: "Bad deploy" }]);
    expect(dialog().hasAttribute("data-open")).toBe(false);
  });

  it("keeps the dialog open and shows the error when the stop fails", async () => {
    const host = await mount();
    const root = running(host);
    root.addEventListener("nq-kill-switch-stop", (e) => (e as CustomEvent).detail.waitUntil(Promise.reject(new Error("Server said no"))));
    button(root, "Stop all automations").click();
    await tick();
    const textarea = dialog().querySelector("textarea")!;
    textarea.value = "Because";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    button(dialog(), "Stop everything").click();
    await tick(80);
    expect(dialog().textContent).toContain("Server said no");
    expect(dialog().hasAttribute("data-open")).toBe(true);
  });

  it("asks before unpairing, then fires nq-kill-switch-unpair with the id", async () => {
    const host = await mount();
    const root = running(host);
    const ids: string[] = [];
    root.addEventListener("nq-kill-switch-unpair", (e) => {
      ids.push((e as CustomEvent).detail.id);
      (e as CustomEvent).detail.resolve();
    });
    // Only the browser that is not the current one can be unpaired.
    const unpair = [...root.querySelectorAll<HTMLButtonElement>("button")].filter((b) => b.getAttribute("aria-label")?.startsWith("Unpair"));
    expect(unpair).toHaveLength(1);
    expect(unpair[0]!.getAttribute("aria-label")).toBe("Unpair Edge on Windows");
    unpair[0]!.click();
    await tick();
    const confirm = document.body.querySelector<HTMLElement>('[data-slot="alert-dialog-content"]')!;
    expect(confirm.textContent).toContain("Unpair Edge on Windows?");
    expect(ids).toHaveLength(0);
    [...confirm.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Unpair")!.click();
    await tick(80);
    expect(ids).toEqual(["2"]);
  });

  it("the banner Resume shows busy, then the failure", async () => {
    const host = await mount();
    const banner = host.querySelector<HTMLElement>('[data-slot="paused-banner"]')!;
    let reject!: (m: string) => void;
    banner.addEventListener("nq-kill-switch-resume", (e) => {
      (e as CustomEvent).detail.waitUntil(new Promise((_, no) => (reject = (m: string) => no(new Error(m)))));
    });
    const resume = banner.querySelector<HTMLButtonElement>("button")!;
    resume.click();
    await tick();
    expect(resume.getAttribute("aria-busy")).toBe("true");
    expect(resume.textContent).toContain("Resuming");
    reject("Nope");
    await tick();
    expect(resume.getAttribute("aria-busy")).toBeNull();
    expect(banner.querySelector('[role="alert"]')!.textContent).toBe("Nope");
  });
});
