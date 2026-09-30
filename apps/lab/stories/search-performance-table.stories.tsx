import { SearchPerformanceTable } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { gscReport, useAr } from "./_analytics-demo";

const meta = { title: "Components/Analytics/Search Performance Table", component: SearchPerformanceTable, parameters: { layout: "padded" } } satisfies Meta<typeof SearchPerformanceTable>;
export default meta;
type Story = StoryObj;

function Demo({ kind = "query", state }: { kind?: "query" | "page"; state?: "loading" | "error" | "empty" }) {
  const ar = useAr();
  const d = gscReport(28, ar);
  return (
    <SearchPerformanceTable
      kind={kind}
      rows={state === "empty" ? [] : kind === "query" ? d.queries : d.pages}
      pageSize={8}
      loading={state === "loading"}
      error={state === "error" ? (ar ? "تعذّر الوصول إلى Search Console." : "Search Console could not be reached.") : undefined}
      onRetry={() => undefined}
      onRowClick={() => undefined}
    />
  );
}

export const Queries: Story = { render: () => <Demo /> };
export const Pages: Story = { render: () => <Demo kind="page" /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
export const Loading: Story = { render: () => <Demo state="loading" /> };
export const ErrorState: Story = { render: () => <Demo state="error" /> };
export const Empty: Story = { render: () => <Demo state="empty" /> };
