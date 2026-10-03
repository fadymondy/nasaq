import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
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

describe("copy-button (Blade example)", () => {
  it("copies the value, shows the check, announces it and fires nq:copy", async () => {
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const host = await mount(rendered("copy-button"));
    const button = host.querySelector<HTMLButtonElement>('[data-slot="copy-button"]')!;
    expect(button.getAttribute("aria-label")).toBe("Copy API key");
    expect(button.hasAttribute("data-copied")).toBe(false);
    const status = button.parentElement!.querySelector<HTMLElement>('[data-slot="copy-button-status"]')!;
    const [copyIcon, checkIcon] = [...button.querySelectorAll<SVGElement>("svg")] as [SVGElement, SVGElement];
    expect(checkIcon.style.display).toBe("none");
    const texts: string[] = [];
    host.addEventListener("nq:copy", (e) => texts.push((e as CustomEvent).detail.text));

    button.click();
    await tick();
    expect(writeText).toHaveBeenCalledWith("sk_live_51Nasaq");
    expect(texts).toEqual(["sk_live_51Nasaq"]);
    expect(button.hasAttribute("data-copied")).toBe(true);
    expect(status.textContent).toBe("Copied to clipboard");
    expect(copyIcon.style.display).toBe("none");
    expect(checkIcon.style.display).toBe("");
  });

  it("the field is a read-only left-to-right input next to a copy button", async () => {
    const host = await mount(rendered("copy-button"));
    const input = host.querySelector<HTMLInputElement>('[data-slot="copy-field"] input')!;
    expect(input.readOnly).toBe(true);
    expect(input.getAttribute("dir")).toBe("ltr");
    expect(input.value).toBe("https://nasaq.app/invite/9");
    expect(host.querySelectorAll('[data-slot="copy-field"] [data-slot="copy-button"]')).toHaveLength(1);
  });
});
