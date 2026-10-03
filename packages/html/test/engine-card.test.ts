// The Blade example (php/examples/engine-card.blade.php) mounted under real Alpine: static readouts plus the nqEngineCard log actions.
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

async function mountHtml(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

describe("engine-card (Blade example)", () => {
  it("renders each engine with state attributes, the countdown and a blocked button", async () => {
    const host = await mountHtml(rendered("engine-card"));
    const cards = [...host.querySelectorAll<HTMLElement>('[data-slot="engine-card"], [data-engine]')];
    expect(cards.map((c) => c.getAttribute("data-engine"))).toEqual(["hydration", "caffeine", "medication", "triggers"]);
    const hydration = cards[0]!;
    expect(hydration.getAttribute("data-state")).toBe("cooldown");
    expect(hydration.getAttribute("data-tone")).toBe("info");
    expect(hydration.querySelector('[data-slot="engine-card-state"]')!.textContent).toContain("Cooling down");
    expect(hydration.querySelectorAll('[data-slot="engine-card-units"] li')).toHaveLength(20);
    const primary = hydration.querySelector<HTMLButtonElement>("[data-slot=card-footer] button")!;
    expect(primary.textContent).toContain("Wait");
    expect(primary.disabled).toBe(true);
    expect(hydration.querySelector('[data-slot="engine-card-details"]')!.getAttribute("href")).toBe("/engines/hydration");
    expect(host.querySelectorAll('[data-slot="engine-card-doses"] li')).toHaveLength(2);
  });

  it("dispatches nq-engine-action, stays busy until wait() settles and shows the server error", async () => {
    const host = await mountHtml(rendered("engine-card"));
    const card = host.querySelector<HTMLElement>('[data-engine="caffeine"]')!;
    const button = card.querySelector<HTMLButtonElement>("[data-slot=card-footer] button")!;
    const error = card.querySelector<HTMLElement>('[data-slot="engine-card-error"]')!;
    expect(error.style.display).toBe("none");

    const seen: { engine: string; kind: string }[] = [];
    let release!: (v: { error: string }) => void;
    card.addEventListener("nq-engine-action", (e) => {
      const d = (e as CustomEvent).detail;
      seen.push({ engine: d.engine, kind: d.kind });
      d.wait(new Promise((r) => (release = r)));
    });

    button.click();
    await tick();
    expect(seen).toEqual([{ engine: "caffeine", kind: "log_wake" }]);
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");

    release({ error: "Too soon" });
    await tick();
    expect(button.disabled).toBe(false);
    expect(button.hasAttribute("aria-busy")).toBe(false);
    expect(error.style.display).not.toBe("none");
    expect(error.textContent).toBe("Too soon");
  });

  it("passes the dose id for Log dose and finishes at once without a listener wait", async () => {
    const host = await mountHtml(rendered("engine-card"));
    const card = host.querySelector<HTMLElement>('[data-engine="medication"]')!;
    const buttons = card.querySelectorAll<HTMLButtonElement>('[data-slot="engine-card-doses"] button');
    expect(buttons).toHaveLength(1);
    const ids: unknown[] = [];
    card.addEventListener("nq-engine-action", (e) => ids.push((e as CustomEvent).detail.doseId));
    buttons[0]!.click();
    await tick();
    expect(ids).toEqual(["b"]);
    expect(buttons[0]!.disabled).toBe(false);
  });
});
