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


const key = (el: Element, k: string) => el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));

describe("nqKanbanBoard", () => {
  it("renders columns and cards in order", async () => {
    const host = await mount(rendered("kanban-board"));
    expect(host.querySelectorAll('[data-slot="kanban-column"]').length).toBe(2);
    const ids = [...host.querySelectorAll('[data-slot="kanban-item"]')].map((e) => e.getAttribute("data-card-id"));
    expect(ids).toEqual(["a", "b"]);
    expect(host.textContent).toContain("Write the brief");
    expect(host.textContent).toContain("SA");
  });

  it("lifts with Space, moves with arrows, drops and fires move", async () => {
    const host = await mount(rendered("kanban-board"));
    const root = host.querySelector('[data-slot="kanban-board"]') as HTMLElement;
    let detail: { cardId: string; toColumn: string; toIndex: number } | undefined;
    root.addEventListener("move", (e) => (detail = (e as CustomEvent).detail));
    const q = () => host.querySelector('[data-card-id="a"]') as HTMLElement;
    const card = q();
    key(card, " ");
    await tick();
    expect(card.getAttribute("data-dragging")).toBe("");
    key(card, "ArrowRight");
    await tick();
    key(q(), " ");
    await tick();
    expect(detail).toMatchObject({ cardId: "a", toColumn: "done" });
    expect(host.querySelector('[data-column-id="done"] [data-card-id="a"]')).not.toBeNull();
    expect(q().getAttribute("data-dragging")).toBeNull();
  });

  it("Escape cancels without firing move", async () => {
    const host = await mount(rendered("kanban-board"));
    const root = host.querySelector('[data-slot="kanban-board"]') as HTMLElement;
    let fired = false;
    root.addEventListener("move", () => (fired = true));
    const q = () => host.querySelector('[data-card-id="a"]') as HTMLElement;
    const card = q();
    key(card, " ");
    await tick();
    key(card, "ArrowRight");
    await tick();
    key(q(), "Escape");
    await tick();
    expect(fired).toBe(false);
    expect(host.querySelector('[data-column-id="todo"] [data-card-id="a"]')).not.toBeNull();
  });
});
