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


const CSV = "Name,Email\nSara,sara@example.com\nOmar,not-an-email\nSara2,sara@example.com\n";
const clickButton = async (host: HTMLElement, text: string) => {
  const b = [...host.querySelectorAll("button")].find((x) => x.textContent?.trim().includes(text)) as HTMLButtonElement;
  b.click();
  await tick();
};

describe("nqImportWizard", () => {
  it("starts on the upload step with the stepper", async () => {
    const host = await mount(rendered("import-wizard"));
    const root = host.querySelector('[data-slot="import-wizard"]') as HTMLElement;
    expect(root.getAttribute("data-step")).toBe("0");
    const items = [...host.querySelectorAll('[data-slot="stepper-item"]')];
    expect(items.map((i) => i.getAttribute("data-status"))).toEqual(["current", "upcoming", "upcoming", "upcoming"]);
    expect(host.textContent).toContain("Choose a file");
  });

  it("walks paste, map, review, import and sends only valid rows", async () => {
    const host = await mount(rendered("import-wizard"));
    const root = host.querySelector('[data-slot="import-wizard"]') as HTMLElement;
    let rows: unknown;
    root.addEventListener("import", (e) => (rows = (e as CustomEvent).detail.rows));
    const ta = host.querySelector("textarea") as HTMLTextAreaElement;
    ta.value = CSV;
    ta.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    await clickButton(host, "Use pasted rows");
    expect(root.getAttribute("data-step")).toBe("1");
    expect(host.querySelectorAll("select").length).toBe(2);
    await clickButton(host, "Next");
    expect(root.getAttribute("data-step")).toBe("2");
    expect(host.querySelectorAll('tbody [data-slot="table-row"]:not([style*="display: none"])').length).toBe(3);
    expect(host.textContent).toContain("Import 1 row");
    await clickButton(host, "Import 1 row");
    expect(rows).toEqual([{ name: "Sara", email: "sara@example.com" }]);
    // The example answers with done(): the result screen appears.
    expect(host.textContent).toContain("1 row imported");
    expect(host.textContent).toContain("2 rows skipped");
  });

  it("blocks Next while a required field is unmapped", async () => {
    const host = await mount(rendered("import-wizard"));
    const ta = host.querySelector("textarea") as HTMLTextAreaElement;
    ta.value = "Foo,Bar\n1,2\n";
    ta.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    await clickButton(host, "Use pasted rows");
    const next = [...host.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Next") as HTMLButtonElement;
    expect(next.disabled).toBe(true);
    expect(host.textContent).toContain("Match the required fields first: Name, Email.");
  });
});
