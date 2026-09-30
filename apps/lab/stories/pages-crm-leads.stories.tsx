/* The leads inbox screen: pipeline, sources, replies and conversion. The screen lives in ./_crm-r1-demo.tsx. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CrmPage } from "./_crm-demo";
import { CannedRepliesDemo, LeadsInboxDemo } from "./_crm-r1-demo";
import { useAr } from "./_profile-demo";

function LeadsPage() {
  const ar = useAr();
  return (
    <CrmPage title={ar ? "العملاء المحتملون" : "Leads"} description={ar ? "استفسارات نماذجك، ومن أين جاء كل منها." : "Inquiries from your forms, and where each came from."}>
      <LeadsInboxDemo />
    </CrmPage>
  );
}

function CannedPage() {
  const ar = useAr();
  return (
    <CrmPage title={ar ? "الردود الجاهزة" : "Canned replies"} description={ar ? "إجابات محفوظة يدرجها فريقك بشرطة مائلة." : "Saved answers your team inserts with a slash."}>
      <CannedRepliesDemo />
    </CrmPage>
  );
}

const meta = { title: "Pages/CRM/Leads", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <LeadsPage /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <LeadsPage /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <LeadsPage /> };
export const CannedReplies: Story = { render: () => <CannedPage /> };
