/* Merge duplicate contacts, with identities and consent kept per channel. The screen lives in ./_crm-r1-demo.tsx. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CrmPage } from "./_crm-demo";
import { ContactIdentitiesDemo, ContactMergeDemo } from "./_crm-r1-demo";
import { useAr } from "./_profile-demo";

function IdentitiesPage() {
  const ar = useAr();
  return (
    <CrmPage title={ar ? "سارة العلي" : "Sara Ali"} description={ar ? "الحسابات التي يمكن الوصول إليها عبرها، والموافقة لكل قناة." : "The accounts she can be reached on, and consent per channel."}>
      <ContactIdentitiesDemo />
    </CrmPage>
  );
}

const meta = { title: "Pages/CRM/Contact Merge", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <ContactMergeDemo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <ContactMergeDemo /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <ContactMergeDemo /> };
export const Identities: Story = { render: () => <IdentitiesPage /> };
