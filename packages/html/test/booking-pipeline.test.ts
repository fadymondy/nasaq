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

const btn = (label: string) => [...document.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent!.trim() === label)!;
const visible = (el: Element) => (el as HTMLElement).style.display !== "none";

describe("booking-pipeline (Blade example)", () => {
  it("shows the stages, the allowed moves and the history", async () => {
    const host = await mount(rendered("booking-pipeline"));
    const items = [...host.querySelectorAll<HTMLElement>('[data-slot="stepper-item"]')];
    expect(items.map((i) => i.dataset.status)).toEqual(["complete", "current", "upcoming", "upcoming", "upcoming"]);
    expect(visible(btn("Check in"))).toBe(true);
    expect(visible(btn("Confirm"))).toBe(false);
    expect(host.querySelectorAll('[data-slot="timeline-item"]')).toHaveLength(2);
    expect(host.querySelector('[data-slot="booking-status-badge"]')!.getAttribute("data-status")).toBe("confirmed");
  });

  it("moves on a click, fires advance and can be put back with fail", async () => {
    const host = await mount(rendered("booking-pipeline"));
    const root = host.querySelector<HTMLElement>('[data-slot="booking-pipeline"]')!;
    let fail: ((m?: string) => void) | undefined;
    root.addEventListener("advance", (e) => {
      fail = (e as CustomEvent).detail.fail;
      expect((e as CustomEvent).detail.to).toBe("checked_in");
    });
    btn("Check in").click();
    await tick();
    expect(root.getAttribute("data-status")).toBe("checked_in");
    expect(host.querySelectorAll('[data-slot="timeline-item"]')).toHaveLength(3);
    fail!("Slot is gone");
    await tick();
    expect(root.getAttribute("data-status")).toBe("confirmed");
    expect(host.querySelectorAll('[data-slot="timeline-item"]')).toHaveLength(2);
    expect(host.querySelector('[role="alert"]')!.textContent).toBe("Slot is gone");
  });

  it("asks before cancelling", async () => {
    const host = await mount(rendered("booking-pipeline"));
    const root = host.querySelector<HTMLElement>('[data-slot="booking-pipeline"]')!;
    btn("Cancel booking").click();
    await tick(300);
    const dlg = document.querySelector<HTMLElement>('[data-slot="alert-dialog-content"]')!;
    expect(dlg.textContent).toContain("Cancelled?");
    expect(root.getAttribute("data-status")).toBe("confirmed");
    [...dlg.querySelectorAll("button")].find((b) => b.textContent!.trim() === "Cancel booking")!.click();
    await tick();
    expect(root.getAttribute("data-status")).toBe("cancelled");
    expect(host.querySelector('[data-slot="stepper-item"][data-status="error"]')).not.toBeNull();
  });
});
