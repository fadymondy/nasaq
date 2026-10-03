// The Blade example (php/examples/daily-summary.blade.php) mounted under real Alpine: the day switcher dispatches nq-date-change.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";
import { addCivilDays } from "../src/alpine/daily-summary-logic";

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

describe("daily-summary (Blade example)", () => {
  it("renders the day with its tiles, the goal meter and a disabled next button at maxDate", async () => {
    const host = await mountHtml(rendered("daily-summary"));
    const root = host.querySelector<HTMLElement>('[data-slot="daily-summary"]')!;
    expect(root.dataset.date).toBe("2026-09-29");
    expect(root.getAttribute("aria-labelledby")).toBe(root.querySelector("h2")!.id);
    expect(host.querySelector('[data-slot="daily-summary-water"] [data-slot="meter"]')!.getAttribute("aria-valuenow")).toBe("2400");
    expect(host.querySelectorAll('[data-slot="daily-summary-tally"]')).toHaveLength(2);
    const [prev, next] = [...root.querySelectorAll<HTMLButtonElement>("header button")];
    expect(prev!.disabled).toBe(false);
    expect(next!.disabled).toBe(true);
  });

  it("dispatches nq-date-change with the neighbouring civil date", async () => {
    const host = await mountHtml(rendered("daily-summary"));
    const root = host.querySelector<HTMLElement>('[data-slot="daily-summary"]')!;
    const seen: string[] = [];
    host.addEventListener("nq-date-change", (e) => seen.push((e as CustomEvent<{ date: string }>).detail.date));
    root.querySelector<HTMLButtonElement>('header button[aria-label="Previous day"]')!.click();
    expect(seen).toEqual(["2026-09-28"]);
  });

  it("does civil-date arithmetic across month ends", () => {
    expect(addCivilDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addCivilDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});
