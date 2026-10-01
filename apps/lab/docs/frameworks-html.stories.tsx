import type { Meta } from "@storybook/react-vite";
import { DocPage, docParameters } from "./doc-page";
import raw from "../../../docs/frameworks/html.md?raw";

const md = raw;

const meta = {
  title: "Docs/Frameworks/Plain HTML",
  tags: ["!autodocs"],
  parameters: docParameters,
  render: () => <DocPage title="Docs/Frameworks/Plain HTML" md={md} />,
} satisfies Meta;
export default meta;

export const Page = {};
