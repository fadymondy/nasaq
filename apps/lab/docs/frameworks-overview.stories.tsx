import type { Meta } from "@storybook/react-vite";
import { DocPage, docParameters } from "./doc-page";
import raw from "../../../docs/frameworks/README.md?raw";

const md = raw;

const meta = {
  title: "Docs/Frameworks/Overview",
  tags: ["!autodocs"],
  parameters: docParameters,
  render: () => <DocPage title="Docs/Frameworks/Overview" md={md} />,
} satisfies Meta;
export default meta;

export const Page = {};
