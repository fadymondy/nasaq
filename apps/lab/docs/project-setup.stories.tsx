import type { Meta } from "@storybook/react-vite";
import { DocPage, docParameters } from "./doc-page";
import raw from "./content/project-setup.md?raw";

const md = raw;

const meta = {
  title: "Docs/Installation/Project setup",
  tags: ["!autodocs"],
  parameters: docParameters,
  render: () => <DocPage title="Docs/Installation/Project setup" md={md} />,
} satisfies Meta;
export default meta;

export const Page = {};
