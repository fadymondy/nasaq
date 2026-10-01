import { ColorPicker, Field, FieldDescription, FieldError, FieldLabel, NasaqProvider, useNasaq } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useState } from "react";

const meta = { title: "Components/Pickers/Color picker", component: ColorPicker } satisfies Meta<typeof ColorPicker>;
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
  const [value, setValue] = useState<string | null>("--nq-tag-teal");
  return (
    <div className="flex w-72 max-w-full flex-col gap-3">
      <Field>
        <FieldLabel>{ar ? "لون الوسم" : "Label colour"}</FieldLabel>
        <ColorPicker value={value} onValueChange={setValue} aria-label={ar ? "لون الوسم" : "Label colour"} />
        <FieldDescription>{ar ? "من لوحة الوسوم، أو أدخل قيمة سداسية." : "Pick from the tag palette, or type a hex value."}</FieldDescription>
      </Field>
      <code dir="ltr" className="text-caption text-muted-foreground">
        value: {String(value)}
      </code>
    </div>
  );
}

/** The default swatches are the `--nq-tag-*` variables, so the value is a token name that follows theme and brand. */
export const Default: Story = { render: () => <Basic /> };

/** Same picker under an Arabic provider: Arabic names, mirrored grid, arrow keys follow the reading direction. */
export const Arabic: Story = {
  render: () => (
    <ArabicScope>
      <div className="p-2">
        <Basic />
      </div>
    </ArabicScope>
  ),
};

function CustomSwatches() {
  const ar = useAr();
  const [value, setValue] = useState<string | null>("#0f7c80");
  const swatches = ar
    ? [
        { value: "--nq-tag-blue", label: "أزرق الشركة" },
        { value: "--nq-tag-green", label: "أخضر النجاح" },
        { value: "--nq-tag-red", label: "أحمر التنبيه" },
        { value: "--nq-tag-amber", label: "كهرماني التحذير" },
      ]
    : [
        { value: "--nq-tag-blue", label: "Brand blue" },
        { value: "--nq-tag-green", label: "Success green" },
        { value: "--nq-tag-red", label: "Alert red" },
        { value: "--nq-tag-amber", label: "Warning amber" },
      ];
  return (
    <div className="flex w-72 max-w-full flex-col gap-3">
      <Field>
        <FieldLabel>{ar ? "لون العلامة" : "Brand colour"}</FieldLabel>
        <ColorPicker value={value} onValueChange={setValue} swatches={swatches} columns={4} allowNative={false} aria-label={ar ? "لون العلامة" : "Brand colour"} />
      </Field>
      <code dir="ltr" className="text-caption text-muted-foreground">
        value: {String(value)}
      </code>
    </div>
  );
}

/** Your own swatches (`{ value, label }`), a hex value that is not in the list, and no native picker. */
export const CustomSwatchesEn: Story = { name: "Custom swatches", render: () => <CustomSwatches /> };

export const CustomSwatchesAr: Story = {
  name: "Custom swatches (Arabic)",
  render: () => (
    <ArabicScope>
      <div className="p-2">
        <CustomSwatches />
      </div>
    </ArabicScope>
  ),
};

function Invalid() {
  const ar = useAr();
  const [value, setValue] = useState<string | null>(null);
  return (
    <div className="w-72 max-w-full">
      <Field invalid={!value}>
        <FieldLabel>{ar ? "اللون" : "Colour"}</FieldLabel>
        <ColorPicker value={value} onValueChange={setValue} invalid={!value} aria-label={ar ? "اللون" : "Colour"} />
        <FieldError match>{ar ? "اختر لونًا." : "Choose a colour."}</FieldError>
      </Field>
    </div>
  );
}

/** Inside `Field`: the label, the invalid border and the error text wire up like any other control. */
export const InField: Story = {
  name: "In a field (English and Arabic)",
  render: () => (
    <div className="flex flex-wrap gap-8">
      <Invalid />
      <ArabicScope>
        <Invalid />
      </ArabicScope>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="w-72 max-w-full">
      <ColorPicker disabled defaultValue="--nq-tag-violet" aria-label="Colour" />
    </div>
  ),
};

export const HexOnly: Story = { render: () => <ColorPicker aria-label="Brand colour" mode="hex" defaultValue="#2f6df6" /> };
export const NoSwatches: Story = { render: () => <ColorPicker aria-label="Brand colour" swatches={[]} defaultValue="#2f6df6" /> };
