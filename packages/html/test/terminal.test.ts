// The Blade example (php/examples/terminal.blade.php) mounted under real Alpine: search, pick, branch default.
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

async function mountHtml(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

describe("terminal (Blade example)", () => {
  it("renders rows with the prompt, colours and the streaming state, and appends on an event", async () => {
    const host = await mountHtml(rendered("terminal"));
    const root = host.querySelector<HTMLElement>('[data-slot="terminal"]')!;
    expect(root.dir).toBe("ltr");
    expect(root.hasAttribute("data-streaming")).toBe(true);
    let rows = host.querySelectorAll('[data-slot="terminal-row"]');
    expect(rows).toHaveLength(3);
    expect(rows[0]!.textContent).toContain("$");
    expect(rows[2]!.getAttribute("data-kind")).toBe("error");
    expect(rows[1]!.querySelector<HTMLElement>("span span")!.style.color).toBe("var(--nq-success-text)");

    root.dispatchEvent(new CustomEvent("nq-terminal-write", { detail: { lines: ["more"] } }));
    root.dispatchEvent(new CustomEvent("nq-terminal-state", { detail: { streaming: false } }));
    await tick();
    rows = host.querySelectorAll('[data-slot="terminal-row"]');
    expect(rows).toHaveLength(4);
    expect(root.hasAttribute("data-streaming")).toBe(false);
  });

  it("clear empties the output; the command input is busy until the listener settles and walks history", async () => {
    const host = await mountHtml(rendered("terminal"));
    const root = host.querySelector<HTMLElement>('[data-slot="terminal"]')!;
    let release!: () => void;
    const seen: string[] = [];
    root.addEventListener("nq-terminal-command", (e) => {
      const d = (e as CustomEvent).detail;
      seen.push(d.command);
      d.wait(new Promise<void>((r) => (release = r)));
    });
    const input = host.querySelector<HTMLInputElement>('[data-slot="terminal-input"] input')!;
    input.value = "ls";
    input.dispatchEvent(new Event("input"));
    host.querySelector("form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await tick();
    expect(seen).toEqual(["ls"]);
    expect(input.disabled).toBe(true);
    release();
    await tick();
    expect(input.disabled).toBe(false);
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", cancelable: true }));
    await tick();
    expect(input.value).toBe("ls");

    host.querySelector<HTMLElement>('button[aria-label="Clear"]')!.click();
    await tick();
    expect(host.querySelectorAll('[data-slot="terminal-row"]')).toHaveLength(0);
  });
});
