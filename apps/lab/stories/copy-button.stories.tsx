import { CopyButton, CopyField, Field, FieldLabel, NasaqProvider, useNasaq } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";

const meta = { title: "Components/Actions/Copy button", component: CopyButton, args: { value: "npm i @fadymondy/nasaq" } } satisfies Meta<typeof CopyButton>;
export default meta;
type Story = StoryObj<typeof meta>;

const useAr = () => useNasaq().locale.startsWith("ar");

function ArabicScope({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useNasaq();
  return (
    <NasaqProvider target="scope" locale="ar" theme={resolvedTheme} className="contents">
      {children}
    </NasaqProvider>
  );
}

/** Icon only. Click: the icon becomes a check for 1.5 seconds and a live region announces it. */
export const Default: Story = { render: (args) => <CopyButton {...args} /> };

export const WithLabel: Story = {
  render: () => {
    const ar = useAr();
    return (
      <div className="flex gap-3">
        <CopyButton value="https://nasaq.app/invite/abc123" variant="secondary">
          {ar ? "نسخ الرابط" : "Copy link"}
        </CopyButton>
        <CopyButton value="https://nasaq.app/invite/abc123" variant="primary" size="icon" />
      </div>
    );
  },
};

/** A read-only field for keys and URLs. The value stays left-to-right, also in Arabic. */
export const Field_: Story = {
  name: "Copy field",
  render: () => {
    const ar = useAr();
    return (
      <div className="flex w-[28rem] max-w-full flex-col gap-5">
        <Field>
          <FieldLabel>{ar ? "مفتاح API" : "API key"}</FieldLabel>
          <CopyField value="nq_live_4f9c2b7a1d8e" label={ar ? "مفتاح API" : "API key"} />
        </Field>
        <Field>
          <FieldLabel>{ar ? "رابط الدعوة" : "Invite link"}</FieldLabel>
          <CopyField value="https://nasaq.app/invite/abc123?ref=team" label={ar ? "رابط الدعوة" : "Invite link"} />
        </Field>
      </div>
    );
  },
};

export const Arabic: Story = {
  render: () => (
    <ArabicScope>
      <div className="flex w-[28rem] max-w-full flex-col gap-4">
        <CopyField value="nq_live_4f9c2b7a1d8e" label="مفتاح API" />
        <div className="flex items-center gap-3">
          <CopyButton value="nq_live_4f9c2b7a1d8e" />
          <CopyButton value="nq_live_4f9c2b7a1d8e" variant="secondary">
            نسخ المفتاح
          </CopyButton>
        </div>
      </div>
    </ArabicScope>
  ),
};

/** Wait 4 seconds instead of 1.5 for slow readers; `onCopy` reports the text. */
export const CustomTimeout: Story = { render: (args) => <CopyButton {...args} resetAfter={4000} /> };
