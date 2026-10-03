import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
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
  for (const el of [...document.body.children]) {
    Alpine.destroyTree(el as HTMLElement);
    el.remove();
  }
});

async function mount(name: string) {
  const host = document.createElement("div");
  host.innerHTML = rendered(name);
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

describe("toast (Blade example)", () => {
  it("shows a toast from nqToast, labels the region and dismisses it", async () => {
    const host = await mount("toast");
    const region = host.querySelector<HTMLElement>('[data-slot="toaster"]')!;
    expect(region.getAttribute("aria-label")).toBe("Notifications");
    expect(host.querySelectorAll('[data-slot="toast"]').length).toBe(0);

    host.querySelector<HTMLButtonElement>("button:not([data-close])")!.click();
    await tick();
    const toast = host.querySelector<HTMLElement>('[data-slot="toast"]')!;
    expect(toast.getAttribute("role")).toBe("status");
    expect(toast.getAttribute("data-type")).toBe("success");
    expect(toast.textContent).toContain("Invoice sent");

    toast.querySelector<HTMLButtonElement>("[data-close]")!.click();
    await tick(400);
    expect(host.querySelectorAll('[data-slot="toast"]').length).toBe(0);
  });

  it("leaves after its duration", async () => {
    const host = await mount("toast");
    window.dispatchEvent(new CustomEvent("nq-toast", { detail: { title: "Saved", duration: 50 } }));
    await tick();
    expect(host.querySelectorAll('[data-slot="toast"]').length).toBe(1);
    await tick(450);
    expect(host.querySelectorAll('[data-slot="toast"]').length).toBe(0);
  });
});
