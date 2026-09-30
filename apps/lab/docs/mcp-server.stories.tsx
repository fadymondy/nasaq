import type { Meta } from "@storybook/react-vite";
import { DocPage, docParameters } from "./doc-page";
import raw from "./content/mcp-server.md?raw";

const md = raw;

const meta = {
  title: "Docs/Guides/MCP server",
  tags: ["!autodocs"],
  parameters: docParameters,
  render: () => <DocPage title="Docs/Guides/MCP server" md={md} />,
} satisfies Meta;
export default meta;

export const Page = {};
