// The Blade wallet example under real Alpine: hide / show the balance, the money in / out filter, and the top-up and payout dialogs.
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
  for (const el of [...document.body.children]) {
    Alpine.destroyTree(el as HTMLElement);
    el.remove();
  }
});

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("wallet");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const button = (text: string) => [...document.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.trim() === text)!;
// The dialog content is teleported to the body, so find it by the dialog's accessible title.
const content = (title: string) =>
  [...document.querySelectorAll<HTMLElement>('[data-slot="dialog-content"]')].find((c) => c.querySelector('[data-slot="dialog-title"]')?.textContent?.trim() === title)!;
const hidden = (el: HTMLElement) => getComputedStyle(el).display === "none";
const errorText = (c: HTMLElement) => c.querySelector('[data-slot="field-error"]')!.textContent ?? "";
const type = async (c: HTMLElement, value: string) => {
  const input = c.querySelector<HTMLInputElement>('input[name="amount"]')!;
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await tick();
};
const submit = async (c: HTMLElement) => {
  c.querySelector<HTMLFormElement>("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  await tick();
};

describe("wallet (Blade example)", () => {
  it("hides and shows the balance", async () => {
    const host = await mount();
    const eye = host.querySelector<HTMLButtonElement>('[data-slot="wallet-balance"] button[aria-pressed]')!;
    const figure = host.querySelector<HTMLElement>('[data-slot="wallet-balance"] p.font-semibold')!;
    expect(figure.style.display).not.toBe("none");
    expect(eye.getAttribute("aria-label")).toBe("Hide balance");
    eye.click();
    await tick();
    expect(figure.style.display).toBe("none");
    expect(eye.getAttribute("aria-label")).toBe("Show balance");
    expect(eye.getAttribute("aria-pressed")).toBe("true");
  });

  it("filters transactions by direction and shows the empty state when nothing matches", async () => {
    const host = await mount();
    const row = host.querySelector<HTMLElement>('[data-slot="wallet-transactions"] li[data-dir="in"]')!;
    const toggles = host.querySelectorAll<HTMLButtonElement>('[data-slot="wallet-transactions"] [data-slot="toggle"]');
    expect(row.style.display).not.toBe("none");
    toggles[2]!.click();
    await tick();
    expect(row.style.display).toBe("none");
    expect(host.querySelector<HTMLElement>('[data-slot="empty-state"]')!.parentElement!.style.display).not.toBe("none");
    toggles[1]!.click();
    await tick();
    expect(row.style.display).not.toBe("none");
  });

  it("opens the top-up dialog from the balance button, validates, and closes when nothing handles the event", async () => {
    const host = await mount();
    button("Add funds").click();
    await tick();
    const c = content("Add funds");
    expect(hidden(c)).toBe(false);

    await submit(c);
    expect(errorText(c)).toContain("Enter an amount greater than zero.");
    await type(c, "5");
    await submit(c);
    expect(errorText(c)).toContain("The minimum is $10.00.");

    await type(c, "50");
    expect(c.querySelector('button[type="submit"]')!.textContent).toContain("Add $50.00");
    const seen: { amount: number; sourceId: string }[] = [];
    host.addEventListener("nq-wallet-topup", (e) => seen.push((e as CustomEvent).detail));
    await submit(c);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ amount: 50, sourceId: "visa" });
    expect(hidden(c)).toBe(true);
  });

  it("stays busy on waitUntil, shows a rejection and closes after a successful retry", async () => {
    const host = await mount();
    let attempt = 0;
    host.addEventListener("nq-wallet-topup", (e) => {
      attempt += 1;
      (e as CustomEvent).detail.waitUntil(attempt === 1 ? Promise.reject(new Error("Card declined")) : new Promise((r) => setTimeout(r, 120)));
    });
    button("Add funds").click();
    await tick();
    const c = content("Add funds");
    await type(c, "50");
    await submit(c);
    expect(errorText(c)).toContain("Card declined");
    expect(hidden(c)).toBe(false);
    expect(c.querySelector('button[type="submit"]')!.getAttribute("aria-busy")).not.toBe("true");

    await submit(c);
    await new Promise((r) => setTimeout(r, 5));
    expect(c.querySelector('button[type="submit"]')!.getAttribute("aria-busy")).toBe("true");
    await vi.waitFor(() => expect(hidden(c)).toBe(true), { timeout: 2000 });
  });

  it("payout: caps at the available balance, reports the destination and shows errors", async () => {
    const host = await mount();
    button("Withdraw").click();
    await tick();
    const c = content("Withdraw to your bank");
    await type(c, "2000");
    await submit(c);
    expect(errorText(c)).toContain("The maximum is $1,250.50.");
    button("Withdraw all").click();
    await tick();
    expect(c.querySelector<HTMLInputElement>('input[name="amount"]')!.value).toBe("1250.5");
    let detail: { amount: number; destinationId: string } | undefined;
    host.addEventListener("nq-wallet-payout", (e) => {
      detail = (e as CustomEvent).detail;
      (e as CustomEvent).detail.resolve({ error: "Bank unavailable" });
    });
    await submit(c);
    expect(detail).toMatchObject({ amount: 1250.5, destinationId: "bank" });
    expect(errorText(c)).toContain("Bank unavailable");
    window.dispatchEvent(new CustomEvent("nq-wallet-error", { detail: { message: "Try later" } }));
    await tick();
    expect(errorText(c)).toContain("Try later");
  });
});
