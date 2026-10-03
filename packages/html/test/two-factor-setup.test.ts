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

async function mount(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const root = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-slot="two-factor-setup"]')!;
const shown = (el: Element | null) => !!el && (el as HTMLElement).style.display !== "none";

async function typeCode(host: HTMLElement, code: string) {
  const input = host.querySelector<HTMLElement>('[data-slot="two-factor-verify"] [data-slot="otp-input"]')!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Alpine.$data(input) as any).value = code;
  await tick();
}

describe("two-factor-setup (Blade example)", () => {
  it("starts on step 1 with a drawn QR code and the grouped key", async () => {
    const host = await mount(rendered("two-factor-setup"));
    expect(root(host).dataset.state).toBe("step-1");
    const path = host.querySelector('[data-slot="two-factor-qr"] path')!.getAttribute("d");
    expect(path && path.length).toBeGreaterThan(100);
    expect(host.querySelector('[data-slot="two-factor-key"] code')!.textContent!.trim()).toBe("JBSW Y3DP EHPK 3PXP");
    expect(host.querySelector('[data-slot="two-factor-steps"] li[aria-current="step"]')).not.toBeNull();
  });

  it("Next moves to step 2, Back returns", async () => {
    const host = await mount(rendered("two-factor-setup"));
    const next = [...host.querySelectorAll<HTMLButtonElement>('[data-slot="two-factor-scan"] button')].find((b) => b.textContent!.includes("Next"))!;
    next.click();
    await tick();
    expect(root(host).dataset.state).toBe("step-2");
    expect(shown(host.querySelector('[data-slot="two-factor-verify"]'))).toBe(true);
    [...host.querySelectorAll<HTMLButtonElement>('[data-slot="two-factor-verify"] button')].find((b) => b.textContent!.includes("Back"))!.click();
    await tick();
    expect(root(host).dataset.state).toBe("step-1");
  });

  it("a wrong code shows the error and stays on step 2", async () => {
    const host = await mount(rendered("two-factor-setup"));
    host.addEventListener("nq-2fa-verify", (e) => (e as CustomEvent).detail.wait(Promise.resolve({ error: "Bad code" })));
    next(host).click();
    await tick();
    await typeCode(host, "123456");
    host.querySelector<HTMLFormElement>('[data-slot="two-factor-verify"]')!.requestSubmit();
    await tick(60);
    expect(root(host).dataset.state).toBe("step-2");
    expect(host.querySelector('[data-slot="two-factor-verify"] [role="alert"]')!.textContent).toBe("Bad code");
  });

  it("a right code shows the recovery codes, Finish needs the checkbox and then enables", async () => {
    const host = await mount(rendered("two-factor-setup"));
    const sent: string[] = [];
    let completed = 0;
    host.addEventListener("nq-2fa-complete", () => completed++);
    host.addEventListener("nq-2fa-verify", (e) => {
      sent.push((e as CustomEvent).detail.code);
      (e as CustomEvent).detail.wait(Promise.resolve({ recoveryCodes: ["aaaaa-bbbbb", "ccccc-ddddd"] }));
    });
    next(host).click();
    await tick();
    await typeCode(host, "123456");
    host.querySelector<HTMLFormElement>('[data-slot="two-factor-verify"]')!.requestSubmit();
    await tick(60);
    expect(sent).toEqual(["123456"]);
    expect(root(host).dataset.state).toBe("step-3");
    const items = [...host.querySelectorAll('[data-slot="two-factor-recovery-code"]')].map((li) => li.textContent);
    expect(items.filter(Boolean)).toEqual(["aaaaa-bbbbb", "ccccc-ddddd"]);
    const recovery = host.querySelectorAll<HTMLElement>('[data-slot="two-factor-recovery"]')[1]!;
    const finish = [...recovery.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent!.includes("Finish"))!;
    expect(finish.disabled).toBe(true);
    recovery.querySelector<HTMLInputElement>('[data-slot="checkbox"]')!.click();
    await tick();
    expect(finish.disabled).toBe(false);
    finish.click();
    await tick();
    expect(root(host).dataset.state).toBe("enabled");
    expect(completed).toBe(1);
  });

  it("when enabled, Regenerate dispatches the credential and shows the fresh codes", async () => {
    const host = await mount(rendered("two-factor-setup"));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Alpine.$data(root(host)) as any).enabled = true;
    await tick();
    expect(root(host).dataset.state).toBe("enabled");
    const got: string[] = [];
    host.addEventListener("nq-2fa-regenerate", (e) => {
      got.push((e as CustomEvent).detail.credential);
      (e as CustomEvent).detail.wait(Promise.resolve(["x1x1x-x1x1x"]));
    });
    const triggers = host.querySelectorAll<HTMLButtonElement>('[data-slot="alert-dialog-trigger"]');
    expect(triggers).toHaveLength(2);
    triggers[0]!.click();
    await tick(60);
    const pw = document.querySelector<HTMLInputElement>('[data-slot="alert-dialog-content"] input[type="password"]')!;
    pw.value = "secret";
    pw.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    document.querySelector<HTMLFormElement>('[data-slot="alert-dialog-content"] form')!.requestSubmit();
    await tick(80);
    expect(got).toEqual(["secret"]);
    expect([...host.querySelectorAll('[data-slot="two-factor-recovery-code"]')].map((li) => li.textContent)).toContain("x1x1x-x1x1x");
  });
});

const next = (host: HTMLElement) => [...host.querySelectorAll<HTMLButtonElement>('[data-slot="two-factor-scan"] button')].find((b) => b.textContent!.includes("Next"))!;
