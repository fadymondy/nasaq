import { type Address, AddressInput, CountrySelect, createHubLocationsDataSource, type LocationsDataSource, NasaqProvider, useNasaq } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useState } from "react";

const meta = { title: "Components/Forms/Address input", component: AddressInput } satisfies Meta<typeof AddressInput>;
export default meta;
type Story = StoryObj<typeof meta>;

// A small offline source so the story does not depend on the network.
const demo: LocationsDataSource = {
  countries: async () => [
    { id: 65, iso2: "EG", name_en: "Egypt", name_ar: "مصر", phone_code: "20" },
    { id: 187, iso2: "SA", name_en: "Saudi Arabia", name_ar: "السعودية", phone_code: "966" },
  ],
  cities: async (countryId) =>
    countryId === 65
      ? [
          { id: 1, country_id: 65, name_en: "", name_ar: "القاهرة" },
          { id: 2, country_id: 65, name_en: "Alexandria", name_ar: "الإسكندرية" },
        ]
      : [{ id: 10, country_id: 187, name_en: "Riyadh", name_ar: "الرياض" }],
  areas: async (cityId) => [
    { id: cityId * 100 + 1, city_id: cityId, name_en: "Downtown", name_ar: "وسط المدينة" },
    { id: cityId * 100 + 2, city_id: cityId, name_en: "", name_ar: "حي الشمال" },
  ],
};

function ArabicScope({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useNasaq();
  return (
    <NasaqProvider target="scope" locale="ar" theme={resolvedTheme} className="contents">
      {children}
    </NasaqProvider>
  );
}

function Basic({ dataSource }: { dataSource?: LocationsDataSource }) {
  const [value, setValue] = useState<Address>({ street: "" });
  return (
    <div className="flex w-[34rem] max-w-full flex-col gap-3">
      <AddressInput value={value} onValueChange={setValue} dataSource={dataSource} />
      <code dir="ltr" className="whitespace-pre-wrap text-caption text-muted-foreground">
        {JSON.stringify(value)}
      </code>
    </div>
  );
}

/** Country, city and area cascade: each is disabled until its parent is chosen and resets when the parent changes. Offline demo data. */
export const Default: Story = { render: () => <Basic dataSource={demo} /> };

/** Arabic provider: labels and names in Arabic (Cairo has no English name here, so the Arabic one shows in English too), layout mirrored. */
export const Arabic: Story = {
  render: () => (
    <ArabicScope>
      <div className="p-2">
        <Basic dataSource={demo} />
      </div>
    </ArabicScope>
  ),
};

/** Default data source: the CircleXO hub public locations API. */
export const HubDataSource: Story = { render: () => <Basic dataSource={createHubLocationsDataSource()} /> };

/** Without the phone field, disabled. */
export const NoPhoneDisabled: Story = {
  render: () => <AddressInput dataSource={demo} showPhone={false} disabled defaultValue={{ street: "12 Tahrir St", country_id: 65, city_id: 1 }} />,
};

function Country() {
  const [iso, setIso] = useState("");
  return (
    <div className="w-80 max-w-full">
      <CountrySelect value={iso} onValueChange={setIso} aria-label="Country" />
    </div>
  );
}

/** `CountrySelect`: searchable country list with flags; the value is the ISO 3166-1 alpha-2 code. */
export const CountryPicker: Story = { render: () => <Country /> };
