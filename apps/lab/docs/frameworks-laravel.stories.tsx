import type { Meta } from "@storybook/react-vite";
import { DocPage, docParameters } from "./doc-page";
import raw from "../../../docs/frameworks/filament.md?raw";

const md = raw;

const meta = {
  title: "Docs/Frameworks/Laravel and Filament",
  tags: ["!autodocs"],
  parameters: docParameters,
  render: () => <DocPage title="Docs/Frameworks/Laravel and Filament" md={md} />,
} satisfies Meta;
export default meta;

export const Page = {};
