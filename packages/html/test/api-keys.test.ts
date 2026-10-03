// The Blade api-keys example (packages/php/examples/rendered/api-keys.html) under real Alpine.
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
  document.body.innerHTML = "";
});

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("api-keys");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const slot = (name: string) => document.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const type = (el: HTMLInputElement, value: string) => {
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
};

describe("api-keys (Blade example)", () => {
  it("renders the list with status, masked key and scopes", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="api-keys"]')!;
    const rows = [...root.querySelectorAll<HTMLElement>('[data-slot="api-key"]')];
    expect(rows.map((r) => r.dataset.status)).toEqual(["active", "revoked"]);
    expect(rows[0]!.querySelector('[data-slot="api-key-masked"]')!.textContent).toBe("nsq_live_a1b2••••••••wxyz");
    expect(rows[0]!.textContent).toContain("Read");
    expect(rows[0]!.querySelector('[role="group"]')).not.toBeNull();
    expect(rows[1]!.querySelector('[role="group"]')).toBeNull();
  });

  it("validates, then fires create and shows the secret once", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="api-keys"]')!;
    let input: unknown;
    root.addEventListener("create", (e) => {
      const d = (e as CustomEvent).detail;
      input = d.input;
      d.wait(Promise.resolve({ secret: "nsq_live_FULLSECRET" }));
    });
    root.querySelector<HTMLButtonElement>(":scope > [data-slot='card-header'] button")!.click();
    await tick(80);
    const create = slot("api-key-create")!;
    expect(create).toBeTruthy();
    create.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick();
    const alerts = [...create.querySelectorAll<HTMLElement>('[role="alert"]')].filter((a) => a.style.display !== "none");
    expect(alerts.map((a) => a.textContent?.trim())).toEqual(expect.arrayContaining(["Give the key a name.", "Pick at least one scope."]));
    expect(input).toBeUndefined();

    type(create.querySelector<HTMLInputElement>('[data-slot="input"]')!, "CI");
    create.querySelector<HTMLButtonElement>('[data-slot="checkbox"]')!.click();
    await tick();
    create.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick(80);
    expect(input).toEqual({ name: "CI", scopes: ["read"], expiresInDays: 90 });
    const reveal = slot("api-key-reveal")!;
    expect(reveal).toBeTruthy();
    expect(reveal.querySelector<HTMLInputElement>("input")!.value).toBe("nsq_live_FULLSECRET");
  });

  it("shows a server error and keeps the form open", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="api-keys"]')!;
    root.addEventListener("create", (e) => (e as CustomEvent).detail.wait(Promise.resolve({ error: "Name taken" })));
    root.querySelector<HTMLButtonElement>(":scope > [data-slot='card-header'] button")!.click();
    await tick(80);
    const create = slot("api-key-create")!;
    type(create.querySelector<HTMLInputElement>('[data-slot="input"]')!, "Dup");
    create.querySelector<HTMLButtonElement>('[data-slot="checkbox"]')!.click();
    await tick();
    create.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick(80);
    expect(create.textContent).toContain("Name taken");
    expect(slot("api-key-reveal")!.querySelector<HTMLInputElement>("input")!.value).toBe("");
  });

  it("asks before revoking, then fires revoke with the id", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="api-keys"]')!;
    let id: unknown;
    root.addEventListener("revoke", (e) => {
      id = (e as CustomEvent).detail.id;
      (e as CustomEvent).detail.wait(Promise.resolve());
    });
    const row = root.querySelector<HTMLElement>('[data-slot="api-key"]')!;
    const buttons = [...row.querySelectorAll<HTMLButtonElement>('[role="group"] button')];
    expect(buttons.map((b) => b.textContent?.trim())).toEqual(["Rotate", "Revoke"]);
    buttons[1]!.click();
    await tick(80);
    expect(id).toBeUndefined();
    const confirm = [...document.querySelectorAll<HTMLButtonElement>('[data-slot="alert-dialog-action"]')].find((b) => b.textContent?.includes("Revoke key"))!;
    confirm.click();
    await tick(80);
    expect(id).toBe("k1");
  });
});
