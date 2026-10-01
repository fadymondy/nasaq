import type { Meta } from "@storybook/react-vite";
import { DocPage, docParameters } from "./doc-page";
import raw from "../../../docs/frameworks/alpine.md?raw";

const md = raw;

const meta = {
  title: "Docs/Frameworks/Alpine",
  tags: ["!autodocs"],
  parameters: docParameters,
  render: () => <DocPage title="Docs/Frameworks/Alpine" md={md} />,
} satisfies Meta;
export default meta;

export const Page = {};
