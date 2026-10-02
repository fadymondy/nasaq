import assert from "node:assert/strict";
import { test } from "node:test";
import { createHubLocationsDataSource, placeName } from "../src/components/address-input/locations-data.ts";

const fakeFetch = () => {
  const calls = [];
  const fn = async (url) => {
    calls.push(String(url));
    return { ok: true, status: 200, json: async () => ({ items: [{ id: 1, name_en: "", name_ar: "القاهرة" }] }) };
  };
  return { fn, calls };
};

test("hub source calls the public endpoints and caches", async () => {
  const { fn, calls } = fakeFetch();
  const ds = createHubLocationsDataSource({ baseUrl: "https://hub.example/", fetch: fn });
  await ds.countries();
  await ds.countries();
  await ds.cities(65);
  await ds.areas(1);
  await ds.search("cairo", { type: "city", countryId: 65 });
  assert.deepEqual(calls, [
    "https://hub.example/api/locations/countries",
    "https://hub.example/api/locations/cities?country_id=65",
    "https://hub.example/api/locations/areas?city_id=1",
    "https://hub.example/api/locations/search?q=cairo&type=city&country_id=65&limit=20",
  ]);
});

test("a failed request is not cached", async () => {
  let n = 0;
  const ds = createHubLocationsDataSource({
    baseUrl: "https://hub.example",
    fetch: async () => (++n === 1 ? { ok: false, status: 500, json: async () => ({}) } : { ok: true, status: 200, json: async () => ({ items: [] }) }),
  });
  await assert.rejects(ds.countries());
  assert.deepEqual(await ds.countries(), []);
});

test("placeName falls back to the other language", () => {
  const cairo = { name_en: "", name_ar: "القاهرة" };
  assert.equal(placeName(cairo, "en"), "القاهرة");
  assert.equal(placeName({ name_en: "Giza", name_ar: "" }, "ar"), "Giza");
  assert.equal(placeName({ name_en: "Giza", name_ar: "الجيزة" }, "ar"), "الجيزة");
});
