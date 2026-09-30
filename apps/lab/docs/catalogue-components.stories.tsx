import type { Meta } from "@storybook/react-vite";
import { components } from "virtual:nasaq-catalogue";
import { ComponentCatalogue } from "./catalogue";
import { DocPage, docParameters, fillTokens } from "./doc-page";
import raw from "./content/catalogue-components.md?raw";

const md = fillTokens(raw, { components: components.length });

const meta = {
  title: "Docs/Catalogue/Components",
  tags: ["!autodocs"],
  parameters: docParameters,
  render: () => <DocPage title="Docs/Catalogue/Components" md={md} after={<ComponentCatalogue />} />,
} satisfies Meta;
export default meta;

export const Page = {};
