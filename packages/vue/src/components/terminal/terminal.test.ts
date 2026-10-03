import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqTerminal, parseAnsiRows, stripAnsi } from ".";

describe("terminal ansi", () => {
  it("parses colours, resets and carriage returns", () => {
    const rows = parseAnsiRows("\u001b[32mok\u001b[0m done\nbar 10%\rbar 100%");
    expect(rows[0]!.map((s) => s.text)).toEqual(["ok", " done"]);
    expect(rows[0]![0]!.style.fg).toBe("var(--nq-success-text)");
    expect(rows[1]!.map((s) => s.text).join("")).toBe("bar 100%");
    expect(stripAnsi("\u001b[1mhi\u001b[0m")).toBe("hi");
  });
});

describe("NqTerminal", () => {
  it("renders rows by kind, the prompt on commands, and the streaming state", () => {
    const w = mount(NqTerminal, { props: { lines: [{ kind: "command", text: "pnpm build" }, "\u001b[31mred\u001b[0m", { kind: "error", text: "boom" }], streaming: true } });
    expect(w.attributes("data-slot")).toBe("terminal");
    expect(w.attributes("dir")).toBe("ltr");
    expect(w.attributes("data-streaming")).toBeDefined();
    const rows = w.findAll('[data-slot="terminal-row"]');
    expect(rows).toHaveLength(3);
    expect(rows[0]!.text()).toContain("$");
    expect(rows[2]!.attributes("data-kind")).toBe("error");
    expect(w.text()).toContain("Streaming");
  });

  it("trims to maxLines with a note, shows the empty state, and toggles wrap", async () => {
    const w = mount(NqTerminal, { props: { lines: ["a", "b", "c"], maxLines: 2 } });
    expect(w.findAll('[data-slot="terminal-row"]')).toHaveLength(2);
    expect(w.text()).toContain("1 earlier line hidden");
    const empty = mount(NqTerminal, { props: { lines: [] } });
    expect(empty.text()).toContain("No output yet");
    const wrapBtn = w.find('button[aria-label="Wrap lines"]');
    expect(wrapBtn.attributes("aria-pressed")).toBe("false");
    await wrapBtn.trigger("click");
    expect(wrapBtn.attributes("aria-pressed")).toBe("true");
  });

  it("the command input is busy until the handler settles and walks history", async () => {
    let done!: () => void;
    const onCommand = vi.fn(() => new Promise<void>((r) => (done = r)));
    const w = mount(NqTerminal, { props: { lines: [], onCommand }, attachTo: document.body });
    const input = w.find<HTMLInputElement>('[data-slot="terminal-input"] input');
    await input.setValue("ls");
    await w.find("form").trigger("submit");
    expect(onCommand).toHaveBeenCalledWith("ls");
    expect(input.element.disabled).toBe(true);
    done();
    await flushPromises();
    expect(input.element.disabled).toBe(false);
    await input.trigger("keydown", { key: "ArrowUp" });
    expect(input.element.value).toBe("ls");
    w.unmount();
  });
});
