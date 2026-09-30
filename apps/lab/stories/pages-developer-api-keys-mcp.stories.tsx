/*
 * A developer settings screen: API keys on top, the MCP connection guide below. Both are the real
 * components with fake async callbacks (see ./_connectors-demo.tsx).
 */
import { McpConnect } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ApiKeysDemo, DEMO_MCP_TOKEN, DEMO_MCP_URL, useAr, wait } from "./_connectors-demo";

const meta = { title: "Pages/Developer/API Keys & MCP", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 p-4 sm:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-h2 text-foreground">{ar ? "المطورون" : "Developers"}</h1>
        <p className="text-body text-muted-foreground">{ar ? "مفاتيح الوصول إلى واجهة البرمجة، وربط أدوات الذكاء الاصطناعي بخادم MCP." : "Keys for the API, and how to connect AI tools to the MCP server."}</p>
      </header>
      <ApiKeysDemo />
      <McpConnect
        className="max-w-none"
        serverUrl={DEMO_MCP_URL}
        token={DEMO_MCP_TOKEN}
        onTest={async () => {
          await wait(900);
          return { ok: true, latencyMs: 142, tools: 18 };
        }}
      />
    </main>
  );
}

export const Default: Story = { render: () => <Page /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
