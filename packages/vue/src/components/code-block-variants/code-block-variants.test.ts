import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NqCodeBlockAI, NqCodeCopyMenu, NqCodeTabs, NqCommandSnippet, execTabs, packageManagerTabs } from ".";
import { aiLink, buildPrompt, toMarkdown } from "./format";

const writeText = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });

describe("code-block-variants helpers", () => {
  it("builds install and exec tabs", () => {
    expect(packageManagerTabs("@nasaq/web").map((t) => t.code)).toEqual(["pnpm add @nasaq/web", "npm install @nasaq/web", "yarn add @nasaq/web", "bun add @nasaq/web"]);
    expect(packageManagerTabs("x", { dev: true, managers: ["npm"] })[0]!.code).toBe("npm install -D x");
    expect(execTabs("foo").map((t) => t.code)).toEqual(["pnpm dlx foo", "npx foo", "yarn dlx foo", "bunx foo"]);
  });
  it("builds markdown, prompts and links", () => {
    expect(toMarkdown("a\n", "ts", "x.ts")).toBe("**x.ts**\n\n```ts\na\n```");
    expect(buildPrompt({ code: "a", target: "claude" })).toContain("```\na\n```");
    expect(aiLink("claude", "hi there")).toBe("https://claude.ai/new?q=hi%20there");
    expect(aiLink("cursor", "x".repeat(7000))).toBeNull();
  });
});

describe("NqCommandSnippet", () => {
  it("drops the prompt from the copy and shows a check", async () => {
    const w = mount(NqCommandSnippet, { props: { command: "$ npm i @nasaq/web" } });
    expect(w.attributes("data-slot")).toBe("command-snippet");
    expect(w.attributes("dir")).toBe("ltr");
    expect(w.find("code").text()).toBe("npm i @nasaq/web");
    expect(w.find("code").attributes("aria-label")).toBe("Command");
    await w.find("button").trigger("click");
    await flushPromises();
    expect(writeText).toHaveBeenCalledWith("npm i @nasaq/web");
    expect(w.find("button").attributes("data-copied")).toBe("");
    expect(w.find('[role="status"]').text()).toBe("Command copied to clipboard");
    expect(w.emitted("copy")![0]).toEqual(["npm i @nasaq/web"]);
  });
  it("hides the prompt glyph when false", () => {
    expect(mount(NqCommandSnippet, { props: { command: "ls", prompt: false } }).text()).not.toContain("$");
    expect(mount(NqCommandSnippet, { props: { command: "ls" } }).text()).toContain("$");
  });
});

describe("NqCodeTabs", () => {
  const tabs = packageManagerTabs("@nasaq/web");
  it("shows every manager as a tab, copies the visible one and syncs by key", async () => {
    const a = mount(NqCodeTabs, { props: { tabs, syncKey: "pm-test" }, attachTo: document.body });
    const b = mount(NqCodeTabs, { props: { tabs, syncKey: "pm-test" }, attachTo: document.body });
    expect(a.attributes("data-slot")).toBe("code-tabs");
    expect(a.findAll('[role="tab"]').map((x) => x.text())).toEqual(["pnpm", "npm", "yarn", "bun"]);
    await a.findAll('[role="tab"]')[1]!.trigger("mousedown");
    await a.findAll('[role="tab"]')[1]!.trigger("click");
    await flushPromises();
    expect(b.findAll('[role="tab"]')[1]!.attributes("data-active")).toBe("");
    await a.find('button[aria-label="Copy code"]').trigger("click");
    await flushPromises();
    expect(writeText).toHaveBeenLastCalledWith("npm install @nasaq/web");
    a.unmount();
    b.unmount();
  });
  it("offers the AI menu with ai-copy", () => {
    const w = mount(NqCodeTabs, { props: { tabs, aiCopy: true } });
    expect(w.find('[data-slot="code-copy-menu"]').exists()).toBe(true);
    expect(w.find('button[aria-label="Copy options"]').exists()).toBe(true);
  });
});

describe("NqCodeCopyMenu and NqCodeBlockAI", () => {
  it("copies the code from the main button and emits", async () => {
    const w = mount(NqCodeCopyMenu, { props: { code: "const a = 1;\n" } });
    await w.find('button[aria-label="Copy code"]').trigger("click");
    await flushPromises();
    expect(writeText).toHaveBeenLastCalledWith("const a = 1;");
    expect(w.emitted("copy")![0]).toEqual(["code", "const a = 1;", undefined]);
  });
  it("replaces the copy button of the code block", () => {
    const w = mount(NqCodeBlockAI, { props: { code: "a", language: "ts", filename: "a.ts" } });
    expect(w.find('[data-slot="code-block-header"] [data-slot="code-copy-menu"]').exists()).toBe(true);
  });
});
