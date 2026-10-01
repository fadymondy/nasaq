import type { Meta } from "@storybook/react-vite";
import { DocPage, docParameters } from "./doc-page";
import raw from "../../../docs/frameworks/kit.md?raw";

const md = raw;

const meta = {
  title: "Docs/Frameworks/Component kit",
  tags: ["!autodocs"],
  parameters: docParameters,
  render: () => <DocPage title="Docs/Frameworks/Component kit" md={md} />,
} satisfies Meta;
export default meta;

export const Page = {};
