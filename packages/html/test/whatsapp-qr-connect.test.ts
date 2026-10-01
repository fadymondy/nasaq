// The Blade example (php/examples/whatsapp-qr-connect.blade.php) mounted under real Alpine: QR, countdown, events and updates.
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

async function mountHtml(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const visible = (el: Element | null) => !!el && (el as HTMLElement).style.display !== "none";

describe("whatsapp-qr-connect (Blade example)", () => {
  it("shows the code, a live countdown and the steps", async () => {
    const host = await mountHtml(rendered("whatsapp-qr-connect"));
    const root = host.querySelector<HTMLElement>('[data-slot="whatsapp-qr-connect"]')!;
    expect(root.dataset.status).toBe("qr");
    expect(host.querySelector('[data-slot="qr-code-svg"]')).not.toBeNull();
    expect(host.querySelector('[data-slot="whatsapp-countdown"]')!.textContent).toMatch(/^Code expires in \d+s$/);
    expect(host.querySelectorAll("ol li")).toHaveLength(3);
    expect(visible(host.querySelector('[data-slot="whatsapp-connected"]'))).toBe(false);
  });

  it("refresh is busy until the listener's promise settles", async () => {
    const host = await mountHtml(rendered("whatsapp-qr-connect"));
    const root = host.querySelector<HTMLElement>('[data-slot="whatsapp-qr-connect"]')!;
    let release!: () => void;
    root.addEventListener("nq-whatsapp-refresh", (e) => (e as CustomEvent).detail.wait(new Promise<void>((r) => (release = r))));
    const btn = [...host.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.trim() === "New code")!;
    btn.click();
    await tick();
    expect(btn.getAttribute("aria-busy")).toBe("true");
    release();
    await tick();
    expect(btn.getAttribute("aria-busy")).toBeNull();
  });

  it("follows an update to connected, and expiry asks for a new code once", async () => {
    const host = await mountHtml(rendered("whatsapp-qr-connect"));
    const root = host.querySelector<HTMLElement>('[data-slot="whatsapp-qr-connect"]')!;
    let refreshes = 0;
    root.addEventListener("nq-whatsapp-refresh", () => refreshes++);
    root.dispatchEvent(new CustomEvent("nq-whatsapp-update", { detail: { expiresAt: Date.now() + 100 } }));
    await tick(1300);
    expect(refreshes).toBe(1);
    expect(host.querySelector('[data-slot="whatsapp-countdown"]')!.textContent).toBe("This code expired");

    root.dispatchEvent(new CustomEvent("nq-whatsapp-update", { detail: { status: "connected", account: "+1 555 010 0100", connectedSince: "May 1" } }));
    await tick();
    expect(root.dataset.status).toBe("connected");
    expect(visible(host.querySelector('[data-slot="whatsapp-connected"]'))).toBe(true);
    expect(host.querySelector("bdi")!.textContent).toBe("+1 555 010 0100");
    expect(visible(host.querySelector('[data-slot="whatsapp-qr"]')!.parentElement)).toBe(false);
  });
});
