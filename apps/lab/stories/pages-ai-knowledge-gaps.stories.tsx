import type { Meta, StoryObj } from "@storybook/react-vite";
import { KnowledgeGapsDemo, T2Page, useAr } from "./_t2-demo";

const meta = { title: "Pages/AI/Knowledge Gaps", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  return (
    <T2Page title={ar ? "فجوات المعرفة" : "Knowledge gaps"} description={ar ? "أسئلة لم يستطع الدماغ الإجابة عنها. فهرسها أو تجاهلها." : "Questions the brain could not answer. Index them or dismiss them."}>
      <KnowledgeGapsDemo />
    </T2Page>
  );
}

export const Default: Story = { render: () => <Page /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };

export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
