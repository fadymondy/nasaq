// The Blade example (php/examples/report-editor.blade.php) mounted under real Alpine: editing blocks, the live preview, dirty tracking and Save.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";
import { convertBlock, newBlock, parseNumber, renderPreview, sanitizeHtml, wordCount } from "../src/alpine/report-editor-logic";

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
  host.innerHTML = rendered("report-editor");
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  const root = host.querySelector<HTMLElement>('[data-slot="report-editor"]')!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = () => Alpine.$data(root) as any;
  return { host, root, data };
}

describe("report-editor (Blade example)", () => {
  it("renders the editor with the title, the toolbar and an empty block list", async () => {
    const { root, data } = await mount();
    expect(root.getAttribute("role")).toBe("group");
    expect(root.querySelector<HTMLInputElement>('input[type="text"]')!.value).toBe("May summary");
    expect(data().report.blocks).toHaveLength(0);
    expect(data().view).toBe("edit");
    expect(root.textContent).toContain("Saved");
  });

  it("renders the saved report in the viewer with cover, contents, figures, chart, table and callout", async () => {
    const { host } = await mount();
    const viewer = host.querySelector<HTMLElement>('[data-slot="report-viewer"]')!;
    expect(viewer.querySelector("h1")!.textContent).toBe("May summary");
    expect(viewer.querySelector("nav")!.textContent).toContain("Highlights");
    expect(viewer.textContent).toContain("$12,400");
    expect(viewer.querySelectorAll('[data-slot="report-bar"]')).toHaveLength(2);
    expect(viewer.querySelectorAll("tbody tr")).toHaveLength(2);
    expect(viewer.querySelector('[role="note"]')!.textContent).toContain("Stock is low.");
    expect(viewer.innerHTML).not.toContain("<script");
  });

  it("adds a block, marks the report unsaved and counts the empty block as an issue", async () => {
    const { root, data } = await mount();
    data().add("heading");
    await tick();
    expect(data().report.blocks).toHaveLength(1);
    expect(data().dirty).toBe(true);
    expect(data().issues).toBe(1);
    expect(root.textContent).toContain("Unsaved changes");
    expect(root.querySelectorAll('[data-slot="repeater-row"]')).toHaveLength(1);
  });

  it("follows edits in the preview and switches tabs", async () => {
    const { root, data } = await mount();
    data().add("heading");
    data().report.blocks[0].text = "Summary";
    data().viewSel = ["preview"];
    await tick();
    expect(data().view).toBe("preview");
    expect(root.querySelector('[data-slot="report-viewer"] h3')!.textContent).toBe("Summary");
    data().viewSel = [];
    await tick();
    expect(data().view).toBe("preview");
  });

  it("saves: nq-save carries the report, a promise with an error shows it, and success clears the unsaved state", async () => {
    const { root, data } = await mount();
    const seen: unknown[] = [];
    root.addEventListener("nq-save", (e) => {
      const detail = (e as CustomEvent).detail as { report: unknown; promise?: Promise<unknown> };
      seen.push(detail.report);
      detail.promise = Promise.resolve(seen.length === 1 ? { error: "Server said no" } : undefined);
    });
    data().add("divider");
    await data().save();
    expect(data().status).toBe("error");
    expect(data().message).toBe("Server said no");
    expect(data().dirty).toBe(true);
    await data().save();
    await tick();
    expect(data().status).toBe("idle");
    expect(data().dirty).toBe(false);
    expect(seen).toHaveLength(2);
  });

  it("emits nq-change after an edit and nq-print (cancelable) from the print button", async () => {
    const { root, data } = await mount();
    let changes = 0;
    root.addEventListener("nq-change", () => (changes += 1));
    data().add("text");
    await tick();
    expect(changes).toBeGreaterThan(0);
    let prevented = false;
    root.addEventListener("nq-print", (e) => {
      e.preventDefault();
      prevented = true;
    });
    data().print();
    expect(prevented).toBe(true);
  });

  it("edits nested lists: figures, series, rows, columns", async () => {
    const { data } = await mount();
    data().add("chart");
    data().add("table");
    data().add("metrics");
    const [chart, table, metrics] = data().report.blocks;
    data().addSeries(chart);
    expect(chart.series).toHaveLength(2);
    expect(chart.rows[0].values).toHaveLength(2);
    data().removeSeries(chart, 0);
    data().removeSeries(chart, 0);
    expect(chart.series).toHaveLength(1);
    data().addColumn(table);
    expect(table.rows[0]).toHaveLength(3);
    data().addRow(table);
    expect(table.rows).toHaveLength(2);
    data().addFigure(metrics);
    data().setDelta(metrics.items[0], "12.5");
    expect(metrics.items[0].delta).toBeCloseTo(0.125);
    expect(data().deltaText(metrics.items[0])).toBe("12.5");
    data().convert(2, "heading");
    expect(data().report.blocks[2].type).toBe("heading");
  });
});

describe("report-editor logic", () => {
  it("parses Arabic digits and keeps conversions' text", () => {
    expect(parseNumber("١٢٫٥")).toBe(12.5);
    expect(parseNumber("abc")).toBe(0);
    const h = { ...newBlock("heading"), text: "Hi" };
    expect(convertBlock(h, "text").html).toBe("<p>Hi</p>");
  });
  it("counts words in Arabic and Latin text", () => {
    expect(wordCount({ title: "", blocks: [{ ...newBlock("heading"), text: "مرحبا بالعالم hello" }] })).toBe(3);
  });
  it("sanitizes: scripts go, unsafe links lose their href", () => {
    expect(sanitizeHtml('<p onclick="x()">a</p><script>1</script><a href="javascript:1">go</a>')).toBe('<p dir="auto">a</p><a>go</a>');
  });
  it("renders the preview in Arabic with escaped text", () => {
    const html = renderPreview({ title: "<b>x</b>", blocks: [] }, { emptyReport: "فارغ", titlePlaceholder: "", viewer: "" }, "ar", "u");
    expect(html).toContain("&lt;b&gt;x&lt;/b&gt;");
    expect(html).toContain("فارغ");
  });
});
