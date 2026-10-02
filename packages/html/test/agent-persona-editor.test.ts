// The agent-persona-editor Blade example, as rendered by Laravel, under real Alpine with the Nasaq runtime.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = () => new Promise((r) => setTimeout(r, 40));

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
  host.innerHTML = rendered("agent-persona-editor");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  const root = host.querySelector<HTMLFormElement>('[data-slot="agent-persona-editor"]')!;
  return { host, root, data: Alpine.$data(root) as Record<string, any> }; // eslint-disable-line @typescript-eslint/no-explicit-any
}

const status = (root: HTMLElement) => root.querySelector('span.text-body-sm[role="status"]')!.textContent;
const save = (root: HTMLElement) => [...root.querySelectorAll<HTMLButtonElement>('button[type="submit"]')][0]!;

describe("agent-persona-editor (Blade example)", () => {
  it("renders the form, the live card and keeps Save off until edited", async () => {
    const { host, root } = await mount();
    expect(host.querySelector('[data-slot="agent-persona-preview"]')!.textContent).toContain("Support agent");
    expect(host.querySelectorAll('[data-slot="agent-persona-preview"] li').length).toBe(3 - 1 + 0);
    expect(save(root).disabled).toBe(true);
    expect(root.querySelector('[data-slot="field-error"]')).not.toBeNull();
  });

  it("follows the draft: dirty, status, counts and the card name", async () => {
    const { host, root, data } = await mount();
    const name = root.querySelector<HTMLInputElement>('input[placeholder="Support agent"]')!;
    name.value = "Billing bot";
    name.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect(data.dirty).toBe(true);
    expect(status(root)).toBe("Unsaved changes");
    expect(save(root).disabled).toBe(false);
    expect(host.querySelector('[data-slot="agent-persona-preview"] p')!.textContent).toBe("Billing bot");
  });

  it("saves through the host event, shows its error, then saves", async () => {
    const { root, data } = await mount();
    const seen: unknown[] = [];
    let n = 0;
    root.addEventListener("nq-persona-save", (e) => {
      const d = (e as CustomEvent).detail;
      seen.push(d.persona.name);
      d.wait(Promise.resolve(n++ === 0 ? { error: "Nope" } : undefined));
    });
    data.draft.name = "Billing bot";
    await tick();
    root.dispatchEvent(new Event("submit", { cancelable: true }));
    await tick();
    expect(status(root)).toBe("Nope");
    expect(data.dirty).toBe(true);
    root.dispatchEvent(new Event("submit", { cancelable: true }));
    await tick();
    expect(status(root)).toBe("Saved.");
    expect(data.dirty).toBe(false);
    expect(seen).toEqual(["Billing bot", "Billing bot"]);
  });

  it("fails when nobody listens, requires a name, adds a section and reverts", async () => {
    const { root, data } = await mount();
    data.draft.name = "";
    await tick();
    root.dispatchEvent(new Event("submit", { cancelable: true }));
    await tick();
    expect(data.nameInvalid).toBe(true);
    expect(data.saving).toBe(false);
    data.draft.name = "X";
    data.addSection("Tone");
    await tick();
    expect(data.draft.persona).toContain("## Tone");
    root.dispatchEvent(new Event("submit", { cancelable: true }));
    await tick();
    expect(status(root)).toBe("The persona could not be saved. Try again.");
    data.revert();
    await tick();
    expect(data.draft.name).toBe("Support agent");
    expect(data.dirty).toBe(false);
  });
});
