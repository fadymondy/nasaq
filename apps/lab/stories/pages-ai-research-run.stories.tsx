import type { Meta, StoryObj } from "@storybook/react-vite";
import { ResearchRunDemo, T2Page, useAr } from "./_t2-demo";

const meta = { title: "Pages/AI/Research Run", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  return (
    <T2Page title={ar ? "البحث" : "Research"} description={ar ? "اطرح سؤالًا وتابع التشغيل حتى إجابة موثّقة." : "Ask a question and follow the run to a cited answer."}>
      <ResearchRunDemo />
    </T2Page>
  );
}

export const Default: Story = { render: () => <Page /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };

export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
