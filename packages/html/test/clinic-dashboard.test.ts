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

describe("clinic-dashboard (Blade example)", () => {
  it("renders the figures and the doctors on duty", async () => {
    const host = await mount(rendered("clinic-dashboard"));
    expect(host.textContent).toContain("Longest wait");
    expect(host.querySelectorAll('[data-slot="clinic-room"]')).toHaveLength(5);
    expect(host.querySelectorAll('[data-slot="clinic-doctor"]')).toHaveLength(3);
  });

  it("selectable rooms and doctors dispatch events with their id", async () => {
    const host = await mount(rendered("clinic-dashboard"));
    const root = host.querySelector<HTMLElement>('[data-slot="clinic-dashboard"]')!;
    const seen: string[] = [];
    root.addEventListener("nq-clinic-room-select", (e) => seen.push(`room:${(e as CustomEvent).detail.id}`));
    root.addEventListener("nq-clinic-doctor-select", (e) => seen.push(`doctor:${(e as CustomEvent).detail.id}`));
    host.querySelector<HTMLElement>('button[data-slot="clinic-room"]')!.click();
    host.querySelector<HTMLElement>('button[data-slot="clinic-doctor"]')!.click();
    await tick();
    expect(seen).toEqual(["room:r1", "doctor:d1"]);
  });
});
