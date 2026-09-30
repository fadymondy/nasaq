import type { Meta } from "@storybook/react-vite";
import { DocPage, docParameters } from "./doc-page";
import raw from "./content/npm-package.md?raw";

const md = raw;

const meta = {
  title: "Docs/Installation/npm package",
  tags: ["!autodocs"],
  parameters: docParameters,
  render: () => <DocPage title="Docs/Installation/npm package" md={md} />,
} satisfies Meta;
export default meta;

export const Page = {};
