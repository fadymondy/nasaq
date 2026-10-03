import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqExportButton, toCsv } from ".";

const rows = [
  { name: "Sara", email: "sara@example.com" },
  { name: "Omar, Jr", email: "omar@example.com" },
];
const columns = [
  { id: "name", label: "Name" },
  { id: "email", label: "Email" },
];
const q = (s: string) => document.querySelector<HTMLElement>(s);
const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms));

describe("export-action", () => {
  it("serialises quoted CSV", () => {
    expect(toCsv([["Name"], ['a,"b"']] as never)).toContain('"a,""b"""');
  });

  it("opens the dialog, exports CSV and reports the file", async () => {
    const onDownload = vi.fn();
    const onComplete = vi.fn();
    const w = mount(NqExportButton, { props: { columns, scopes: { all: rows }, filename: "contacts", onDownload, onComplete }, attachTo: document.body });
    const btn = w.find('[data-slot="export-button"]');
    expect(btn.text()).toContain("Export");
    await btn.trigger("click");
    await flushPromises();
    expect(q('[data-slot="export-dialog"]')).not.toBeNull();
    expect(document.body.textContent).toContain("2 rows");
    const run = [...q("[data-slot=\"export-dialog\"]")!.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Export")!;
    run.click();
    await flushPromises();
    await wait();
    expect(onDownload).toHaveBeenCalledTimes(1);
    expect(onDownload.mock.calls[0]![0].filename).toBe("contacts.csv");
    expect(onComplete).toHaveBeenCalled();
    expect(q('[data-slot="export-done"]')).not.toBeNull();
    w.unmount();
  });

  it("disables the button when there are no rows", () => {
    const w = mount(NqExportButton, { props: { columns, scopes: { all: [] } } });
    expect(w.find('[data-slot="export-button"]').attributes("disabled")).toBeDefined();
  });
});
