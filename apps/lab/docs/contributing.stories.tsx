import type { Meta } from "@storybook/react-vite";
import { DocPage, docParameters } from "./doc-page";
import raw from "./content/contributing.md?raw";

const md = raw;

const meta = {
  title: "Docs/Project/Contributing",
  tags: ["!autodocs"],
  parameters: docParameters,
  render: () => <DocPage title="Docs/Project/Contributing" md={md} />,
} satisfies Meta;
export default meta;

export const Page = {};
