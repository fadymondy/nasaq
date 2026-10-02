import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NasaqProvider } from "../../provider";
import { MCP_CLIENTS, maskToken, mcpSnippet, NqMcpConnect, TOKEN_PLACEHOLDER } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const url = "https://mcp.example.com/mcp";
const token = "nsq_live_abcdefghijklmnop";

describe("mcp-connect helpers", () => {
  it("builds each client's snippet", () => {
    const server = { name: "example", url, token: "abc" };
    expect(mcpSnippet("claude-code", server)).toMatchObject({ target: "Terminal", language: "bash" });
    expect(mcpSnippet("claude-code", server).code).toBe(`claude mcp add --transport http example ${url} --header "Authorization: Bearer abc"`);
    expect(JSON.parse(mcpSnippet("cursor", server).code).mcpServers.example).toEqual({ url, headers: { Authorization: "Bearer abc" } });
    expect(mcpSnippet("cursor", server).deepLink).toMatch(/^cursor:\/\/anysphere\.cursor-deeplink\/mcp\/install\?name=example&config=/);
    expect(JSON.parse(mcpSnippet("vscode", server).code).servers.example.type).toBe("http");
    expect(mcpSnippet("generic", { name: "x", url }).code).toContain(TOKEN_PLACEHOLDER);
    expect(mcpSnippet("generic", { name: "x", url, token: "t", header: "X-Key" }).code).toContain('"X-Key": "t"');
  });

  it("masks a token", () => {
    expect(maskToken("short")).toBe("•••••");
    expect(maskToken(token)).toBe(`nsq_li${"•".repeat(12)}mnop`);
  });
});

describe("NqMcpConnect", () => {
  it("renders the card, URL, masked token and one tab per client", () => {
    const w = mount(NqMcpConnect, { props: { serverUrl: url, token, class: "max-w-xl" }, attachTo: document.body });
    expect(w.attributes("data-slot")).toBe("mcp-connect");
    expect(w.classes()).toEqual(expect.arrayContaining(["w-full", "max-w-xl"]));
    expect(w.find("h2").text()).toBe("Connect an MCP client");
    expect(w.find('[data-slot="copy-field"] input').element).toHaveProperty("value", url);
    expect(w.find('[data-slot="mcp-token"] input').element).toHaveProperty("value", maskToken(token));
    const tabs = w.findAll('[data-slot="tabs-tab"]');
    expect(tabs.map((t) => t.text())).toEqual(["Claude Code", "Claude Desktop", "Cursor", "VS Code", "Other (JSON)"]);
    expect(MCP_CLIENTS).toHaveLength(5);
    expect(tabs[0]!.attributes("data-active")).toBe("");
    // The snippet shows the masked token, the copy button holds the real one.
    expect(w.find('[data-slot="mcp-snippet"]').text()).toContain(maskToken(token));
    expect(w.find('[data-slot="mcp-snippet"]').text()).not.toContain(token);
    expect(w.find('[data-slot="mcp-snippet"]').attributes("dir")).toBe("ltr");
    w.unmount();
  });

  it("reveals the token", async () => {
    const w = mount(NqMcpConnect, { props: { serverUrl: url, token }, attachTo: document.body });
    const toggle = w.find('[data-slot="mcp-token"] button');
    expect(toggle.attributes("aria-label")).toBe("Show token");
    expect(toggle.attributes("aria-pressed")).toBe("false");
    await toggle.trigger("click");
    expect(toggle.attributes("aria-label")).toBe("Hide token");
    expect(toggle.attributes("aria-pressed")).toBe("true");
    expect((w.find('[data-slot="mcp-token"] input').element as HTMLInputElement).value).toBe(token);
    expect(w.find('[data-slot="mcp-snippet"]').text()).toContain(token);
    w.unmount();
  });

  it("shows a placeholder notice without a token", () => {
    const w = mount(NqMcpConnect, { props: { serverUrl: url } });
    expect(w.find('[data-slot="mcp-token"]').exists()).toBe(false);
    expect(w.find('[data-slot="alert"]').text()).toContain("YOUR_TOKEN");
    expect(w.find('[data-slot="mcp-snippet"]').text()).toContain(TOKEN_PLACEHOLDER);
  });

  it("limits the clients and opens the default one with its deep link", () => {
    const w = mount(NqMcpConnect, { props: { serverUrl: url, clients: ["claude-code", "cursor"], defaultClient: "cursor" } });
    const tabs = w.findAll('[data-slot="tabs-tab"]');
    expect(tabs.map((t) => t.text())).toEqual(["Claude Code", "Cursor"]);
    expect(tabs[1]!.attributes("data-active")).toBe("");
    const link = w.find('[data-slot="mcp-deep-link"]');
    expect(link.text()).toBe("Add to Cursor");
    expect(link.attributes("href")).toMatch(/^cursor:/);
  });

  it("hides the test without onTest and runs it with one", async () => {
    expect(mount(NqMcpConnect, { props: { serverUrl: url } }).find('[data-slot="mcp-test"]').exists()).toBe(false);
    const onTest = vi.fn(async () => ({ ok: true, latencyMs: 42, tools: 12 }));
    const w = mount(NqMcpConnect, { props: { serverUrl: url, onTest } });
    const root = () => w.find('[data-slot="mcp-test"]');
    expect(root().attributes("data-state")).toBe("idle");
    await root().find("button").trigger("click");
    await flushPromises();
    expect(onTest).toHaveBeenCalledOnce();
    expect(root().attributes("data-state")).toBe("done");
    expect(root().text()).toContain("Connected");
    expect(root().text()).toContain("The server answered (42 ms, 12 tools).");
  });

  it("shows the server's error, and a generic one when the test throws", async () => {
    const failing = mount(NqMcpConnect, { props: { serverUrl: url, onTest: async () => ({ ok: false, error: "401 Unauthorized" }) } });
    await failing.find('[data-slot="mcp-test"] button').trigger("click");
    await flushPromises();
    expect(failing.find('[data-slot="mcp-test"]').text()).toContain("Could not connect");
    expect(failing.find('[data-slot="mcp-test"]').text()).toContain("401 Unauthorized");
    const broken = mount(NqMcpConnect, { props: { serverUrl: url, onTest: async () => Promise.reject(new Error("x")) } });
    await broken.find('[data-slot="mcp-test"] button').trigger("click");
    await flushPromises();
    expect(broken.find('[data-slot="mcp-test"]').attributes("data-state")).toBe("error");
    expect(broken.find('[data-slot="mcp-test"]').text()).toContain("The test could not run. Try again.");
  });

  it("is Arabic inside an Arabic provider", () => {
    const w = mount({
      components: { NasaqProvider, NqMcpConnect },
      setup: () => ({ url }),
      template: `<NasaqProvider locale="ar" target="scope"><NqMcpConnect :server-url="url" /></NasaqProvider>`,
    });
    expect(w.find("h2").text()).toBe("اربط عميل MCP");
    expect(w.text()).toContain("رابط الخادم");
  });
});
