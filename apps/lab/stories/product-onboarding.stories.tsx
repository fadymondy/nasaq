/* The first-run flow every Nasaq product shares. Nothing here talks to a server. */
import { Field, FieldLabel, Input, NativeSelect, ProductOnboarding, type ProductOnboardingState, applyOnboardingAction, toast } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { CenteredPage, sleep, useAr } from "./_onboarding-demo";

const meta = { title: "Components/Onboarding/Pages/Product Onboarding", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Demo({ initial }: { initial: ProductOnboardingState }) {
  const ar = useAr();
  const t = (en: string, arabic: string) => (ar ? arabic : en);
  const [state, setState] = useState(initial);
  const [name, setName] = useState(t("3x1 Store", "متجر ثري إكس ون"));
  const [currency, setCurrency] = useState("EGP");
  const product = t("Matjar", "متجر");
  return (
    <CenteredPage>
      <ProductOnboarding
        product={product}
        state={state}
        workspace={{
          ready: name.trim().length > 1,
          content: (
            <Field>
              <FieldLabel>{t("Store name", "اسم المتجر")}</FieldLabel>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
          ),
        }}
        business={{
          content: (
            <Field>
              <FieldLabel>{t("Currency", "العملة")}</FieldLabel>
              <NativeSelect value={currency} onChange={(e) => setCurrency(e.target.value)} options={[{ value: "EGP", label: "EGP" }, { value: "SAR", label: "SAR" }, { value: "USD", label: "USD" }]} />
            </Field>
          ),
        }}
        onLoadSampleData={() => sleep(900)}
        mcp={{ server: { name: "matjar", url: "https://3x1.matjar.app/api/mcp" } }}
        onInvite={() => sleep(600)}
        roles={[
          { value: "admin", label: t("Admin", "مدير") },
          { value: "staff", label: t("Staff", "موظف") },
        ]}
        onAction={async (step, action) => {
          await sleep(300);
          setState((s) => applyOnboardingAction(s, step, action));
        }}
        onExit={() => toast(t("Back to the dashboard", "العودة إلى لوحة التحكم"))}
      />
    </CenteredPage>
  );
}

/** A new store: the console created it, so the wizard opens at step 1 to confirm it. */
export const Default: Story = { render: () => <Demo initial={{ completed: [] }} /> };
/** Came back later: the first two are done and sample data was skipped, so it opens at "Connect your AI". */
export const Resumed: Story = { render: () => <Demo initial={{ completed: ["workspace", "business"], skipped: ["sample-data"] }} /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo initial={{ completed: [] }} /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Demo initial={{ completed: ["workspace"] }} /> };
