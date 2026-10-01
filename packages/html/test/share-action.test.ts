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

describe("nqShareAction", () => {
  it("opens the dialog with the people and the link", async () => {
    const host = await mount(rendered("share-action"));
    host.querySelector<HTMLElement>('[data-slot="share-button"]')!.click();
    await tick();
    const dialog = document.querySelector<HTMLElement>('[data-slot="share-dialog"]')!;
    expect(dialog).not.toBeNull();
    expect(dialog.textContent).toContain("Share: Q3 plan");
    expect(dialog.querySelectorAll('[data-slot="share-person"]')).toHaveLength(2);
    expect(dialog.querySelector<HTMLInputElement>('[data-slot="input-group-input"]')!.value).toBe("https://app.example.com/docs/q3-plan");
  });

  it("removes a person and announces it", async () => {
    const host = await mount(rendered("share-action"));
    const events: string[] = [];
    host.firstElementChild!.addEventListener("remove", (e) => events.push((e as CustomEvent).detail.person.id));
    host.querySelector<HTMLElement>('[data-slot="share-button"]')!.click();
    await tick();
    const rows = document.querySelectorAll<HTMLElement>('[data-slot="share-person"]');
    rows[1]!.querySelector<HTMLElement>('button[aria-label="Remove Omar Nasser"]')!.click();
    await tick();
    expect(events).toEqual(["2"]);
    expect(document.querySelectorAll('[data-slot="share-person"]')).toHaveLength(1);
  });

  it("copies the link and fires copy", async () => {
    const host = await mount(rendered("share-action"));
    let copied = "";
    host.firstElementChild!.addEventListener("copy", (e) => (copied = (e as CustomEvent).detail.url));
    Object.defineProperty(navigator, "clipboard", { value: { writeText: async () => undefined }, configurable: true });
    host.querySelector<HTMLElement>('[data-slot="share-button"]')!.click();
    await tick();
    document.querySelector<HTMLElement>('[data-slot="share-copy"]')!.click();
    await tick(60);
    expect(copied).toBe("https://app.example.com/docs/q3-plan");
  });
});
