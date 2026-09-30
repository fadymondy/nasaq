import { AccountSettings, Button, DangerZone, SettingsSection } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArabicScope, useAr, wait } from "./_profile-demo";

const meta = { title: "Components/Account/Account Settings", component: AccountSettings, parameters: { layout: "fullscreen" } } satisfies Meta<typeof AccountSettings>;
export default meta;
type Story = StoryObj;

function Demo() {
  const ar = useAr();
  return (
    <div className="p-4 sm:p-8">
      <AccountSettings defaultValue="security">
        {(id) =>
          id === "danger" ? (
            <DangerZone confirmText="sara@example.com" onDelete={() => wait(900)} />
          ) : (
            <SettingsSection
              title={id}
              description={ar ? "محتوى هذا القسم يأتي من مكوّنك." : "The content of this section comes from your own component."}
              footer={ar ? "آخر تحديث اليوم" : "Last updated today"}
              actions={<Button>{ar ? "حفظ" : "Save"}</Button>}
            >
              <p className="text-body-sm text-muted-foreground">{ar ? "ضع النماذج هنا." : "Put forms here."}</p>
            </SettingsSection>
          )
        }
      </AccountSettings>
    </div>
  );
}

export const Default: Story = { render: () => <Demo /> };
export const Arabic: Story = {
  render: () => (
    <ArabicScope>
      <Demo />
    </ArabicScope>
  ),
};
export const DangerZoneOnly: Story = {
  render: () => (
    <div className="w-[40rem] max-w-full">
      <DangerZone onDelete={() => wait(900)} />
    </div>
  ),
};
