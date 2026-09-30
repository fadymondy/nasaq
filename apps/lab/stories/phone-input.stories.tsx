import { Field, FieldDescription, FieldError, FieldLabel, NasaqProvider, PhoneInput, useNasaq } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useState } from "react";

const meta = { title: "Components/Forms/Phone input", component: PhoneInput } satisfies Meta<typeof PhoneInput>;
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

function Basic() {
  const ar = useAr();
  const [value, setValue] = useState("");
  return (
    <div className="flex w-80 max-w-full flex-col gap-3">
      <Field>
        <FieldLabel>{ar ? "رقم الجوال" : "Mobile number"}</FieldLabel>
        <PhoneInput value={value} onValueChange={setValue} />
        <FieldDescription>{ar ? "اكتب الرقم بدون رمز الدولة، أو الصق رقمًا يبدأ بـ +." : "Type the number without the country code, or paste one that starts with +."}</FieldDescription>
      </Field>
      <code dir="ltr" className="text-caption text-muted-foreground">
        E.164: {value || "(empty)"}
      </code>
    </div>
  );
}

/** Gulf and Arab countries come first, then the rest. The value is E.164; a trunk 0 is dropped (`0501234567` gives `+966501234567`). */
export const Default: Story = { render: () => <Basic /> };

/** Arabic provider: names in Arabic, group mirrored (country at the start edge), digits still left to right. */
export const Arabic: Story = {
  render: () => (
    <ArabicScope>
      <div className="p-2">
        <Basic />
      </div>
    </ArabicScope>
  ),
};

function Prefilled() {
  const ar = useAr();
  const [value, setValue] = useState("+971501234567");
  return (
    <div className="flex w-80 max-w-full flex-col gap-3">
      <Field>
        <FieldLabel>{ar ? "هاتف العمل" : "Work phone"}</FieldLabel>
        <PhoneInput value={value} onValueChange={setValue} />
      </Field>
      <code dir="ltr" className="text-caption text-muted-foreground">
        E.164: {value || "(empty)"}
      </code>
    </div>
  );
}

/** An existing E.164 value selects its country by calling code. */
export const Prefilled_: Story = {
  name: "Prefilled (English and Arabic)",
  render: () => (
    <div className="flex flex-wrap gap-8">
      <Prefilled />
      <ArabicScope>
        <Prefilled />
      </ArabicScope>
    </div>
  ),
};

function Validated() {
  const ar = useAr();
  const [value, setValue] = useState("+96650");
  const bad = value.length < 12;
  return (
    <div className="w-80 max-w-full">
      <Field invalid={bad}>
        <FieldLabel>{ar ? "رقم الجوال" : "Mobile number"}</FieldLabel>
        <PhoneInput value={value} onValueChange={setValue} invalid={bad} />
        <FieldError match>{ar ? "أدخل رقمًا كاملًا." : "Enter a complete number."}</FieldError>
      </Field>
    </div>
  );
}

/** Inside `Field`: the label names the digits input and the error paints the group border. */
export const Invalid: Story = {
  name: "Invalid (English and Arabic)",
  render: () => (
    <div className="flex flex-wrap gap-8">
      <Validated />
      <ArabicScope>
        <Validated />
      </ArabicScope>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="w-80 max-w-full">
      <PhoneInput disabled defaultValue="+201001234567" aria-label="Phone" />
    </div>
  ),
};
