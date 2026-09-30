import type { Meta } from "@storybook/react-vite";
import { Hero } from "./hero";
import { components } from "virtual:nasaq-catalogue";
import { BRAND_KEYS } from "@nasaq/brands";
import { DocPage, docParameters, fillTokens } from "./doc-page";
import raw from "./content/introduction.md?raw";

const md = fillTokens(raw, { components: components.length, brands: BRAND_KEYS.length });

const meta = {
  title: "Docs/Introduction",
  tags: ["!autodocs"],
  parameters: docParameters,
  render: () => <DocPage title="Docs/Introduction" md={md} before={<Hero />} />,
} satisfies Meta;
export default meta;

export const Page = {};
