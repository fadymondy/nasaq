import type { Meta } from "@storybook/react-vite";
import { DocPage, docParameters } from "./doc-page";
import raw from "./content/dark-mode.md?raw";

const md = raw;

const meta = {
  title: "Docs/Guides/Dark mode",
  tags: ["!autodocs"],
  parameters: docParameters,
  render: () => <DocPage title="Docs/Guides/Dark mode" md={md} />,
} satisfies Meta;
export default meta;

export const Page = {};
