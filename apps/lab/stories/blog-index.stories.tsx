import { BlogIndex } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { demoPosts, useAr5 } from "./_x5-demo";

const meta = { title: "Components/Layout/Blog Index", component: BlogIndex, parameters: { layout: "fullscreen" } } satisfies Meta<typeof BlogIndex>;
export default meta;
type Story = StoryObj<typeof meta>;

function Demo({ featured = true, size = 6, count }: { featured?: boolean; size?: number; count?: number }) {
  const ar = useAr5();
  return (
    <div className="mx-auto w-full max-w-6xl p-4">
      <BlogIndex posts={demoPosts(ar).slice(0, count)} showFeatured={featured} pageSize={size} title={ar ? "المدونة" : "Blog"} description={ar ? "ملاحظات عن التصميم والهندسة." : "Notes on design and engineering."} postHref={(p) => `#${p.slug}`} />
    </div>
  );
}

export const Default: Story = { args: { posts: [] }, render: () => <Demo /> };
export const Arabic: Story = { args: { posts: [] }, globals: { locale: "ar" }, render: () => <Demo /> };
export const NoFeatured: Story = { args: { posts: [] }, render: () => <Demo featured={false} size={4} /> };
export const FewPosts: Story = { args: { posts: [] }, render: () => <Demo count={2} /> };
export const Empty: Story = { args: { posts: [] }, render: () => <Demo count={0} /> };
