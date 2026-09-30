import { McpConnect } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { DEMO_MCP_TOKEN, DEMO_MCP_URL, wait } from "./_connectors-demo";

const meta = { title: "Components/Developer/MCP Connect" } satisfies Meta;
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
