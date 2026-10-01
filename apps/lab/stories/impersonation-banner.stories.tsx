import { ImpersonationBanner } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArabicScope, useAr, wait } from "./_team-demo";

const meta = { title: "Components/Admin/Impersonation Banner", component: ImpersonationBanner, parameters: { layout: "padded" } } satisfies Meta<typeof ImpersonationBanner>;
export default meta;
type Story = StoryObj;

const started = new Date(Date.now() - 12 * 60_000);

function Demo({ mode }: { mode: "impersonate" | "preview" }) {
  const ar = useAr();
  return <ImpersonationBanner mode={mode} as={{ name: ar ? "ليلى المطيري" : "Layla Almutairi", email: "layla@example.com" }} startedAt={started} onExit={() => wait(800)} />;
}

export const Impersonating: Story = { render: () => <Demo mode="impersonate" /> };
export const Preview: Story = { render: () => <Demo mode="preview" /> };
export const Arabic: Story = {
  globals: { locale: "ar" },
  render: () => (
    <ArabicScope>
      <Demo mode="impersonate" />
    </ArabicScope>
  ),
};
