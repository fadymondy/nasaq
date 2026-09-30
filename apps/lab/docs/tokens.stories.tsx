import type { Meta } from "@storybook/react-vite";
import { DocPage, docParameters } from "./doc-page";
import raw from "./content/tokens.md?raw";

const md = raw;

const meta = {
  title: "Docs/Guides/Tokens",
  tags: ["!autodocs"],
  parameters: docParameters,
  render: () => <DocPage title="Docs/Guides/Tokens" md={md} />,
} satisfies Meta;
export default meta;

export const Page = {};
