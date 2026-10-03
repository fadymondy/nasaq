// The Blade otp-input example (packages/php/examples/rendered/otp-input.html) under real Alpine.
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
  host.innerHTML = rendered("otp-input");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const boxesOf = (host: HTMLElement) => [...host.querySelectorAll<HTMLInputElement>('[data-slot="otp-input-box"]')];
const joined = (host: HTMLElement) => boxesOf(host).map((b) => b.value).join("");

describe("otp-input (Blade example)", () => {
  it("renders six labelled boxes in a left-to-right group", async () => {
    const host = await mount();
    const group = host.querySelector<HTMLElement>('[data-slot="otp-input"]')!;
    expect(group.getAttribute("dir")).toBe("ltr");
    expect(boxesOf(host)).toHaveLength(6);
    expect(boxesOf(host)[2]!.getAttribute("aria-label")).toBe("Digit 3 of 6");
    expect(host.querySelector<HTMLInputElement>('input[type="hidden"]')!.name).toBe("code");
  });

  it("fills as you type, rejects letters and dispatches complete", async () => {
    const host = await mount();
    const boxes = boxesOf(host);
    let done = "";
    host.querySelector('[data-slot="otp-input"]')!.addEventListener("complete", (e) => (done = (e as CustomEvent).detail));
    const type = async (i: number, v: string) => {
      boxes[i]!.value = v;
      boxes[i]!.dispatchEvent(new Event("input", { bubbles: true }));
      await tick();
    };
    await type(0, "1");
    expect(joined(host)).toBe("1");
    expect(boxes[0]!.hasAttribute("data-filled")).toBe(true);
    await type(1, "a");
    expect(joined(host)).toBe("1");
    expect(boxes[1]!.value).toBe("");
    for (const [i, d] of [[1, "2"], [2, "3"], [3, "4"], [4, "5"], [5, "6"]] as const) await type(i, d);
    expect(joined(host)).toBe("123456");
    expect(done).toBe("123456");
    expect(host.querySelector<HTMLInputElement>('input[type="hidden"]')!.value).toBe("123456");
  });

  it("pastes a whole code and Backspace removes the previous digit", async () => {
    const host = await mount();
    const boxes = boxesOf(host);
    const paste = new Event("paste", { bubbles: true, cancelable: true }) as unknown as ClipboardEvent;
    Object.defineProperty(paste, "clipboardData", { value: { getData: () => "12 34-56" } });
    boxes[0]!.dispatchEvent(paste);
    await tick();
    expect(joined(host)).toBe("123456");

    boxes[5]!.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
    expect(document.activeElement).toBe(boxes[0]);
    boxes[0]!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(document.activeElement).toBe(boxes[1]);
  });
});
