import type { Meta, StoryObj } from "@storybook/react-vite";
import { SemanticSearchDemo, T2Page, useAr } from "./_t2-demo";

const meta = { title: "Components/AI Assistant/Pages/Semantic Search", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  return (
    <T2Page title={ar ? "البحث الدلالي" : "Semantic search"} description={ar ? "ابحث بالمعنى ثم ضيّق النتائج بالفلاتر." : "Search by meaning, then narrow the results with facets."}>
      <SemanticSearchDemo />
    </T2Page>
  );
}

export const Default: Story = { render: () => <Page /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };

export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
