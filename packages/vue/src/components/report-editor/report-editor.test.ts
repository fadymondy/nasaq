import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqReportChart, NqReportEditor, NqReportViewer, sanitizeHtml, type Report } from ".";

const report: Report = {
  title: "May summary",
  subtitle: "Month end",
  author: "Sara",
  date: "2026-05-31",
  blocks: [
    { id: "h1", type: "heading", level: 1, text: "Results" },
    { id: "t1", type: "text", html: "<p>Sales grew <strong>fast</strong>.</p><script>alert(1)</script>" },
    { id: "m1", type: "metrics", items: [{ id: "f1", label: "Revenue", value: 1200, currency: "USD", delta: 0.1 }] },
    { id: "c1", type: "chart", title: "Sales", kind: "bar", series: ["A", "B"], rows: [{ label: "Jan", values: [1, 2] }, { label: "Feb", values: [3, 4] }], caption: "Per month" },
    { id: "tb", type: "table", title: "Regions", columns: ["Region", "Units"], rows: [["North", "4"]] },
    { id: "co", type: "callout", tone: "warning", title: "Heads up", text: "Check stock" },
    { id: "dv", type: "divider" },
    { id: "h2", type: "heading", level: 2, text: "Next" },
  ],
};

describe("NqReportViewer", () => {
  it("renders the cover, contents and every block type", () => {
    const w = mount(NqReportViewer, { props: { report } });
    expect(w.attributes("data-slot")).toBe("report-viewer");
    expect(w.find("h1").text()).toBe("May summary");
    expect(w.text()).toContain("By Sara");
    expect(w.find("nav a").text()).toBe("Results");
    expect(w.findAll("nav li")).toHaveLength(2);
    expect(w.find("h2").text()).toBe("Results");
    expect(w.find('[data-slot="report-text"] strong').text()).toBe("fast");
    expect(w.find('[data-slot="stat-card"]').text()).toContain("$1,200");
    expect(w.findAll('[data-slot="report-bar"]')).toHaveLength(4);
    expect(w.find('[data-slot="chart-legend"]').text()).toContain("B");
    expect(w.find("figure table th").text()).toBe("Region");
    expect(w.find('[data-slot="alert"]').attributes("role")).toBe("note");
    expect(w.find("hr").exists()).toBe(true);
  });

  it("drops scripts from text blocks and unsafe link targets", () => {
    const w = mount(NqReportViewer, { props: { report } });
    expect(w.html()).not.toContain("<script");
    expect(sanitizeHtml('<a href="javascript:alert(1)" onclick="x()">go</a>')).toBe('<a>go</a>');
  });

  it("prints through the listener when there is one, and can hide the button", async () => {
    const onPrint = vi.fn();
    const w = mount(NqReportViewer, { props: { report, onPrint } });
    await w.find("header button").trigger("click");
    expect(onPrint).toHaveBeenCalledTimes(1);
    expect(mount(NqReportViewer, { props: { report, hidePrint: true } }).find("header button").exists()).toBe(false);
  });
});

describe("NqReportChart", () => {
  it("draws lines with dots for a line chart", () => {
    const block = { ...(report.blocks[3] as Extract<Report["blocks"][number], { type: "chart" }>), kind: "line" as const };
    const w = mount(NqReportChart, { props: { block } });
    expect(w.findAll('[data-slot="report-line"]')).toHaveLength(2);
    expect(w.findAll('[data-slot="chart-dot"]')).toHaveLength(4);
    expect(w.find('[data-slot="chart"]').attributes("aria-label")).toBe("Sales: 2 points, 2 series");
  });
});

describe("NqReportEditor", () => {
  it("edits the title, flags unsaved changes and saves", async () => {
    const onSave = vi.fn(async () => undefined);
    const w = mount(NqReportEditor, { props: { defaultValue: { title: "May summary", blocks: [] }, onSave }, attachTo: document.body });
    expect(w.text()).toContain("Saved");
    await w.find("input").setValue("June summary");
    expect(w.text()).toContain("Unsaved changes");
    const save = w.findAll("button").find((b) => b.text() === "Save")!;
    await save.trigger("click");
    await flushPromises();
    expect(onSave).toHaveBeenCalledWith({ title: "June summary", blocks: [] });
    expect(w.text()).toContain("Saved");
    w.unmount();
  });

  it("shows a failed save and keeps the changes unsaved", async () => {
    const onSave = vi.fn(async () => ({ error: "Offline" }));
    const w = mount(NqReportEditor, { props: { defaultValue: { title: "A", blocks: [] }, onSave } });
    await w.find("input").setValue("B");
    await w.findAll("button").find((b) => b.text() === "Save")!.trigger("click");
    await flushPromises();
    expect(w.find('[role="alert"]').text()).toBe("Offline");
  });

  it("lists the blocks as rows and counts the empty ones", async () => {
    const w = mount(NqReportEditor, { props: { defaultValue: { title: "T", blocks: [{ id: "h", type: "heading", level: 1, text: "" }] } } });
    expect(w.findAll('[data-slot="repeater-row"]')).toHaveLength(1);
    expect(w.text()).toContain("1 blocks need content");
    expect(w.find('[data-slot="report-block-form"]').attributes("data-type")).toBe("heading");
  });

  it("switches to the preview, and read-only shows only the viewer", async () => {
    const w = mount(NqReportEditor, { props: { defaultValue: report } });
    await w.findAll('[data-slot="toggle"]').find((b) => b.text() === "Preview")!.trigger("click");
    expect(w.find('[data-slot="report-viewer"]').exists()).toBe(true);
    const ro = mount(NqReportEditor, { props: { defaultValue: report, readOnly: true } });
    expect(ro.find('[data-slot="report-viewer"]').exists()).toBe(true);
    expect(ro.find('[data-slot="toggle-group"]').exists()).toBe(false);
  });
});
