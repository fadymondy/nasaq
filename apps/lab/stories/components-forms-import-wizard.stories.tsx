import type { Meta, StoryObj } from "@storybook/react-vite";
import { ImportDemo, SAMPLE_CSV } from "./_workflow-p2-demo";

const meta = { title: "Components/Files/Import Wizard", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Demo() {
  return (
    <div className="flex flex-col gap-4">
      <details className="text-body-sm text-muted-foreground">
        <summary className="cursor-pointer">Sample CSV to paste</summary>
        <pre dir="ltr" className="mt-2 overflow-x-auto rounded-md bg-muted p-3 text-caption">{SAMPLE_CSV}</pre>
      </details>
      <ImportDemo />
    </div>
  );
}

/** Upload or paste a CSV, map its columns, review the problems, then import. The sample has a bad email, a missing name and a duplicate. */
export const Default: Story = { render: () => <Demo /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
