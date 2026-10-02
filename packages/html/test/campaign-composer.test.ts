// The Blade campaign-composer example (packages/php/examples/rendered/campaign-composer.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = () => new Promise((r) => setTimeout(r, 40));

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
  host.innerHTML = rendered("campaign-composer");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const root = (h: HTMLElement) => h.querySelector<HTMLElement>('[data-slot="campaign-composer"]')!;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (h: HTMLElement) => Alpine.$data(root(h)) as any;
const count = (h: HTMLElement) => h.querySelector('[data-slot="campaign-audience-count"]')!.textContent!;
const press = (h: HTMLElement, text: string) => [...h.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.trim() === text)!;

describe("campaign-composer (Alpine)", () => {
  it("renders the draft, the live count and the email preview", async () => {
    const h = await mount();
    expect(root(h).className).toContain("lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]");
    expect(count(h)).toContain("1,240");
    expect(data(h).isEmail).toBe(true);
    expect(h.querySelector('[data-slot="email-template-preview"]')).not.toBeNull();
    expect(h.querySelector("iframe")!.getAttribute("sandbox")).toBe("");
  });

  it("switches to WhatsApp, with its count and character counter", async () => {
    const h = await mount();
    press(h, "WhatsApp").click();
    await tick();
    expect(data(h).channel).toBe("whatsapp");
    expect(count(h)).toContain("610");
    expect(h.querySelector('[data-slot="email-template-preview"]')).toBeNull();
    expect(h.textContent).toContain("/ 1,024");
    data(h).body = "Hello {{name}}";
    await tick();
    expect(h.textContent).toContain("14 / 1,024");
    expect(h.textContent).toContain("Hello Sara");
  });

  it("lists what is missing, then is ready", async () => {
    const h = await mount();
    expect(data(h).ready).toBe(true);
    data(h).subject = "";
    await tick();
    expect(data(h).ready).toBe(false);
    expect(h.textContent).toContain("Add a subject.");
    data(h).subject = "Hi";
    await tick();
    expect(h.textContent).toContain("Ready to send.");
  });

  it("confirms, then fires nq-campaign-send with the draft", async () => {
    const h = await mount();
    const seen: unknown[] = [];
    root(h).addEventListener("nq-campaign-send", (e) => {
      seen.push((e as CustomEvent).detail.draft);
      (e as CustomEvent).detail.promise = Promise.resolve();
    });
    press(h, "Send campaign").click();
    await tick();
    expect(data(h).confirmOpen).toBe(true);
    expect(document.body.textContent).toContain("Send to 1,240 people?");
    const go = [...document.body.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.trim() === "Send now")!;
    go.click();
    await tick();
    expect(seen).toEqual([{ channel: "email", audienceId: "all", subject: "Hello", body: "<p>Hi there</p>" }]);
  });

  it("sends a test through the dialog", async () => {
    const h = await mount();
    const seen: unknown[] = [];
    root(h).addEventListener("nq-campaign-send-test", (e) => {
      seen.push((e as CustomEvent).detail.to);
      (e as CustomEvent).detail.promise = Promise.resolve();
    });
    press(h, "Send a test").click();
    await tick();
    expect(data(h).testOpen).toBe(true);
    data(h).testTo = "me@example.com";
    await data(h).sendTest();
    await tick();
    expect(seen).toEqual(["me@example.com"]);
    expect(data(h).testNote.tone).toBe("success");
  });

  it("locks and shows progress, and Stop fires nq-campaign-stop", async () => {
    const h = await mount();
    let stopped = 0;
    root(h).addEventListener("nq-campaign-stop", () => stopped++);
    data(h).progress = { sent: 40, failed: 10, total: 100 };
    await tick();
    expect(data(h).locked).toBe(true);
    expect(h.querySelector('[role="progressbar"]')!.getAttribute("aria-valuenow")).toBe("50");
    expect(h.textContent).toContain("40 of 100 sent");
    expect(h.textContent).toContain("10 failed");
    press(h, "Stop sending").click();
    expect(stopped).toBe(1);
  });
});
