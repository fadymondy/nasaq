/* Compose and send a broadcast. The screen lives in ./_crm-r1-demo.tsx. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CrmPage } from "./_crm-demo";
import { CampaignComposerDemo } from "./_crm-r1-demo";
import { useAr } from "./_profile-demo";

function CampaignPage() {
  const ar = useAr();
  return (
    <CrmPage title={ar ? "حملة جديدة" : "New campaign"} description={ar ? "أرسل رسالة إلى جمهور بالبريد أو واتساب." : "Send a message to an audience by email or WhatsApp."}>
      <CampaignComposerDemo />
    </CrmPage>
  );
}

const meta = { title: "Components/Marketing/Pages/Campaign", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <CampaignPage /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <CampaignPage /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <CampaignPage /> };
