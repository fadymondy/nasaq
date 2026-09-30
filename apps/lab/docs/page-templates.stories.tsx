import type { Meta } from "@storybook/react-vite";
import { PageTemplates } from "./catalogue";
import { DocPage, docParameters } from "./doc-page";
import raw from "./content/page-templates.md?raw";

const md = raw;

const meta = {
  title: "Docs/Catalogue/Page templates",
  tags: ["!autodocs"],
  parameters: docParameters,
  render: () => <DocPage title="Docs/Catalogue/Page templates" md={md} after={<PageTemplates />} />,
} satisfies Meta;
export default meta;

export const Page = {};
