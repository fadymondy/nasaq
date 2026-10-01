import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { buildRows, guessMapping, NqImportWizard, parseCsv, summarize } from ".";

const fields = [
  { key: "name", label: "Name", required: true },
  { key: "email", label: "Email", type: "email" as const, required: true },
];
const CSV = "Name,Email\nSara,sara@example.com\nOmar,not-an-email\nSara2,sara@example.com\n";

describe("import-wizard helpers", () => {
  it("parses quoted cells and guesses the mapping", () => {
    const csv = parseCsv('Name;E-mail\n"A;B";a@b.co\n');
    expect(csv.delimiter).toBe(";");
    expect(csv.rows[0]).toEqual(["A;B", "a@b.co"]);
    expect(guessMapping(csv.headers, [{ key: "email", label: "Email", aliases: ["e-mail"] }])).toEqual({ email: 1 });
  });
  it("flags invalid and duplicate rows", () => {
    const csv = parseCsv(CSV);
    const rows = buildRows(csv.rows, guessMapping(csv.headers, fields), fields, { uniqueKey: "email" });
    expect(summarize(rows)).toEqual({ total: 3, valid: 1, invalid: 2, duplicates: 1 });
  });
});

describe("NqImportWizard", () => {
  it("walks paste, map, review and import, sending only valid rows", async () => {
    const onImport = vi.fn(async (rows: Record<string, string>[]) => ({ imported: rows.length }));
    const w = mount(NqImportWizard, { props: { fields, uniqueKey: "email", onImport }, attachTo: document.body });
    expect(w.attributes("data-step")).toBe("0");
    await w.find("textarea").setValue(CSV);
    const click = async (text: string) => {
      await w.findAll("button").find((b) => b.text().includes(text))!.trigger("click");
      await flushPromises();
    };
    await click("Use pasted rows");
    expect(w.attributes("data-step")).toBe("1");
    await click("Next");
    expect(w.attributes("data-step")).toBe("2");
    expect(w.findAll("tbody tr")).toHaveLength(3);
    expect(w.text()).toContain("Import 1 row");
    await click("Import 1 row");
    await new Promise((r) => setTimeout(r, 20));
    expect(onImport).toHaveBeenCalledWith([{ name: "Sara", email: "sara@example.com" }]);
    expect(w.text()).toContain("1 row imported");
    expect(w.text()).toContain("2 rows skipped");
    w.unmount();
  });

  it("shows the server error and can retry", async () => {
    const onImport = vi.fn().mockResolvedValueOnce({ imported: 0, error: "Quota hit" }).mockResolvedValueOnce({ imported: 1 });
    const w = mount(NqImportWizard, { props: { fields, onImport }, attachTo: document.body });
    await w.find("textarea").setValue("Name,Email\nSara,sara@example.com\n");
    const click = async (text: string) => {
      await w.findAll("button").find((b) => b.text().includes(text))!.trigger("click");
      await flushPromises();
    };
    await click("Use pasted rows");
    await click("Next");
    await click("Import 1 row");
    expect(w.text()).toContain("Quota hit");
    await click("Try again");
    expect(w.text()).toContain("Import finished");
    w.unmount();
  });
});
