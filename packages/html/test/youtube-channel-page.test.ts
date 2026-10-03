// The Blade example (php/examples/youtube-channel-page.blade.php) mounted under real Alpine.
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

const tile = (host: HTMLElement, id: string) => host.querySelector(`[data-metric="${id}"]`)!.closest("button")!;

describe("youtube-channel-page (Blade example)", () => {
  it("renders the channel line, four tiles and three tabs", async () => {
    const host = await mountHtml(rendered("youtube-channel-page"));
    expect(host.querySelector("h1")!.textContent).toBe("YouTube");
    expect(host.textContent).toContain("Nasaq Studio · 48.2K subscribers");
    expect([...host.querySelectorAll("[data-slot=metric-tiles] [data-metric]")].map((e) => e.getAttribute("data-metric"))).toEqual(["views", "watchHours", "subscribers", "avgSeconds"]);
    expect(tile(host, "avgSeconds").textContent).toContain("2m 54s");
    expect([...host.querySelectorAll('[role="tab"]')].map((t) => t.textContent!.trim())).toEqual(["Top videos", "Traffic sources", "Audience"]);
  });

  it("shows watch time and average duration columns for the videos", async () => {
    const host = await mountHtml(rendered("youtube-channel-page"));
    const heads = [...host.querySelectorAll("thead th")].map((h) => h.textContent!.trim());
    expect(heads).toContain("Watch time");
    expect(heads).toContain("Avg. duration");
    const body = host.querySelector("tbody")!.textContent!;
    expect(body).toContain("5m 12s");
    expect(body).toContain("1,320");
  });

  it("lets a tile drive the chart", async () => {
    const host = await mountHtml(rendered("youtube-channel-page"));
    expect(tile(host, "views").getAttribute("aria-pressed")).toBe("true");
    tile(host, "subscribers").click();
    await tick();
    expect(tile(host, "subscribers").getAttribute("aria-pressed")).toBe("true");
    expect(tile(host, "views").getAttribute("aria-pressed")).toBe("false");
    const panel = host.querySelector<HTMLElement>('[data-slot="time-series-panel"]')!;
    const pressed = [...panel.querySelectorAll<HTMLElement>("[data-slot=toggle]")].find((t) => t.getAttribute("aria-pressed") === "true")!;
    expect(pressed.textContent).toContain("Net subscribers");
  });
});
