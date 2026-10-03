// The Blade user-actions-menu example (packages/php/examples/rendered/user-actions-menu.html) under real Alpine.
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
  host.innerHTML = rendered("user-actions-menu");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host.querySelector<HTMLElement>('[data-slot="user-actions-menu"]')!;
}

const type = (el: HTMLInputElement, value: string) => {
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
};
const button = (text: string) => [...document.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.trim() === text && b.offsetParent !== null || b.textContent?.trim() === text);
const visible = (el: Element | null | undefined) => !!el && (el as HTMLElement).style.display !== "none";

describe("user-actions-menu (Blade example)", () => {
  it("renders a labelled trigger and opens a menu with the enabled actions", async () => {
    const root = await mount();
    expect(root.dataset.variant).toBe("menu");
    const trigger = root.querySelector<HTMLButtonElement>("button")!;
    expect(trigger.getAttribute("aria-label")).toBe("Actions for Mona Saleh");
    trigger.click();
    await tick(80);
    const items = [...document.querySelectorAll<HTMLElement>('[data-slot="dropdown-menu-item"]')];
    expect(items.map((i) => i.dataset.action)).toEqual(["edit", "impersonate", "password", "magic-link", "delete"]);
    expect(items.at(-1)!.dataset.variant).toBe("danger");
  });

  it("validates the email, then fires edit with the values", async () => {
    const root = await mount();
    let values: unknown;
    root.addEventListener("edit", (e) => {
      values = (e as CustomEvent).detail.values;
      (e as CustomEvent).detail.wait(Promise.resolve());
    });
    root.querySelector<HTMLButtonElement>("button")!.click();
    await tick(80);
    document.querySelector<HTMLElement>('[data-action="edit"]')!.click();
    await tick(80);
    const form = document.querySelector<HTMLFormElement>('[data-slot="dialog-content"] form')!;
    const email = form.querySelector<HTMLInputElement>('input[type="email"]')!;
    expect(email.value).toBe("mona@example.com");
    type(email, "nope");
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick();
    expect(values).toBeUndefined();
    expect(form.querySelector('[data-slot="field-error"]')?.textContent).toContain("Enter a valid email address.");
    type(email, "mona2@example.com");
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick(80);
    expect(values).toEqual({ email: "mona2@example.com", roles: ["editor"], permissions: ["users:read"] });
  });

  it("asks before deleting and shows a server error", async () => {
    const root = await mount();
    let calls = 0;
    root.addEventListener("delete", (e) => {
      calls++;
      (e as CustomEvent).detail.wait(Promise.resolve({ error: "Not allowed" }));
    });
    root.querySelector<HTMLButtonElement>("button")!.click();
    await tick(80);
    document.querySelector<HTMLElement>('[data-action="delete"]')!.click();
    await tick(80);
    expect(calls).toBe(0);
    const dialog = document.querySelector<HTMLElement>('[data-slot="alert-dialog-content"]')!;
    expect(dialog.textContent).toContain("Delete Mona Saleh?");
    dialog.querySelector<HTMLButtonElement>('[data-action="confirm-delete"]')!.click();
    await tick(80);
    expect(calls).toBe(1);
    expect(dialog.textContent).toContain("Not allowed");
    expect(visible(dialog)).toBe(true);
  });

  it("sends a magic link and shows it with a copy field", async () => {
    const root = await mount();
    root.addEventListener("magic-link", (e) => (e as CustomEvent).detail.wait(Promise.resolve({ link: "https://x.test/l/1" })));
    root.querySelector<HTMLButtonElement>("button")!.click();
    await tick(80);
    document.querySelector<HTMLElement>('[data-action="magic-link"]')!.click();
    await tick(120);
    const input = [...document.querySelectorAll<HTMLInputElement>('[data-slot="copy-field"] input')].find((i) => i.value === "https://x.test/l/1");
    expect(input).toBeTruthy();
    expect(button("Done")).toBeTruthy();
  });

  it("rejects a short password and fires set-password otherwise", async () => {
    const root = await mount();
    let pw: unknown;
    root.addEventListener("set-password", (e) => {
      pw = (e as CustomEvent).detail.password;
      (e as CustomEvent).detail.wait(Promise.resolve());
    });
    root.querySelector<HTMLButtonElement>("button")!.click();
    await tick(80);
    document.querySelector<HTMLElement>('[data-action="password"]')!.click();
    await tick(120);
    const form = [...document.querySelectorAll<HTMLFormElement>('[data-slot="dialog-content"] form')].find((f) => f.querySelector('[data-slot="password-input"]'))!;
    const input = form.querySelector<HTMLInputElement>('[data-slot="password-input"] input')!;
    type(input, "short");
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick();
    expect(pw).toBeUndefined();
    expect(form.textContent).toContain("Use at least 8 characters.");
    type(input, "long-enough-1");
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick(80);
    expect(pw).toBe("long-enough-1");
    expect(form.textContent).toContain("The password was changed.");
  });
});
