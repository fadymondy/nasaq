import type { Meta } from "@storybook/react-vite";
import { DocPage, docParameters } from "./doc-page";
import raw from "../../../docs/frameworks/inertia.md?raw";

const md = raw;

const meta = {
  title: "Docs/Frameworks/Laravel and Inertia",
  tags: ["!autodocs"],
  parameters: docParameters,
  render: () => <DocPage title="Docs/Frameworks/Laravel and Inertia" md={md} />,
} satisfies Meta;
export default meta;

export const Page = {};
