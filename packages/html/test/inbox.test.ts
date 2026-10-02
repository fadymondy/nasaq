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
});

async function mount(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

describe("inbox (Blade example)", () => {
  it("lists the conversations and counts the views", async () => {
    const host = await mount(rendered("inbox"));
    const root = host.querySelector<HTMLElement>('[data-slot="inbox"]')!;
    expect(root).toBeTruthy();
    expect(root.textContent).toContain("Layla Hassan");
    expect(root.textContent).toContain("Karim Adel");
    // The closed conversation is not in the active view.
    expect(root.textContent).not.toContain("Nour Samir");
  });

  it("opens a conversation and shows its messages", async () => {
    const host = await mount(rendered("inbox"));
    const root = host.querySelector<HTMLElement>('[data-slot="inbox"]')!;
    const events: string[] = [];
    root.addEventListener("nq-inbox-select", (e) => events.push((e as CustomEvent).detail.conversationId));
    const row = [...root.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent!.includes("Layla Hassan"))!;
    row.click();
    await tick();
    expect(events).toEqual(["c1"]);
    expect(root.textContent).toContain("Hi, where is my order?");
    expect(root.querySelector('[data-slot="inbox-composer"]')).toBeTruthy();
  });

  it("sends a reply through nq-inbox-send", async () => {
    const host = await mount(rendered("inbox"));
    const root = host.querySelector<HTMLElement>('[data-slot="inbox"]')!;
    const sent: unknown[] = [];
    root.addEventListener("nq-inbox-send", (e) => sent.push((e as CustomEvent).detail));
    [...root.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent!.includes("Layla Hassan"))!.click();
    await tick();
    const box = root.querySelector<HTMLTextAreaElement>('[data-slot="inbox-composer"] textarea')!;
    box.value = "On its way";
    box.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    root.querySelector<HTMLButtonElement>('[data-slot="inbox-composer"] [data-action="send"]')!.click();
    await tick();
    expect(sent).toHaveLength(1);
    expect(JSON.stringify(sent[0])).toContain("On its way");
  });
});
