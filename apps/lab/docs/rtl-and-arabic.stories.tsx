import type { Meta } from "@storybook/react-vite";
import { DocPage, docParameters } from "./doc-page";
import raw from "./content/rtl-and-arabic.md?raw";

const md = raw;

const meta = {
  title: "Docs/Guides/RTL and Arabic",
  tags: ["!autodocs"],
  parameters: docParameters,
  render: () => <DocPage title="Docs/Guides/RTL and Arabic" md={md} />,
} satisfies Meta;
export default meta;

export const Page = {};
