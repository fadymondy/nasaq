import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";
import { copilotAvailableContext, copilotErrorOf, copilotFilterCommands, copilotFormatBytes, copilotIsPreviewUrl, copilotSlashQuery, copilotWithoutSlash } from "../src/alpine/copilot-chat-logic";

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

async function mount(name: string) {
  const host = document.createElement("div");
  host.innerHTML = rendered(name);
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const root = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-slot="copilot-chat"]')!;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (el: HTMLElement) => Alpine.$data(el) as Record<string, any>;

describe("copilot-chat logic", () => {
  it("finds the slash word and removes it", () => {
    expect(copilotSlashQuery("run /de", 7)).toEqual({ query: "de", start: 4 });
    expect(copilotSlashQuery("a/b", 3)).toBeNull();
    expect(copilotWithoutSlash("run /de", 7)).toBe("run ");
  });

  it("filters commands, label matches first, chosen ones hidden", () => {
    const cmds = [
      { id: "a", label: "Deploy" },
      { id: "b", label: "Debug", description: "deploy checks" },
    ];
    expect(copilotFilterCommands(cmds, "dep", []).map((c) => c.id)).toEqual(["a", "b"]);
    expect(copilotFilterCommands(cmds, "dep", ["a"]).map((c) => c.id)).toEqual(["b"]);
  });

  it("offers context not yet added, formats sizes, checks urls and reads errors", () => {
    expect(copilotAvailableContext([{ id: "1", label: "A" }, { id: "2", label: "B" }], [{ id: "1", label: "A" }]).map((i) => i.id)).toEqual(["2"]);
    expect(copilotFormatBytes(1536)).toBe("1.5 KB");
    expect(copilotIsPreviewUrl("javascript:alert(1)")).toBe(false);
    expect(copilotIsPreviewUrl("https://example.com/a.png")).toBe(true);
    expect(copilotErrorOf([{ error: "no" }])).toBe("no");
    expect(copilotErrorOf([undefined, {}])).toBe("");
  });
});

