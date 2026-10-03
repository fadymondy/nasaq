// The Blade upgrade-prompt example (packages/php/examples/rendered/upgrade-prompt.html) under real Alpine.
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
  host.innerHTML = rendered("upgrade-prompt");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

describe("upgrade-prompt (Blade example)", () => {
  it("renders the banner and the locked feature gate with an inert preview", async () => {
    const host = await mount();
    const banner = host.querySelector('[data-slot="upgrade-banner"]')!;
    expect(banner.getAttribute("data-tone")).toBe("warning");
    expect(banner.textContent).toContain("Your trial ends in 3 days");
    const gate = host.querySelector('[data-slot="feature-gate"]')!;
    expect(gate.getAttribute("data-locked")).toBe("");
    expect(gate.querySelector("[inert]")!.textContent).toContain("Revenue by month");
    expect(gate.textContent).toContain("Custom reports are on Team");
  });

  it("opens from the trigger, picks a plan and fires nq-upgrade with the plan and period", async () => {
    const host = await mount();
    expect(document.querySelector<HTMLElement>('[data-slot="upgrade-dialog"]')?.hasAttribute("data-closed") ?? true).toBe(true);
    host.querySelector<HTMLElement>('[data-slot="dialog-trigger"]')!.click();
    await tick();
    const dialog = document.querySelector<HTMLElement>('[data-slot="upgrade-dialog"]')!;
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute("role")).toBe("dialog");
    expect(dialog.textContent).toContain("Unlock unlimited projects");
    expect(dialog.textContent).toContain("Priority support");
    const cta = [...dialog.querySelectorAll("button")].find((b) => b.textContent!.includes("Upgrade to Team"))!;
    expect(cta).toBeDefined();
    let detail: { planId: string; period: string } | null = null;
    host.addEventListener("nq-upgrade", ((e: CustomEvent) => (detail = e.detail)) as EventListener);
    cta.click();
    await tick();
    expect(detail).toMatchObject({ planId: "team", period: "year" });
  });

  it("keeps the button busy until wait() settles, and the later button closes the dialog", async () => {
    const host = await mount();
    let done: () => void = () => {};
    host.addEventListener("nq-upgrade", ((e: CustomEvent) => e.detail.wait(new Promise<void>((r) => (done = r)))) as EventListener);
    host.querySelector<HTMLElement>('[data-slot="dialog-trigger"]')!.click();
    await tick();
    const dialog = document.querySelector<HTMLElement>('[data-slot="upgrade-dialog"]')!;
    const cta = [...dialog.querySelectorAll("button")].find((b) => b.textContent!.includes("Upgrade to"))!;
    cta.click();
    await tick();
    expect(cta.hasAttribute("disabled")).toBe(true);
    done();
    await tick();
    expect(cta.hasAttribute("disabled")).toBe(false);
    [...dialog.querySelectorAll("button")].find((b) => b.textContent!.includes("Maybe later"))!.click();
    await tick(400);
    expect(document.querySelector<HTMLElement>('[data-slot="upgrade-dialog"]')?.hasAttribute("data-closed") ?? true).toBe(true);
  });

  it("switching the period fires nq-period-change", async () => {
    const host = await mount();
    host.querySelector<HTMLElement>('[data-slot="dialog-trigger"]')!.click();
    await tick();
    let period = "";
    host.addEventListener("nq-period-change", ((e: CustomEvent) => (period = e.detail.period)) as EventListener);
    const dialog = document.querySelector<HTMLElement>('[data-slot="upgrade-dialog"]')!;
    const monthly = [...dialog.querySelectorAll<HTMLElement>("button, [role=radio], [role=tab]")].find((b) => /monthly/i.test(b.textContent ?? ""));
    expect(monthly).toBeDefined();
    monthly!.click();
    await tick();
    expect(period).toBe("month");
  });

  it("the dismissible banner hides itself and fires nq:dismiss", async () => {
    const host = await mount();
    const banner = host.querySelector<HTMLElement>('[data-slot="upgrade-banner"]')!;
    const btn = banner.querySelector<HTMLElement>("button[aria-label]")!;
    let fired = false;
    host.addEventListener("nq:dismiss", () => (fired = true));
    btn.click();
    await tick();
    expect(fired).toBe(true);
    expect(banner.style.display).toBe("none");
  });
});
