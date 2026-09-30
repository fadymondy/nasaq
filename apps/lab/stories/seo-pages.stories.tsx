import { SeoIssueChecklist, SeoPageList } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { SeoDemo, seoPages, useAr } from "./_moharrik-demo";

const meta = { title: "Components/Analytics/SEO Pages", component: SeoPageList, parameters: { layout: "padded" } } satisfies Meta<typeof SeoPageList>;
export default meta;
type Story = StoryObj;

function Checklist() {
  const ar = useAr();
  const page = seoPages(ar)[4]!;
  return (
    <div className="max-w-2xl">
      <SeoIssueChecklist url={page.url} issues={page.issues} onToggleFixed={async () => {}} />
    </div>
  );
}

function Loading() {
  return <SeoPageList pages={[]} loading />;
}

function Failed() {
  return <SeoPageList pages={[]} error="The crawl service did not answer." onRetry={() => {}} />;
}

export const Default: Story = { render: () => <SeoDemo preview={false} /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <SeoDemo preview={false} /> };
export const IssueChecklist: Story = { render: () => <Checklist /> };
export const Empty: Story = { render: () => <SeoPageList pages={[]} /> };
export const LoadingState: Story = { render: () => <Loading /> };
export const ErrorState: Story = { render: () => <Failed /> };
