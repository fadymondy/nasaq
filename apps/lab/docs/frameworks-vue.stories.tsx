import type { Meta } from "@storybook/react-vite";
import { DocPage, docParameters } from "./doc-page";
import raw from "../../../docs/frameworks/vue.md?raw";

const md = raw;

const meta = {
  title: "Docs/Frameworks/Vue",
  tags: ["!autodocs"],
  parameters: docParameters,
  render: () => <DocPage title="Docs/Frameworks/Vue" md={md} />,
} satisfies Meta;
export default meta;

export const Page = {};
