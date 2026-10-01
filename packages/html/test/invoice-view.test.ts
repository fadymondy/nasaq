// The Blade invoice-view example under real Alpine: download busy / error, print and pay events.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = () => new Promise((r) => setTimeout(r, 30));

beforeAll(() => {
  Alpine.plugin(nasaq);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).Alpine = Alpine;
  Alpine.start();
});

afterEach(() => {
  vi.restoreAllMocks();
  for (const el of [...document.body.children]) {
    Alpine.destroyTree(el as HTMLElement);
    el.remove();
  }
});

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("invoice-view");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}
const button = (host: HTMLElement, text: string) => [...host.querySelectorAll<HTMLButtonElement>('[data-slot="invoice-actions"] button')].find((b) => b.textContent?.trim() === text)!;

describe("invoice-view (Blade example)", () => {
  it("renders the sheet, the status chip and the computed totals", async () => {
    const host = await mount();
    expect(host.querySelector('[data-slot="invoice-status"]')!.getAttribute("data-status")).toBe("open");
    const sheet = host.querySelector('[data-slot="invoice-sheet"]')!;
    expect(sheet.textContent).toContain("$245.00");
    expect(sheet.textContent).toContain("$36.75");
    expect(sheet.textContent).toContain("$281.75");
    expect(host.querySelector("style")!.textContent).toContain("@media print");
  });

  it("download: busy while a promise runs, then an error is shown in the bar", async () => {
    const host = await mount();
    host.addEventListener("nq-invoice-download", (e) => (e as CustomEvent).detail.waitUntil(new Promise((_, rej) => setTimeout(() => rej(new Error("PDF failed")), 20))));
    const download = button(host, "Download PDF");
    download.click();
    await new Promise((r) => setTimeout(r, 5));
    expect(download.getAttribute("aria-busy")).toBe("true");
    expect(download.disabled).toBe(true);
    await tick();
    expect(download.getAttribute("aria-busy")).not.toBe("true");
    const alert = host.querySelector<HTMLElement>('[data-slot="invoice-actions"] [role="alert"]')!;
    expect(alert.textContent).toBe("PDF failed");
    expect(alert.style.display).not.toBe("none");
  });

  it("download: nobody listening finishes at once with no error", async () => {
    const host = await mount();
    const download = button(host, "Download PDF");
    download.click();
    await tick();
    expect(download.getAttribute("aria-busy")).not.toBe("true");
    expect(host.querySelector<HTMLElement>('[data-slot="invoice-actions"] [role="alert"]')!.style.display).toBe("none");
  });

  it("print calls window.print unless the event is cancelled; pay dispatches nq-invoice-pay", async () => {
    const host = await mount();
    const print = vi.fn();
    window.print = print;
    button(host, "Print").click();
    expect(print).toHaveBeenCalledTimes(1);
    host.addEventListener("nq-invoice-print", (e) => e.preventDefault());
    button(host, "Print").click();
    expect(print).toHaveBeenCalledTimes(1);
    const pay = vi.fn();
    host.addEventListener("nq-invoice-pay", pay);
    button(host, "Pay now").click();
    expect(pay).toHaveBeenCalledTimes(1);
  });
});
