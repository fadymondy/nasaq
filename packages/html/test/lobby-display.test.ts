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

describe("lobby-display (Blade example)", () => {
  it("renders the rooms, the line and no names", async () => {
    const host = await mount(rendered("lobby-display"));
    const rooms = [...host.querySelectorAll<HTMLElement>("[data-room]")];
    expect(rooms.map((r) => r.dataset.state)).toEqual(["free", "serving", "called"]);
    expect(host.textContent).toContain("A-015");
    expect(host.textContent).toContain("Nasaq Clinic");
    expect(host.querySelector('[aria-live="assertive"]')!.textContent).toBe("");
  });

  it("toggles sound and fires nq-lobby-sound", async () => {
    const host = await mount(rendered("lobby-display"));
    const events: boolean[] = [];
    host.addEventListener("nq-lobby-sound", (e) => events.push((e as CustomEvent).detail.on));
    const btn = host.querySelector<HTMLButtonElement>("[data-sound]")!;
    expect(btn.getAttribute("aria-pressed")).toBe("false");
    btn.click();
    await tick();
    expect(btn.getAttribute("aria-pressed")).toBe("true");
    expect(btn.textContent).toContain("Sound on");
    expect(events).toEqual([true]);
  });

  it("announces and highlights a call that arrives after the first render", async () => {
    const host = await mount(rendered("lobby-display"));
    const room1 = host.querySelector<HTMLElement>('[data-room="1"]')!;
    expect(room1.hasAttribute("data-fresh")).toBe(false);
    room1.setAttribute("data-call", "c:999");
    room1.setAttribute("data-announce", "Ticket A-016, please go to Room 1.");
    await tick();
    expect(host.querySelector('[aria-live="assertive"]')!.textContent).toBe("Ticket A-016, please go to Room 1.");
    expect(room1.hasAttribute("data-fresh")).toBe(true);
  });
});
