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

const rows = (host: HTMLElement) => [...host.querySelectorAll<HTMLElement>('[data-slot="passkey-row"]')];
const shown = (el: HTMLElement) => el.style.display !== "none";

describe("passkey-list (Blade example)", () => {
  it("renders the rows", async () => {
    const host = await mount(rendered("passkey-list"));
    expect(host.querySelector('[data-slot="passkey-list"]')).not.toBeNull();
    expect(rows(host)).toHaveLength(3);
  });

  it("Remove asks first, then dispatches nq-passkey-remove and removes the row", async () => {
    const host = await mount(rendered("passkey-list"));
    const events: string[] = [];
    host.addEventListener("nq-passkey-remove", (e) => {
      events.push((e as CustomEvent).detail.id);
      (e as CustomEvent).detail.wait(Promise.resolve());
    });
    const first = rows(host)[0]!;
    const trigger = first.querySelector<HTMLButtonElement>('[data-slot="alert-dialog-trigger"]')!;
    trigger.click();
    await tick(60);
    expect(events).toEqual([]);
    openAction().click();
    await tick(60);
    expect(events).toHaveLength(1);
    expect(rows(host).filter(shown)).toHaveLength(2);
  });

  it("a failed remove keeps the row and shows the error", async () => {
    const host = await mount(rendered("passkey-list"));
    host.addEventListener("nq-passkey-remove", (e) => (e as CustomEvent).detail.wait(Promise.resolve({ error: "Server said no" })));
    const first = rows(host)[0]!;
    first.querySelector<HTMLButtonElement>('[data-slot="alert-dialog-trigger"]')!.click();
    await tick(60);
    openAction().click();
    await tick(60);
    expect(rows(host).filter(shown)).toHaveLength(3);
    expect(host.textContent).toContain("Server said no");
  });
});

// Dialog content is teleported to <body> and stays there closed; the open one is not hidden.
function openAction(): HTMLButtonElement {
  const open = [...document.querySelectorAll<HTMLElement>('[data-slot="alert-dialog-content"]')].filter((c) => c.getAttribute("data-open") !== null || c.getAttribute("data-state") === "open" || (c.style.display !== "none" && !c.hidden));
  return open.at(-1)!.querySelector<HTMLButtonElement>('[data-slot="confirm-button-action"]')!;
}
