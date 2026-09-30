import { ApiReference } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { apiTools, useAr } from "./_devtools-q3-demo";

const meta = { title: "Components/Developer/API Reference", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Demo({ view }: { view?: "reference" | "catalog" }) {
  const ar = useAr();
  return <ApiReference tools={apiTools(ar)} {...(view ? { defaultView: view } : {})} />;
}

/** A list of tools beside the selected tool's scope, minimum role, arguments and example call. */
export const Default: Story = { render: () => <Demo /> };
export const Catalog: Story = { render: () => <Demo view="catalog" /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