describe("copilot-chat example", () => {
  it("renders the answer, steps, sources, actions and follow-ups", async () => {
    const host = await mount("copilot-chat");
    const el = root(host);
    expect(el.dataset.mode).toBe("panel");
    expect(el.querySelector("[data-slot='copilot-steps']")).not.toBeNull();
    expect(el.querySelector("[data-slot='copilot-sources'] a")?.getAttribute("href")).toBe("https://example.com/board");
    expect(el.querySelector("[data-slot='copilot-actions']")).not.toBeNull();
    expect(el.textContent).toContain("Show the details");
    expect(el.querySelector("[data-slot='code-block']")).not.toBeNull();
  });

  it("starts with the context chip and the add-context option", async () => {
    const host = await mount("copilot-chat");
    const chips = host.querySelectorAll("[data-slot='copilot-context'] > span");
    expect(chips.length).toBe(1);
    expect(chips[0]!.textContent).toContain("Q3 plan");
    expect(data(root(host)).available().map((i: { id: string }) => i.id)).toEqual(["c2"]);
  });

  it("emits nq-context-change when a chip is removed", async () => {
    const host = await mount("copilot-chat");
    const seen: unknown[] = [];
    root(host).addEventListener("nq-context-change", (e) => seen.push((e as CustomEvent).detail.items));
    host.querySelector<HTMLButtonElement>("[data-slot='copilot-context'] button")!.click();
    await tick();
    expect(seen).toEqual([[]]);
  });

  it("sends the draft: the message shows at once and the box clears", async () => {
    const host = await mount("copilot-chat");
    const el = root(host);
    const details: Array<Record<string, unknown>> = [];
    el.addEventListener("nq-send", (e) => details.push((e as CustomEvent).detail));
    const ta = el.querySelector<HTMLTextAreaElement>("textarea")!;
    ta.value = "Hello there";
    ta.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    ta.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await tick(60);
    expect(details).toHaveLength(1);
    expect(details[0]).toMatchObject({ text: "Hello there", model: "fast" });
    expect(data(el).outbox.map((o: { text: string }) => o.text)).toEqual(["Hello there"]);
    expect(data(el).draft).toBe("");
  });

  it("keeps the text and shows the error when the host refuses the send", async () => {
    const host = await mount("copilot-chat");
    const el = root(host);
    el.addEventListener("nq-send", (e) => (e as CustomEvent).detail.waitUntil(Promise.resolve({ error: "Quota reached" })));
    data(el).draft = "Try this";
    await tick();
    await data(el).send();
    await tick();
    expect(data(el).outbox).toHaveLength(0);
    expect(data(el).error).toBe("Quota reached");
    expect(data(el).draft).toBe("Try this");
  });

  it("opens the slash menu and chips the chosen command", async () => {
    const host = await mount("copilot-chat");
    const el = root(host);
    const d = data(el);
    d.draft = "/de";
    d.cursor = 3;
    await tick();
    expect(d.slashOpen()).toBe(true);
    expect(d.matches().map((c: { id: string }) => c.id)).toEqual(["deploy"]);
    d.choose(d.matches()[0]);
    await tick();
    expect(d.chosen).toEqual(["deploy"]);
    expect(d.draft).toBe("");
    expect(el.querySelector("[data-slot='copilot-command-chip']")?.textContent).toContain("Deploy");
  });

  it("emits feedback and regenerate", async () => {
    const host = await mount("copilot-chat");
    const el = root(host);
    const seen: Array<[string, unknown]> = [];
    el.addEventListener("nq-feedback", (e) => seen.push(["feedback", (e as CustomEvent).detail]));
    el.addEventListener("nq-regenerate", (e) => seen.push(["regenerate", (e as CustomEvent).detail]));
    host.querySelector<HTMLButtonElement>("button[aria-label='Good answer']")!.click();
    host.querySelector<HTMLButtonElement>("button[aria-label='Try again']")!.click();
    await tick();
    expect(seen.map((s) => s[0])).toEqual(["feedback", "regenerate"]);
    expect(seen[0]![1]).toMatchObject({ id: "a1", value: "up" });
    expect(host.querySelector("button[aria-label='Good answer']")?.getAttribute("aria-pressed")).toBe("true");
  });

  it("toggles an option and emits the ids", async () => {
    const host = await mount("copilot-chat");
    const el = root(host);
    let ids: string[] = [];
    el.addEventListener("nq-toggles-change", (e) => (ids = (e as CustomEvent).detail.ids));
    host.querySelector<HTMLButtonElement>("[role='group'][aria-label='Options'] button")!.click();
    await tick();
    expect(ids).toEqual(["web"]);
    expect(host.querySelector("[role='group'][aria-label='Options'] button")?.getAttribute("aria-pressed")).toBe("true");
  });

  it("emits close and new chat", async () => {
    const host = await mount("copilot-chat");
    const el = root(host);
    const seen: string[] = [];
    el.addEventListener("nq-close", () => seen.push("close"));
    el.addEventListener("nq-new-chat", () => seen.push("new"));
    host.querySelector<HTMLButtonElement>("button[aria-label='Close']")!.click();
    host.querySelector<HTMLButtonElement>("button[aria-label='New chat']")!.click();
    await tick();
    expect(seen).toEqual(["close", "new"]);
  });

  it("History uses the shared popover and picking a session emits and closes it", async () => {
    const host = await mount("copilot-chat");
    const el = root(host);
    const trigger = host.querySelector<HTMLElement>("[data-slot='popover-trigger'][aria-label='History']")!;
    expect(trigger).toBeTruthy();
    const content = () => document.querySelector<HTMLElement>("[data-slot='popover-content']")!;
    expect(content().style.display).toBe("none");
    trigger.click();
    await tick(80);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(content().style.display).not.toBe("none");
    expect(content().textContent).toContain("Weekly summary");
    let id = "";
    el.addEventListener("nq-session-select", (e) => (id = (e as CustomEvent).detail.id));
    [...content().querySelectorAll<HTMLElement>("button")].find((b) => b.textContent!.includes("Weekly summary"))!.click();
    await tick(300);
    expect(id).toBe("h1");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect("menu" in data(el)).toBe(false);
    expect("toggleMenu" in data(el)).toBe(false);
  });

  it("Add context uses the shared dropdown-menu and adding emits the items", async () => {
    const host = await mount("copilot-chat");
    const el = root(host);
    const trigger = host.querySelector<HTMLElement>("button[aria-label='Add context']")!;
    expect(trigger).toBeTruthy();
    trigger.click();
    await tick(80);
    const item = [...document.querySelectorAll<HTMLElement>("[data-slot='dropdown-menu-item']")].find((i) => i.textContent!.includes("Roadmap"))!;
    expect(item).toBeTruthy();
    let items: { id: string }[] = [];
    el.addEventListener("nq-context-change", (e) => (items = (e as CustomEvent).detail.items));
    item.click();
    await tick(300);
    expect(items.map((i) => i.id)).toContain("c2");
  });
});
