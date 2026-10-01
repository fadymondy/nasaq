import { FormBuilder, NasaqProvider, contactFormDefinition, useNasaq, type FormDefinition } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useState } from "react";
import { wait } from "./_r2-demo";

const meta = { title: "Components/Form Builders/Form builder", component: FormBuilder } satisfies Meta<typeof FormBuilder>;
export default meta;
type Story = StoryObj;

function ArabicScope({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useNasaq();
  return (
    <NasaqProvider target="scope" locale="ar" theme={resolvedTheme} className="contents">
      {children}
    </NasaqProvider>
  );
}

function Demo({ origins }: { origins: string[] }) {
  const [form, setForm] = useState<FormDefinition>(() => ({ ...contactFormDefinition(), allowedOrigins: origins }));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  return (
    <div className="flex w-full flex-col gap-3">
      <FormBuilder
        value={form}
        onValueChange={(f) => {
          setForm(f);
          setSaved(false);
        }}
        formKey="pk_live_8f2c1a"
        embedBaseUrl="https://forms.nasaq.example"
        saving={saving}
        onSave={async () => {
          setSaving(true);
          await wait();
          setSaving(false);
          setSaved(true);
        }}
      />
      {saved ? (
        <p role="status" className="text-body-sm text-muted-foreground">
          Saved.
        </p>
      ) : null}
    </div>
  );
}

/** Add and reorder fields (context-click a field for its menu), write rules on Logic, set origins, copy the snippet from Embed. */
export const Default: Story = { parameters: { layout: "padded" }, render: () => <Demo origins={["https://nasaq.example", "https://*.nasaq.example"]} /> };

export const Arabic: Story = {
  globals: { locale: "ar" },
  parameters: { layout: "padded" },
  render: () => (
    <ArabicScope>
      <Demo origins={["https://nasaq.example"]} />
    </ArabicScope>
  ),
};

/** No allowed sites: nothing may embed the form, and Settings says so. */
export const NoOrigins: Story = { parameters: { layout: "padded" }, render: () => <Demo origins={[]} /> };
