/*
 * Your data: request an export and follow it until it can be downloaded, or schedule the account for
 * deletion. Deleting needs sara@example.com typed. Scheduled shows the grace period.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useAr } from "./_team-demo";
import { PageShell, PrivacyDemo } from "./_team-pages";

const meta = { title: "Components/Security/Pages/Privacy", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page({ scheduled }: { scheduled?: boolean }) {
  const ar = useAr();
  return (
    <PageShell title={ar ? "بياناتك" : "Your data"} description={ar ? "احصل على نسخة من بياناتك أو احذف حسابك." : "Get a copy of your data or delete your account."}>
      <PrivacyDemo scheduled={scheduled} />
    </PageShell>
  );
}

export const Default: Story = { render: () => <Page /> };
export const DeletionScheduled: Story = { render: () => <Page scheduled /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page scheduled /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
