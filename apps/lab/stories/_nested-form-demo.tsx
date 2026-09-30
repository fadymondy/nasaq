/*
 * Demo data for the nested SchemaForm: a company with an address, contacts that each have phones, and tags.
 * Deterministic, no network. All names and numbers are invented.
 */
import type { FormRule, RuleGroup, SchemaFormJson, SchemaFormSubmitResult } from "@nasaq/web";
import { wait } from "./_w2-demo";

export const NESTED_SCHEMA: SchemaFormJson = {
  type: "object",
  required: ["name", "email"],
  properties: {
    name: { type: "string", title: "Company name", "x-title-ar": "اسم الشركة", minLength: 2, maxLength: 80 },
    email: { type: "string", format: "email", title: "Billing email", "x-title-ar": "بريد الفواتير", "x-width": "half" },
    owner: { type: "string", title: "Account owner", "x-title-ar": "مدير الحساب", "x-relation": { resource: "people" }, "x-width": "half" },
    tags: {
      type: "array",
      title: "Tags",
      "x-title-ar": "الوسوم",
      description: "Up to five, no repeats.",
      "x-description-ar": "خمسة كحد أقصى، دون تكرار.",
      items: { type: "string", maxLength: 24 },
      maxItems: 5,
      uniqueItems: true,
    },
    channels: {
      type: "array",
      title: "Notify by",
      "x-title-ar": "الإشعار عبر",
      uniqueItems: true,
      minItems: 1,
      items: { type: "string", oneOf: [{ const: "email", title: "Email", "x-title-ar": "البريد" }, { const: "sms", title: "SMS", "x-title-ar": "الرسائل" }, { const: "push", title: "Push", "x-title-ar": "الإشعارات" }] },
    },
    address: {
      type: "object",
      title: "Address",
      "x-title-ar": "العنوان",
      required: ["city"],
      properties: {
        street: { type: "string", title: "Street", "x-title-ar": "الشارع" },
        city: { type: "string", title: "City", "x-title-ar": "المدينة", "x-width": "half" },
        postal: { type: "string", title: "Postal code", "x-title-ar": "الرمز البريدي", "x-width": "half" },
        geo: {
          type: "object",
          title: "Location",
          "x-title-ar": "الموقع",
          properties: { lat: { type: "number", title: "Latitude", "x-title-ar": "خط العرض", "x-width": "half" }, lng: { type: "number", title: "Longitude", "x-title-ar": "خط الطول", "x-width": "half" } },
        },
      },
    },
    contacts: {
      type: "array",
      title: "Contacts",
      "x-title-ar": "جهات الاتصال",
      minItems: 1,
      maxItems: 4,
      "x-title": "name",
      items: {
        type: "object",
        title: "Contact",
        "x-title-ar": "جهة اتصال",
        required: ["name", "phone"],
        properties: {
          name: { type: "string", title: "Name", "x-title-ar": "الاسم", "x-width": "half" },
          kind: { type: "string", title: "Role", "x-title-ar": "الدور", "x-width": "half", enum: ["billing", "technical", "legal"], "x-enum-titles": { billing: "Billing", technical: "Technical", legal: "Legal" }, "x-enum-titles-ar": { billing: "الفواتير", technical: "تقني", legal: "قانوني" }, default: "billing" },
          phone: { type: "string", format: "tel", title: "Main phone", "x-title-ar": "الهاتف الرئيسي", "x-width": "half" },
          email: { type: "string", format: "email", title: "Email", "x-title-ar": "البريد", "x-width": "half" },
          taxId: { type: "string", title: "Tax id", "x-title-ar": "الرقم الضريبي", "x-width": "half" },
          phones: { type: "array", title: "Other phones", "x-title-ar": "أرقام أخرى", maxItems: 3, items: { type: "string", title: "Phone", "x-title-ar": "هاتف", format: "tel" } },
        },
      },
    },
  },
};

function condition(field: string, value: string): RuleGroup {
  return { kind: "group", id: "g", join: "and", children: [{ kind: "condition", id: "c", field, op: "is", value }] };
}

/** Inside each contact, the tax id shows only for the billing contact. `./kind` reads the same contact. */
export const NESTED_RULES: FormRule[] = [
  { event: "", conditions: condition("./kind", "billing"), actions: [{ id: "a1", type: "show", config: { target: "contacts[].taxId" } }] },
  { event: "", conditions: condition("./kind", "billing"), actions: [{ id: "a2", type: "require", config: { target: "contacts[].taxId" } }] },
];

export const NESTED_VALUE = {
  name: "Noor Roasters",
  email: "billing@noor.example",
  owner: "u1",
  tags: ["coffee", "wholesale"],
  channels: ["email"],
  address: { street: "12 Olaya Road", city: "Riyadh", postal: "12211", geo: { lat: 24.7136, lng: 46.6753 } },
  contacts: [
    { name: "Layla Haddad", kind: "billing", phone: "+966 11 555 0142", email: "layla@noor.example", taxId: "300123456700003", phones: ["+966 50 555 0111"] },
    { name: "Omar Nasser", kind: "technical", phone: "+966 11 555 0199", email: "omar@noor.example", phones: [] },
  ],
};

/** A "server" that refuses the phone 0199 and says which contact it came from. */
export async function saveNested(value: Record<string, unknown>, ar: boolean): Promise<SchemaFormSubmitResult | undefined> {
  await wait(500);
  const contacts = Array.isArray(value.contacts) ? (value.contacts as { phone?: string }[]) : [];
  const fieldErrors: Record<string, string> = {};
  contacts.forEach((c, i) => {
    if (typeof c.phone === "string" && c.phone.includes("0199")) fieldErrors[`contacts[${i}].phone`] = ar ? "هذا الرقم مسجل لعميل آخر." : "This number belongs to another customer.";
  });
  return Object.keys(fieldErrors).length ? { fieldErrors } : undefined;
}
