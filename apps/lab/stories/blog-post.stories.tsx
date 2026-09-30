import { BlogPost, Callout, PostBody, TableOfContents, extractToc } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { demoPost, demoPosts, useAr5 } from "./_x5-demo";

const meta = { title: "Components/Layout/Blog Post", component: BlogPost, parameters: { layout: "fullscreen" } } satisfies Meta<typeof BlogPost>;
export default meta;
type Story = StoryObj<typeof meta>;

function Demo({ toc = true, progress = true }: { toc?: boolean; progress?: boolean }) {
  const ar = useAr5();
  return <BlogPost post={demoPost(ar)} posts={demoPosts(ar)} toc={toc} progress={progress} url="https://example.com/blog/calm-interfaces" postHref={(p) => `#${p.slug}`} backHref="#blog" />;
}

export const Default: Story = { args: { post: demoPost(false) }, render: () => <Demo /> };
export const Arabic: Story = { args: { post: demoPost(true) }, globals: { locale: "ar" }, render: () => <Demo /> };
export const WithoutToc: Story = { args: { post: demoPost(false) }, render: () => <Demo toc={false} /> };

export const Parts: Story = {
  args: { post: demoPost(false) },
  render: () => {
    const items = extractToc(demoPost(false).body);
    return (
      <div className="flex max-w-xl flex-col gap-6 p-6">
        <TableOfContents items={items} activeId={items[1]?.id} />
        <Callout kind="tip">Callouts are also written in Markdown as a blockquote starting with [!TIP].</Callout>
        <PostBody markdown={"## Body\n\nRich **Markdown** with `code`.\n\n> [!WARNING]\n> Careful.\n"} />
      </div>
    );
  },
};
