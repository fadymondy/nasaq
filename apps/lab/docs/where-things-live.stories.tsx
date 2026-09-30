import type { Meta } from "@storybook/react-vite";
import { DocPage, docParameters } from "./doc-page";
import raw from "./content/where-things-live.md?raw";

const md = raw;

const meta = {
  title: "Docs/Project/Where things live",
  tags: ["!autodocs"],
  parameters: docParameters,
  render: () => <DocPage title="Docs/Project/Where things live" md={md} />,
} satisfies Meta;
export default meta;

export const Page = {};
