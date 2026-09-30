/* Knowledge graph: one set of connected notes as a live graph, a schema of columns, a grid or a list. Demo data lives in ./_workflow-demo.tsx. */
import { Button, GraphView } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Plus } from "lucide-react";
import { useMemo } from "react";
import { FlowPage, graphData, graphKinds, graphLinkKinds, useAr } from "./_workflow-demo";

const meta = { title: "Pages/App/Knowledge Graph", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page({ mode }: { mode?: "graph" | "schema" }) {
  const ar = useAr();
  const data = useMemo(() => graphData(ar), [ar]);
  const kinds = useMemo(() => graphKinds(ar), [ar]);
  const linkKinds = useMemo(() => graphLinkKinds(ar), [ar]);
  return (
    <FlowPage
      fill
      title={ar ? "الذاكرة" : "Brain"}
      description={ar ? "كل ما نعرفه وكيف يرتبط ببعضه." : "Everything we know and how it connects."}
      actions={
        <Button variant="primary">
          <Plus aria-hidden />
          {ar ? "ملاحظة جديدة" : "New note"}
        </Button>
      }
    >
      <GraphView {...(mode ? { defaultMode: mode } : {})} nodes={data.nodes} links={data.links} kinds={kinds} linkKinds={linkKinds} arrows defaultSelectedId="offline" onOpen={() => undefined} />
    </FlowPage>
  );
}

export const Default: Story = { render: () => <Page /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
export const Schema: Story = { render: () => <Page mode="schema" /> };
export const ArabicSchema: Story = { globals: { locale: "ar" }, render: () => <Page mode="schema" /> };
