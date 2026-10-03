<script setup lang="ts">
import { NqAddressInput, type Address, type LocationsDataSource } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

// A small offline source so the example does not depend on the network. Leave `data-source` out to use the CircleXO hub.
const source: LocationsDataSource = {
  countries: async () => [
    { id: 65, iso2: "EG", name_en: "Egypt", name_ar: "مصر" },
    { id: 187, iso2: "SA", name_en: "Saudi Arabia", name_ar: "السعودية" },
  ],
  cities: async (countryId) =>
    countryId === 65
      ? [{ id: 2, country_id: 65, name_en: "Alexandria", name_ar: "الإسكندرية" }]
      : [{ id: 10, country_id: 187, name_en: "Riyadh", name_ar: "الرياض" }],
  areas: async (cityId) => [{ id: cityId * 100 + 1, city_id: cityId, name_en: "Downtown", name_ar: "وسط المدينة" }],
};

const address = ref<Address>({ street: "" });
</script>

<template>
  <div class="w-[34rem] max-w-full">
    <NqAddressInput v-model="address" :data-source="source" />
  </div>
</template>
