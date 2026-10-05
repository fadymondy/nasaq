import { McpConnect, McpConnectSheet } from "@nasaq/web";
import { Box, Server, Sparkles } from "lucide-react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { DEMO_MCP_TOKEN, DEMO_MCP_URL, wait } from "./_connectors-demo";

const meta = { title: "Components/Integrations/MCP Connect" } satisfies Meta;
export default meta;
type Story = StoryObj;

/** One tab per client. The token shows masked; copy gives the real one. Cursor and VS Code have a one-click install link. The test succeeds. */
export const Default: Story = {
  render: () => (
    <McpConnect
      serverUrl={DEMO_MCP_URL}
      token={DEMO_MCP_TOKEN}
      onTest={async () => {
        await wait(900);
        return { ok: true, latencyMs: 142, tools: 18 };
      }}
    />
  ),
};

/** No token yet: snippets carry a YOUR_TOKEN placeholder. The test fails, to show the message. */
export const FailingTest: Story = {
  name: "Failing test",
  render: () => (
    <McpConnect
      serverUrl={DEMO_MCP_URL}
      onTest={async () => {
        await wait(700);
        return { ok: false, error: "401 Unauthorized" };
      }}
    />
  ),
};

export const Arabic: Story = {
  globals: { locale: "ar" },
  render: () => (
    <McpConnect
      serverUrl={DEMO_MCP_URL}
      token={DEMO_MCP_TOKEN}
      onTest={async () => {
        await wait(700);
        return { ok: true, latencyMs: 142, tools: 18 };
      }}
    />
  ),
};

/** Numbered steps with a client picker and no card frame: the shape for a sheet or dialog. */
export const Steps: Story = {
  render: () => (
    <div className="max-w-2xl">
      <McpConnect layout="steps" serverUrl={DEMO_MCP_URL} token={DEMO_MCP_TOKEN} />
    </div>
  ),
};

/** The green Connect button opens a side-over with connection types; MCP uses the steps layout. */
export const Sheet: Story = {
  render: () => (
    <McpConnectSheet
      types={[
        { value: "mcp", label: "MCP", description: "Connect your agent", icon: <Sparkles />, content: <McpConnect layout="steps" serverUrl={DEMO_MCP_URL} token={DEMO_MCP_TOKEN} /> },
        { value: "api", label: "API", description: "REST and GraphQL", icon: <Server />, content: <p className="text-body-sm">Call the REST API with the same token.</p> },
        { value: "sdk", label: "SDK", description: "Client library", icon: <Box />, content: <p className="text-body-sm">npm install your-sdk</p> },
      ]}
    />
  ),
};
