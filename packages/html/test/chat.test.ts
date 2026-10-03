// The chat Blade example, as rendered by Laravel, under real Alpine with the Nasaq runtime.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
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
  host.innerHTML = rendered("chat");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

describe("chat (Blade example)", () => {
  it("renders the log with its messages", async () => {
    const host = await mount();
    const log = host.querySelector('[role="log"]')!;
    expect(log.getAttribute("aria-label")).toBe("Conversation");
    expect(host.querySelectorAll('[data-slot="chat-message"]').length).toBe(3);
    expect(host.querySelector('[data-slot="chat-jump"]')!.getAttribute("style")).toContain("display: none");
  });

  it("sends the trimmed text on Enter, clears the field and ignores Shift+Enter", async () => {
    const host = await mount();
    const composer = host.querySelector<HTMLElement>('[data-slot="chat-composer"]')!;
    const field = composer.querySelector<HTMLTextAreaElement>("textarea")!;
    const send = composer.querySelector<HTMLButtonElement>('button[aria-label="Send"]')!;
    const got: string[] = [];
    composer.addEventListener("nq-send", (e) => got.push((e as CustomEvent).detail.text));

    expect(send.disabled).toBe(true);
    field.value = "  hello  ";
    field.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect(send.disabled).toBe(false);

    field.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", shiftKey: true, bubbles: true, cancelable: true }));
    await tick();
    expect(got).toEqual([]);

    field.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await tick();
    expect(got).toEqual(["hello"]);
    expect(field.value).toBe("");
    expect(send.disabled).toBe(true);
  });

  it("blocks sending while streaming", async () => {
    const host = await mount();
    const composer = host.querySelector<HTMLElement>('[data-slot="chat-composer"]')!;
    const field = composer.querySelector<HTMLTextAreaElement>("textarea")!;
    const got: string[] = [];
    composer.addEventListener("nq-send", (e) => got.push((e as CustomEvent).detail.text));
    composer.dispatchEvent(new CustomEvent("nq-chat-streaming", { detail: { streaming: true } }));
    field.value = "hi";
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await tick();
    expect(got).toEqual([]);
  });
});
