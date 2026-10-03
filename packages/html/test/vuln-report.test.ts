// The Blade example (php/examples/vuln-report.blade.php) under real Alpine: Scan now and the finding ids dispatch bubbling events (inline $dispatch, no module).
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

async function mount() {
  const host = document.createElement("div");
  host.innerHTML = rendered("vuln-report");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

describe("vuln-report (Blade example)", () => {
  it("renders the report with ranked findings and the history bars", async () => {
    const host = await mount();
    expect(host.querySelector('[data-slot="vuln-report"]')!.getAttribute("data-risk")).toBe("danger");
    const rows = host.querySelectorAll('[data-slot="vuln-finding"]');
    expect(rows).toHaveLength(4);
    expect(rows[0]!.textContent).toContain("CVE-2024-45337");
    expect(host.querySelectorAll("ol li[role=img]")).toHaveLength(3);
    expect(host.textContent).toContain("4 fewer than the previous scan");
  });

  it("dispatches nq-scan from Scan now and nq-open-finding with the id from a finding", async () => {
    const host = await mount();
    const seen: Array<[string, unknown]> = [];
    host.addEventListener("nq-scan", () => seen.push(["scan", null]));
    host.addEventListener("nq-open-finding", (e) => seen.push(["open", (e as CustomEvent).detail.id]));
    [...host.querySelectorAll("button")].find((b) => b.textContent!.includes("Scan now"))!.click();
    host.querySelector<HTMLElement>('[data-slot="vuln-finding"] button[type="button"].font-mono')!.click();
    expect(seen).toEqual([["scan", null], ["open", "CVE-2024-45337"]]);
  });
});
