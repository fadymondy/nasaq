/* Error tracking: captured errors with a frequency sparkline and a detail view. Demo data lives in ./_devtools-q3-demo.tsx. */
import { ErrorTracking } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { errorIssues, FlowPage, useAr, wait } from "./_devtools-q3-demo";

const meta = { title: "Pages/Developer/Error Tracking", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  return (
    <FlowPage title={ar ? "الأخطاء" : "Errors"} description={ar ? "الأخطاء الملتقطة من تطبيقك، مرتبة حسب التكرار." : "Errors captured from your app, ordered by how often they happen."}>
      <ErrorTracking issues={errorIssues(ar)} onStatusChange={async () => wait(600)} />
    </FlowPage>
  );
}

export const Default: Story = { render: () => <Page /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
