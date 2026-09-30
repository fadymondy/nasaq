import {
  Combobox,
  ComboboxChips,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  useNasaq,
} from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

const meta = { title: "Components/Forms/Combobox", component: Combobox } satisfies Meta<typeof Combobox>;
export default meta;
type Story = StoryObj<typeof meta>;

interface Option {
  value: string;
  label: string;
}

const COUNTRIES: Option[] = [
  { value: "sa", label: "Saudi Arabia" },
  { value: "ae", label: "United Arab Emirates" },
  { value: "eg", label: "Egypt" },
  { value: "jo", label: "Jordan" },
  { value: "kw", label: "Kuwait" },
  { value: "ma", label: "Morocco" },
];

const COUNTRIES_AR: Option[] = [
  { value: "sa", label: "المملكة العربية السعودية" },
  { value: "ae", label: "الإمارات العربية المتحدة" },
  { value: "eg", label: "مصر" },
  { value: "jo", label: "الأردن" },
  { value: "kw", label: "الكويت" },
  { value: "ma", label: "المغرب" },
];

function useCopy() {
  const ar = useNasaq().locale.startsWith("ar");
  return {
    ar,
    items: ar ? COUNTRIES_AR : COUNTRIES,
    country: ar ? "الدولة" : "Country",
    countries: ar ? "الدول" : "Countries",
    placeholder: ar ? "ابحث عن دولة…" : "Search a country…",
    empty: ar ? "لا توجد نتائج" : "No results",
    clear: ar ? "مسح" : "Clear",
    open: ar ? "فتح" : "Open",
    remove: ar ? "إزالة" : "Remove",
  };
}

function Single() {
  const c = useCopy();
  const [value, setValue] = useState<Option | null>(null);
  return (
    <Field>
      <FieldLabel>{c.country}</FieldLabel>
      <Combobox items={c.items} value={value} onValueChange={setValue}>
        <ComboboxInput placeholder={c.placeholder} clearLabel={c.clear} triggerLabel={c.open} />
        <ComboboxContent>
          <ComboboxEmpty>{c.empty}</ComboboxEmpty>
          <ComboboxList>
            {(item: Option) => (
              <ComboboxItem key={item.value} value={item}>
                {item.label}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <FieldDescription>{value ? value.label : c.placeholder}</FieldDescription>
    </Field>
  );
}

function Multi() {
  const c = useCopy();
  const [value, setValue] = useState<Option[]>([]);
  return (
    <Field>
      <FieldLabel>{c.countries}</FieldLabel>
      <Combobox multiple items={c.items} value={value} onValueChange={setValue}>
        <ComboboxChips placeholder={c.placeholder} removeLabel={c.remove} />
        <ComboboxContent>
          <ComboboxEmpty>{c.empty}</ComboboxEmpty>
          <ComboboxList>
            {(item: Option) => (
              <ComboboxItem key={item.value} value={item}>
                {item.label}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </Field>
  );
}

export const Default: Story = { render: () => <div className="w-72"><Single /></div> };

export const Multiple: Story = { render: () => <div className="w-80"><Multi /></div> };

export const Invalid: Story = {
  render: () => {
    function Demo() {
      const c = useCopy();
      return (
        <div className="w-72">
          <Field invalid>
            <FieldLabel>{c.country}</FieldLabel>
            <Combobox items={c.items}>
              <ComboboxInput placeholder={c.placeholder} aria-invalid />
              <ComboboxContent>
                <ComboboxEmpty>{c.empty}</ComboboxEmpty>
                <ComboboxList>
                  {(item: Option) => (
                    <ComboboxItem key={item.value} value={item}>
                      {item.label}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
            <FieldError match>{c.ar ? "اختر دولة." : "Choose a country."}</FieldError>
          </Field>
        </div>
      );
    }
    return <Demo />;
  },
};
