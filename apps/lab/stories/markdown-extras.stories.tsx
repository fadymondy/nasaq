import { RichMarkdown } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { markdownExtrasSource, useArU } from "./_u-demo";

const meta = { title: "Components/Editors/Markdown Extras", component: RichMarkdown, parameters: { layout: "fullscreen" } } satisfies Meta<typeof RichMarkdown>;
export default meta;
type Story = StoryObj<typeof meta>;

function Demo({ hideFrontmatter = false, plain = false }: { hideFrontmatter?: boolean; plain?: boolean }) {
  const ar = useArU();
  return (
    <div className="mx-auto max-w-3xl p-6">
      <RichMarkdown frontmatter={hideFrontmatter ? "hide" : "table"} tables={plain ? false : { downloadable: true, filterable: true }} code={plain ? false : { lineNumbers: true }}>
        {markdownExtrasSource(ar)}
      </RichMarkdown>
    </div>
  );
}

const args = { children: "" };

export const Default: Story = { args, render: () => <Demo /> };
export const Arabic: Story = { args, globals: { locale: "ar" }, render: () => <Demo /> };
export const HiddenFrontmatter: Story = { args, render: () => <Demo hideFrontmatter /> };
export const Plain: Story = { args, render: () => <Demo plain /> };
