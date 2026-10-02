// The Blade mcp-connect example (packages/php/examples/rendered/mcp-connect.html) under real Alpine.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Alpine from "alpinejs";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import nasaq from "../src/alpine";

const rendered = (name: string) => readFileSync(resolve(process.cwd(), "../php/examples/rendered", `${name}.html`), "utf8");
const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms));

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
  document.body.innerHTML = "";
});

async function mount(html = rendered("mcp-connect")) {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  Alpine.initTree(host);
  await tick();
  return host;
}

const TOKEN = "nsq_live_a1b2c3d4e5f6g7h8i9j0";

describe("mcp-connect (Blade example)", () => {
  it("renders the URL, the masked token and one tab per client", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="mcp-connect"]')!;
    expect(root.querySelector("h2")!.textContent).toBe("Connect an MCP client");
    expect(root.querySelector<HTMLInputElement>('[data-slot="copy-field"] input')!.value).toBe("https://mcp.example.com/mcp");
    const tokenInput = root.querySelector<HTMLInputElement>('[data-slot="mcp-token"] input')!;
    expect(tokenInput.value).toBe("nsq_li" + "•".repeat(12) + "i9j0");
    const tabs = [...root.querySelectorAll('[data-slot="tabs-tab"]')].map((t) => t.textContent!.trim());
    expect(tabs).toEqual(["Claude Code", "Claude Desktop", "Cursor", "VS Code", "Other (JSON)"]);
    expect(root.querySelectorAll('[data-slot="tabs-panel"]:not([hidden])')).toHaveLength(1);
  });

  it("reveals and hides the token in the field and the snippets", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="mcp-connect"]')!;
    const input = root.querySelector<HTMLInputElement>('[data-slot="mcp-token"] input')!;
    const toggle = root.querySelector<HTMLButtonElement>('[data-slot="mcp-token"] button')!;
    expect(toggle.getAttribute("aria-label")).toBe("Show token");
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    const blocks = [...root.querySelectorAll<HTMLElement>('[data-slot="tabs-panel"]:not([hidden]) [data-slot="code-block"]')];
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.textContent).not.toContain(TOKEN);
    toggle.click();
    await tick();
    expect(input.value).toBe(TOKEN);
    expect(toggle.getAttribute("aria-label")).toBe("Hide token");
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(blocks[0]!.textContent).toContain(TOKEN);
    toggle.click();
    await tick();
    expect(blocks[0]!.textContent).not.toContain(TOKEN);
  });

  it("switches tabs and offers the Cursor install link", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="mcp-connect"]')!;
    const cursor = [...root.querySelectorAll<HTMLElement>('[data-slot="tabs-tab"]')].find((t) => t.textContent!.includes("Cursor"))!;
    cursor.click();
    await tick();
    const panel = root.querySelector<HTMLElement>('[data-slot="tabs-panel"]:not([hidden])')!;
    expect(panel.textContent).toContain("mcpServers");
    const link = panel.querySelector<HTMLAnchorElement>('[data-slot="mcp-deep-link"]')!;
    expect(link.getAttribute("href")).toMatch(/^cursor:\/\/anysphere\.cursor-deeplink\/mcp\/install\?name=example&config=/);
  });

  it("tests the connection through the test event", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="mcp-connect"]')!;
    const section = root.querySelector<HTMLElement>('[data-slot="mcp-test"]')!;
    expect(section.dataset.state).toBe("idle");
    section.querySelector("button")!.click();
    await tick();
    expect(section.dataset.state).toBe("done");
    expect(section.textContent).toContain("Connected");
    expect(section.textContent).toContain("The server answered (12 tools).");
  });

  it("shows a failure when the host reports one, and a generic one with no listener", async () => {
    const host = await mount();
    const root = host.querySelector<HTMLElement>('[data-slot="mcp-connect"]')!;
    const section = root.querySelector<HTMLElement>('[data-slot="mcp-test"]')!;
    root.removeAttribute("x-on:test");
    root.addEventListener("test", (e) => (e as CustomEvent).detail.wait(Promise.resolve({ ok: false, error: "401 from server" })));
    section.querySelector("button")!.click();
    await tick();
    expect(section.textContent).toContain("Could not connect");
    expect(section.textContent).toContain("401 from server");

    const bare = await mount(rendered("mcp-connect").replace(/x-on:test="[^"]*"/, ""));
    const s2 = bare.querySelector<HTMLElement>('[data-slot="mcp-test"]')!;
    s2.querySelector("button")!.click();
    await tick();
    expect(s2.dataset.state).toBe("error");
    expect(s2.textContent).toContain("The test could not run");
  });
});
