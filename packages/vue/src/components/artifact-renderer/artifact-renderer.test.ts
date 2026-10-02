import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NasaqProvider } from "../../provider";
import { type ChartArtifact, NqArtifactList, NqArtifactRenderer, NqArtifactView, extractArtifacts, parseArtifact, pieSlices } from ".";

afterEach(() => {
  document.body.innerHTML = "";
  localStorage.clear();
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

const art = (input: unknown) => {
  const r = parseArtifact(input);
  if (!r.ok) throw new Error(r.error);
  return r.artifact;
};

const table = {
  kind: "table",
  title: "Overdue invoices",
  columns: [
    { key: "n", label: "No." },
    { key: "amt", label: "Amount", align: "end" },
  ],
  rows: [{ n: "INV-1", amt: 1200 }],
};

describe("NqArtifactRenderer", () => {
  it("renders a table in an artifact card with the kind on the root", () => {
    const w = mount(NqArtifactRenderer, { props: { artifact: table, class: "mt-2" } });
    expect(w.attributes("data-slot")).toBe("artifact-renderer");
    expect(w.attributes("data-kind")).toBe("table");
    expect(w.classes()).toEqual(expect.arrayContaining(["min-w-0", "mt-2"]));
    expect(w.find('[data-slot="artifact"]').attributes("data-kind")).toBe("table");
    expect(w.find('[data-slot="card-title"]').text()).toBe("Overdue invoices");
    expect(w.findAll("th").map((h) => h.text())).toEqual(["No.", "Amount"]);
    const cells = w.findAll("td");
    expect(cells[0]!.text()).toBe("INV-1");
    expect(cells[1]!.classes()).toEqual(expect.arrayContaining(["text-end", "tabular-nums"]));
    expect(cells[1]!.text()).toContain("1,200");
  });

  it("shows a warning, never markup, for bad input", () => {
    const w = mount(NqArtifactRenderer, { props: { artifact: { kind: "table", columns: "nope" } } });
    expect(w.attributes("data-kind")).toBe("invalid");
    expect(w.find('[data-slot="alert"]').attributes("data-tone")).toBe("warning");
    expect(w.text()).toContain("Unsupported content");
    expect(w.text()).toContain("columns must be an array");
    const unknown = mount(NqArtifactRenderer, { props: { artifact: "<script>x</script>" } });
    expect(unknown.text()).toContain("This content could not be shown");
    expect(unknown.find("script").exists()).toBe(false);
  });

  it("picks the Arabic text and labels under an Arabic provider", () => {
    const artifact = { kind: "card", title: { en: "Status", ar: "الحالة" }, fields: [{ label: "OK", value: true }] };
    const w = mount({ components: { NasaqProvider, NqArtifactRenderer }, setup: () => ({ artifact }), template: `<NasaqProvider locale="ar"><NqArtifactRenderer :artifact="artifact" /></NasaqProvider>` });
    expect(w.find('[data-slot="card-title"]').text()).toBe("الحالة");
    expect(w.find("dd").text()).toBe("نعم");
  });

  it("renders card badges, fields, list rows with a tone, a body and a note", () => {
    const w = mount(NqArtifactView, {
      props: {
        artifact: art({
          kind: "card",
          title: "Order",
          badges: [{ label: "Paid", tone: "success" }],
          fields: [{ label: "Total", value: 12 }, { label: "Note", value: null }],
          items: [{ label: "Late", value: 3, tone: "danger" }],
          body: "Some **bold** text",
          footer: "Source: billing",
        }),
      },
    });
    expect(w.find('[data-slot="badge"]').text()).toBe("Paid");
    expect(w.findAll("dt").map((d) => d.text())).toEqual(["Total", "Note"]);
    expect(w.findAll("dd")[1]!.text()).toBe("—");
    const dot = w.find('[data-slot="artifact-items"] [data-tone="danger"]');
    expect(dot.attributes("aria-hidden")).toBe("true");
    expect(dot.classes()).toContain("bg-nq-danger");
    expect(w.find('[data-slot="artifact-items"] .sr-only').text()).toBe("Critical:");
    expect(w.find("strong").text()).toBe("bold");
    expect(w.find('[data-slot="artifact-note"]').text()).toBe("Source: billing");
  });

  it("draws charts as SVG with series variables and a legend for several series", () => {
    const base = { kind: "chart", xKey: "m", data: [{ m: "Jan", a: 10, b: 4 }, { m: "Feb", a: 20, b: 8 }], series: [{ key: "a", label: "Revenue" }, { key: "b", label: "Cost", color: "var(--nq-tag-teal)" }] };
    const bar = mount(NqArtifactRenderer, { props: { artifact: { ...base, title: "Sales" } } });
    const chart = bar.find('[data-slot="chart"]');
    expect(chart.attributes("role")).toBe("img");
    expect(chart.attributes("aria-label")).toBe("Chart: Sales");
    expect(chart.attributes("style")).toContain("--color-s1: var(--nq-tag-teal)");
    expect(bar.findAll("svg path[fill='var(--color-s0)']")).toHaveLength(2);
    expect(bar.find('[data-slot="chart-legend"]').text()).toContain("Cost");
    const line = mount(NqArtifactRenderer, { props: { artifact: { ...base, chart: "line", series: [base.series[0]] } } });
    expect(line.find("svg path[stroke='var(--color-s0)']").exists()).toBe(true);
    expect(line.find('[data-slot="chart-legend"]').exists()).toBe(false);
    const area = mount(NqArtifactRenderer, { props: { artifact: { ...base, chart: "area" } } });
    expect(area.findAll("svg path[fill-opacity='0.15']")).toHaveLength(2);
  });

  it("draws pie and donut slices and folds the tail into Other", () => {
    const data = Array.from({ length: 10 }, (_, i) => ({ k: `S${i}`, v: 10 - i }));
    const artifact = { kind: "chart", chart: "donut", xKey: "k", series: [{ key: "v", label: "Value" }], data };
    expect(pieSlices(art(artifact) as ChartArtifact)).toHaveLength(8);
    const w = mount(NqArtifactRenderer, { props: { artifact } });
    expect(w.findAll("svg path")).toHaveLength(8);
    expect(w.find('[data-slot="chart-legend"]').text()).toContain("Other");
  });

  it("mirrors the cartesian chart in RTL (Y axis on the right)", () => {
    const artifact = { kind: "chart", xKey: "m", data: [{ m: "Jan", a: 10 }], series: [{ key: "a", label: "A" }] };
    const w = mount({ components: { NasaqProvider, NqArtifactRenderer }, setup: () => ({ artifact }), template: `<NasaqProvider locale="ar"><NqArtifactRenderer :artifact="artifact" /></NasaqProvider>` });
    expect(w.find("svg text").attributes("text-anchor")).toBe("start");
  });

  it("keeps HTML as code unless allowHtml, then uses an empty sandbox", () => {
    const html = { kind: "html", html: "<b>hi</b>", height: 1000 };
    const off = mount(NqArtifactRenderer, { props: { artifact: html } });
    expect(off.find("iframe").exists()).toBe(false);
    expect(off.find('[data-slot="code-block"]').exists()).toBe(true);
    expect(off.text()).toContain("shown as code");
    const on = mount(NqArtifactRenderer, { props: { artifact: html, allowHtml: true } });
    const frame = on.find("iframe");
    expect(frame.attributes("sandbox")).toBe("");
    expect(frame.attributes("srcdoc")).toContain("Content-Security-Policy");
    expect(frame.attributes("style")).toContain("height: 600px");
  });

  it("renders stats with a tone dot and a non-numeric value", () => {
    const w = mount(NqArtifactRenderer, { props: { artifact: { kind: "stats", items: [{ label: "Revenue", value: 48210, delta: 0.1, tone: "success" }, { label: "Plan", value: "Pro" }] } } });
    const cards = w.findAll('[data-slot="stat-card"]');
    expect(cards).toHaveLength(2);
    expect(cards[0]!.attributes("data-tone")).toBe("success");
    expect(cards[0]!.find(".sr-only").text()).toBe("Good:");
    expect(cards[1]!.find('[data-slot="stat-card-value"]').text()).toBe("Pro");
  });

  it("renders code through the code block and markdown through Markdown", () => {
    const code = mount(NqArtifactRenderer, { props: { artifact: { kind: "code", code: "const a = 1", language: "ts", filename: "a.ts" } } });
    expect(code.find('[data-slot="code-block"]').attributes("data-language")).toBe("ts");
    const md = mount(NqArtifactRenderer, { props: { artifact: { kind: "markdown", text: "## Hi\n- one" } } });
    expect(md.find("h2").text()).toBe("Hi");
    expect(md.find("li").text()).toBe("one");
  });
});

describe("actions", () => {
  it("calls onAction and shows a returned error", async () => {
    const onAction = vi.fn(async () => ({ error: "Nope" }));
    const w = mount(NqArtifactRenderer, { props: { artifact: { kind: "actions", actions: [{ id: "go", label: "Go", variant: "primary" }] }, onAction } });
    await w.find("button").trigger("click");
    await flushPromises();
    expect(onAction).toHaveBeenCalledWith("go", expect.objectContaining({ kind: "actions" }));
    expect(w.find('[data-slot="alert"]').text()).toContain("Nope");
  });

  it("asks first when an action has confirm", async () => {
    const onAction = vi.fn();
    const w = mount(NqArtifactRenderer, { attachTo: document.body, props: { artifact: { kind: "actions", actions: [{ id: "del", label: "Delete", variant: "danger", confirm: "Really?" }] }, onAction } });
    await w.find("button").trigger("click");
    await flushPromises();
    expect(onAction).not.toHaveBeenCalled();
    const dialog = document.querySelector('[data-slot="artifact-confirm"]')!;
    expect(dialog.textContent).toContain("Really?");
    const confirm = [...dialog.querySelectorAll("button")].find((b) => b.textContent === "Confirm")!;
    confirm.click();
    await flushPromises();
    expect(onAction).toHaveBeenCalledWith("del", expect.anything());
    w.unmount();
  });
});

describe("picker", () => {
  it("single mode picks one option and sends it once", async () => {
    const onPick = vi.fn(async () => {});
    const w = mount(NqArtifactRenderer, { props: { artifact: { kind: "picker", title: "Who", options: [{ value: "a", label: "A" }, { value: "b", label: "B", description: "second" }] }, onPick } });
    expect(w.find('[role="radiogroup"]').attributes("aria-label")).toBe("Who");
    const send = () => w.findAll("button").find((b) => b.text() === "Send")!;
    expect(send().attributes("disabled")).toBeDefined();
    await w.findAll('[role="radio"]')[1]!.trigger("click");
    await flushPromises();
    expect(send().attributes("disabled")).toBeUndefined();
    await send().trigger("click");
    await flushPromises();
    expect(onPick).toHaveBeenCalledWith(["b"], expect.objectContaining({ kind: "picker" }));
    expect(w.text()).toContain("Sent");
  });

  it("multiple mode uses checkboxes and a default value", async () => {
    const onPick = vi.fn();
    const w = mount(NqArtifactRenderer, { props: { artifact: { kind: "picker", mode: "multiple", defaultValue: ["a"], options: [{ value: "a", label: "A" }, { value: "b", label: "B" }] }, onPick } });
    const boxes = w.findAll('[role="checkbox"]');
    expect(boxes[0]!.attributes("data-checked")).toBe("");
    await boxes[1]!.trigger("click");
    await flushPromises();
    await w.findAll("button").find((b) => b.text() === "Send")!.trigger("click");
    await flushPromises();
    expect(onPick).toHaveBeenCalledWith(["a", "b"], expect.anything());
  });
});

describe("NqArtifactList and extractArtifacts", () => {
  it("validates each artifact on its own", () => {
    const { text, artifacts } = extractArtifacts('Hello\n```artifact\n{"kind":"markdown","text":"x"}\n```\n```artifact\nnot json\n```');
    expect(text).toBe("Hello");
    const w = mount(NqArtifactList, { props: { artifacts } });
    expect(w.attributes("data-slot")).toBe("artifact-list");
    const kids = w.findAll('[data-slot="artifact-renderer"]');
    expect(kids.map((k) => k.attributes("data-kind"))).toEqual(["markdown", "invalid"]);
  });
});
