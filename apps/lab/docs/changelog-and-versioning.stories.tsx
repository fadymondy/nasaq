import type { Meta } from "@storybook/react-vite";
import { DocPage, docParameters } from "./doc-page";
import raw from "./content/changelog-and-versioning.md?raw";

const md = raw;

const meta = {
  title: "Docs/Project/Changelog and versioning",
  tags: ["!autodocs"],
  parameters: docParameters,
  render: () => <DocPage title="Docs/Project/Changelog and versioning" md={md} />,
} satisfies Meta;
export default meta;

export const Page = {};
