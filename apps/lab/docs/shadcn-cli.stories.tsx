import type { Meta } from "@storybook/react-vite";
import { DocPage, docParameters } from "./doc-page";
import raw from "./content/shadcn-cli.md?raw";

const md = raw;

const meta = {
  title: "Docs/Installation/shadcn CLI",
  tags: ["!autodocs"],
  parameters: docParameters,
  render: () => <DocPage title="Docs/Installation/shadcn CLI" md={md} />,
} satisfies Meta;
export default meta;

export const Page = {};
