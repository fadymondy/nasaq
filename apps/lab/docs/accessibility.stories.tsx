import type { Meta } from "@storybook/react-vite";
import { DocPage, docParameters } from "./doc-page";
import raw from "./content/accessibility.md?raw";

const md = raw;

const meta = {
  title: "Docs/Guides/Accessibility",
  tags: ["!autodocs"],
  parameters: docParameters,
  render: () => <DocPage title="Docs/Guides/Accessibility" md={md} />,
} satisfies Meta;
export default meta;

export const Page = {};
