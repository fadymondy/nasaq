import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";
import { type Command, normalizeForSearch, parseShortcut, provideCommands, scoreCommand, sectionOrder, useRegisterCommands, useRegisteredCommands } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const key = (code: string, target: EventTarget = window) => target.dispatchEvent(new KeyboardEvent("keydown", { code, key: code.replace(/^Key/, "").toLowerCase(), bubbles: true, cancelable: true }));

describe("matching", () => {
  it("folds Arabic variants and scores prefix > word > substring > keyword", () => {
    expect(normalizeForSearch("إدارة")).toBe(normalizeForSearch("اداره"));
    expect(normalizeForSearch("مَرحبا")).toBe("مرحبا"); // letters stay, only marks go
    const c: Command = { id: "a", label: "New issue", keywords: ["add"] };
    expect(scoreCommand(c, "new")).toBe(4);
    expect(scoreCommand(c, "iss")).toBe(3);
    expect(scoreCommand(c, "ssue")).toBe(2);
    expect(scoreCommand(c, "ad")).toBe(1.5);
    expect(scoreCommand(c, "zzz")).toBe(0);
    expect(sectionOrder({ id: "x", label: "x", section: "create" })).toBe(2);
    expect(sectionOrder({ id: "x", label: "x", section: "mine" })).toBe(4.5);
  });

  it("parses sequences and chords", () => {
    expect(parseShortcut("G I")).toEqual(["g", "i"]);
    expect(parseShortcut("Shift A")).toEqual(["shift+a"]);
    expect(parseShortcut("?")).toEqual(["?"]);
    expect(parseShortcut("Mod K")).toHaveLength(1);
  });
});

describe("registry", () => {
  it("registers while mounted, binds the shortcut and unregisters on unmount", async () => {
    const perform = vi.fn();
    const commands = ref<Command[]>([{ id: "p.new", label: "New", shortcut: "C", perform }]);
    const Page = defineComponent({ setup: () => (useRegisterCommands(commands), () => h("h1", "Page")) });
    const show = ref(true);
    let seen!: ReturnType<typeof useRegisteredCommands>;
    const Probe = defineComponent({ setup: () => ((seen = useRegisteredCommands()), () => h("i")) });
    const Root = defineComponent({
      setup() {
        provideCommands();
        return () => h("div", [show.value ? h(Page) : null, h(Probe)]);
      },
    });
    const w = mount(Root, { attachTo: document.body });
    await nextTick();
    expect(seen.value.commands.map((c) => c.id)).toEqual(["p.new"]);
    key("KeyC");
    expect(perform).toHaveBeenCalledTimes(1);

    const input = document.createElement("input");
    document.body.append(input);
    key("KeyC", input);
    expect(perform).toHaveBeenCalledTimes(1);

    show.value = false;
    await nextTick();
    expect(seen.value.commands).toEqual([]);
    w.unmount();
    key("KeyC");
    expect(perform).toHaveBeenCalledTimes(1);
  });
});
