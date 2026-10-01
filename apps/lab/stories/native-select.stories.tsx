import { Field, FieldDescription, FieldLabel, NativeSelect } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useAr } from "./_lifecycle-demo";

const meta = { title: "Components/Forms/Native Select", component: NativeSelect, parameters: { layout: "padded" } } satisfies Meta<typeof NativeSelect>;
export default meta;
type Story = StoryObj<typeof meta>;

const countries = (ar: boolean) => [
  { value: "eg", label: ar ? "مصر" : "Egypt" },
  { value: "sa", label: ar ? "السعودية" : "Saudi Arabia" },
  { value: "ae", label: ar ? "الإمارات" : "United Arab Emirates" },
  { value: "jo", label: ar ? "الأردن" : "Jordan" },
  { value: "ma", label: ar ? "المغرب" : "Morocco" },
];

function Demo(props: { size?: "sm" | "md"; invalid?: boolean; disabled?: boolean }) {
  const ar = useAr();
  return (
    <Field className="max-w-xs" invalid={props.invalid} disabled={props.disabled}>
      <FieldLabel>{ar ? "الدولة" : "Country"}</FieldLabel>
      <NativeSelect name="country" defaultValue="" placeholder={ar ? "اختر دولة" : "Choose a country"} options={countries(ar)} size={props.size} required />
      <FieldDescription>{ar ? "قائمة المتصفح نفسها: سريعة على الجوال." : "The browser's own list: fast on phones."}</FieldDescription>
    </Field>
  );
}

export const Playground: Story = { render: () => <Demo /> };

/** Groups and options as children, for lists with sections. */
export const Groups: Story = {
  render: () => {
    const ar = useAr();
    return (
      <Field className="max-w-xs">
        <FieldLabel>{ar ? "المنطقة الزمنية" : "Time zone"}</FieldLabel>
        <NativeSelect defaultValue="Africa/Cairo">
          <optgroup label={ar ? "أفريقيا" : "Africa"}>
            <option value="Africa/Cairo">Cairo (UTC+2)</option>
            <option value="Africa/Casablanca">Casablanca (UTC+1)</option>
          </optgroup>
          <optgroup label={ar ? "آسيا" : "Asia"}>
            <option value="Asia/Riyadh">Riyadh (UTC+3)</option>
            <option value="Asia/Dubai">Dubai (UTC+4)</option>
          </optgroup>
        </NativeSelect>
      </Field>
    );
  },
};

export const Small: Story = { render: () => <Demo size="sm" /> };
export const Invalid: Story = { render: () => <Demo invalid /> };
export const Disabled: Story = { render: () => <Demo disabled /> };
export const Arabic: Story = { ...Playground, globals: { locale: "ar" } };
