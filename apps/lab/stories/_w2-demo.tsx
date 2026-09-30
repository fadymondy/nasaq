/*
 * Shared demo data for batch W2: the map, the record detail (infolist, schema form, relation picker), the trash bin
 * and the shortcuts pages. Deterministic, no network. All names, places and records are invented.
 */
import {
  type HotkeyBindingItem,
  type InfolistItem,
  type InfolistSection,
  type MapLayer,
  type MapPin,
  type MapRoute,
  type RelationOption,
  type SchemaFormJson,
  type ShortcutGroup,
  type TrashItem,
  type TrashType,
  useNasaq,
} from "@nasaq/web";
import { Bike, FileText, Folder, Image as ImageIcon, Truck, Users } from "lucide-react";
import type { ReactNode } from "react";

export const useAr = () => useNasaq().locale.startsWith("ar");
export const t = (ar: boolean, en: string, arText: string) => (ar ? arText : en);
export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function W2Page({ title, description, children, actions, wide }: { title: string; description: string; children: ReactNode; actions?: ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen bg-background">
      <div className={`mx-auto flex w-full flex-col gap-6 p-4 sm:p-8 ${wide ? "max-w-7xl" : "max-w-5xl"}`}>
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-title-lg text-foreground">{title}</h1>
            <p className="text-body text-muted-foreground">{description}</p>
          </div>
          {actions}
        </header>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------ map */

export const FLEET_LAYERS: MapLayer[] = [
  { id: "vans", label: "Vans", labelAr: "الشاحنات", tone: "info", icon: Truck },
  { id: "bikes", label: "Couriers", labelAr: "المندوبون", tone: "success", icon: Bike },
  { id: "hubs", label: "Hubs", labelAr: "المراكز", tone: "warning" },
];

export const FLEET_PINS: MapPin[] = [
  { id: "v12", lat: 24.7136, lng: 46.6753, label: "Van 12", labelAr: "شاحنة 12", layer: "vans", tone: "info", icon: Truck, status: "Moving", statusAr: "تتحرك", detail: "Olaya St, Riyadh", detailAr: "شارع العليا، الرياض", meta: [{ label: "Speed", labelAr: "السرعة", value: "54 km/h" }, { label: "Stops left", labelAr: "التوقفات المتبقية", value: "6" }] },
  { id: "v07", lat: 24.7742, lng: 46.7386, label: "Van 07", labelAr: "شاحنة 07", layer: "vans", tone: "danger", icon: Truck, status: "Delayed", statusAr: "متأخرة", detail: "King Fahd Rd", detailAr: "طريق الملك فهد", meta: [{ label: "Speed", labelAr: "السرعة", value: "0 km/h" }, { label: "Stops left", labelAr: "التوقفات المتبقية", value: "3" }] },
  { id: "b21", lat: 24.6877, lng: 46.7219, label: "Courier Huda", labelAr: "المندوبة هدى", layer: "bikes", tone: "success", icon: Bike, status: "Delivering", statusAr: "توصيل", detail: "Al Malaz", detailAr: "الملز" },
  { id: "b34", lat: 24.7521, lng: 46.6249, label: "Courier Sami", labelAr: "المندوب سامي", layer: "bikes", tone: "success", icon: Bike, status: "Idle", statusAr: "متوقف", detail: "Al Sulimaniyah", detailAr: "السليمانية" },
  { id: "h1", lat: 24.7255, lng: 46.7009, label: "Central hub", labelAr: "المركز الرئيسي", layer: "hubs", tone: "warning", detail: "Loading bay B", detailAr: "رصيف التحميل ب" },
];

export const FLEET_ROUTES: MapRoute[] = [
  { id: "r12", layer: "vans", label: "Route 12", labelAr: "المسار 12", tone: "info", points: [{ lat: 24.7255, lng: 46.7009 }, { lat: 24.7136, lng: 46.6753 }, { lat: 24.7301, lng: 46.6512 }, { lat: 24.7521, lng: 46.6249 }] },
  { id: "r07", layer: "vans", label: "Route 07", labelAr: "المسار 07", tone: "danger", dashed: true, points: [{ lat: 24.7255, lng: 46.7009 }, { lat: 24.7501, lng: 46.7212 }, { lat: 24.7742, lng: 46.7386 }] },
];

/* ---------------------------------------------------------------------------------------- record detail */

export const CUSTOMER_SCHEMA: SchemaFormJson = {
  type: "object",
  required: ["name", "email", "tier"],
  properties: {
    name: { type: "string", title: "Company name", "x-title-ar": "اسم الشركة", minLength: 2, maxLength: 80 },
    email: { type: "string", format: "email", title: "Billing email", "x-title-ar": "بريد الفواتير" },
    phone: { type: "string", format: "tel", title: "Phone", "x-title-ar": "الهاتف", "x-width": "half" },
    tier: { type: "string", title: "Plan", "x-title-ar": "الخطة", "x-width": "half", oneOf: [{ const: "free", title: "Free", "x-title-ar": "مجانية" }, { const: "team", title: "Team", "x-title-ar": "فريق" }, { const: "business", title: "Business", "x-title-ar": "أعمال" }] },
    owner: { type: "string", title: "Account owner", "x-title-ar": "مدير الحساب", "x-relation": { resource: "people" }, "x-width": "half" },
    watchers: { type: "array", title: "Watchers", "x-title-ar": "المتابعون", "x-relation": { resource: "people", multiple: true } },
    seats: { type: "integer", title: "Seats", "x-title-ar": "المقاعد", minimum: 1, maximum: 500, "x-width": "half" },
    credit: { type: "number", title: "Credit limit", "x-title-ar": "حد الائتمان", minimum: 0, "x-unit": "SAR", "x-width": "half" },
    renewal: { type: "string", format: "date", title: "Renews on", "x-title-ar": "يجدد في", "x-width": "half" },
    vip: { type: "boolean", title: "VIP support", "x-title-ar": "دعم مميز", description: "Priority replies within one hour.", "x-description-ar": "ردود ذات أولوية خلال ساعة." },
    vipNote: { type: "string", title: "VIP contact note", "x-title-ar": "ملاحظة جهة الاتصال المميزة", "x-widget": "textarea" },
    address: {
      type: "object",
      title: "Address",
      "x-title-ar": "العنوان",
      required: ["city"],
      properties: { city: { type: "string", title: "City", "x-title-ar": "المدينة", "x-width": "half" }, street: { type: "string", title: "Street", "x-title-ar": "الشارع", "x-width": "half" } },
    },
    contacts: {
      type: "array",
      title: "Contacts",
      "x-title-ar": "جهات الاتصال",
      minItems: 1,
      "x-title-key": "name",
      items: { type: "object", properties: { name: { type: "string", title: "Name", "x-title-ar": "الاسم" }, role: { type: "string", title: "Role", "x-title-ar": "الدور", "x-width": "half" }, email: { type: "string", format: "email", title: "Email", "x-title-ar": "البريد", "x-width": "half" } } },
    },
  },
};

const PEOPLE: RelationOption[] = [
  { value: "u1", label: "Layla Haddad", labelAr: "ليلى حداد", description: "layla@example.test" },
  { value: "u2", label: "Omar Nasser", labelAr: "عمر ناصر", description: "omar@example.test" },
  { value: "u3", label: "Sara Khalil", labelAr: "سارة خليل", description: "sara@example.test" },
  { value: "u4", label: "Yousef Amin", labelAr: "يوسف أمين", description: "yousef@example.test" },
  { value: "u5", label: "Maha Fahad", labelAr: "مها فهد", description: "maha@example.test" },
  { value: "u6", label: "Khaled Reda", labelAr: "خالد رضا", description: "khaled@example.test" },
];
export const PEOPLE_OPTIONS = PEOPLE;

/** A search that answers after a short wait, like an API would. Filters the invented people. */
export async function searchPeople(query: string, signal: AbortSignal): Promise<RelationOption[]> {
  await wait(350);
  if (signal.aborted) return [];
  const q = query.trim().toLowerCase();
  return PEOPLE.filter((p) => !q || `${p.label} ${p.labelAr} ${p.description}`.toLowerCase().includes(q));
}

export async function resolvePeople(ids: readonly string[]): Promise<RelationOption[]> {
  await wait(150);
  return PEOPLE.filter((p) => ids.includes(p.value));
}

export async function createPerson(name: string): Promise<RelationOption> {
  await wait(400);
  const made = { value: `u-${name.toLowerCase().replace(/\s+/g, "-")}`, label: name };
  PEOPLE.push(made);
  return made;
}

export const PLAN_OPTIONS = {
  free: { label: "Free", labelAr: "مجانية", variant: "neutral" },
  team: { label: "Team", labelAr: "فريق", variant: "info" },
  business: { label: "Business", labelAr: "أعمال", variant: "brand" },
} as const;

export const STATUS_OPTIONS = {
  active: { label: "Active", labelAr: "نشط", variant: "success" },
  past_due: { label: "Past due", labelAr: "متأخر السداد", variant: "danger" },
  paused: { label: "Paused", labelAr: "متوقف", variant: "warning" },
} as const;

export function customerSections(): InfolistSection[] {
  const items = (list: InfolistItem[]) => list;
  return [
    {
      id: "account",
      title: "Account",
      titleAr: "الحساب",
      items: items([
        { id: "name", label: "Company", labelAr: "الشركة", value: "Noor Roasters" },
        { id: "status", label: "Status", labelAr: "الحالة", type: "enum", value: "past_due", options: STATUS_OPTIONS },
        { id: "tier", label: "Plan", labelAr: "الخطة", type: "enum", value: "business", options: PLAN_OPTIONS },
        { id: "vip", label: "VIP support", labelAr: "دعم مميز", type: "boolean", value: true },
        { id: "seats", label: "Seats", labelAr: "المقاعد", type: "number", value: 42 },
        { id: "credit", label: "Credit limit", labelAr: "حد الائتمان", type: "number", value: 25000, unit: "SAR" },
        { id: "id", label: "Customer id", labelAr: "معرّف العميل", type: "code", value: "cus_8f31a2c9", copyable: true },
        { id: "renewal", label: "Renews on", labelAr: "يجدد في", type: "date", value: "2026-11-01" },
      ]),
    },
    {
      id: "contact",
      title: "Contact",
      titleAr: "التواصل",
      items: items([
        { id: "email", label: "Billing email", labelAr: "بريد الفواتير", type: "email", value: "billing@noor.example", copyable: true },
        { id: "phone", label: "Phone", labelAr: "الهاتف", type: "tel", value: "+966 11 555 0142" },
        { id: "site", label: "Website", labelAr: "الموقع", type: "url", value: "https://noor.example" },
        { id: "fax", label: "Fax", labelAr: "الفاكس", value: "" },
        { id: "tags", label: "Tags", labelAr: "الوسوم", type: "list", value: ["wholesale", "riyadh", "coffee"] },
        { id: "notes", label: "Notes", labelAr: "ملاحظات", value: "Pays by bank transfer on the 5th. Ask for Layla in accounts.", wide: true },
      ]),
    },
  ];
}

/* ------------------------------------------------------------------------------------------------ trash */

export const TRASH_TYPES: TrashType[] = [
  { id: "doc", label: "Document", labelAr: "مستند", icon: FileText },
  { id: "image", label: "Image", labelAr: "صورة", icon: ImageIcon },
  { id: "folder", label: "Folder", labelAr: "مجلد", icon: Folder },
  { id: "contact", label: "Contact", labelAr: "جهة اتصال", icon: Users },
];

/** A fixed clock so the countdowns in screenshots do not drift. */
export const TRASH_NOW = Date.UTC(2026, 8, 30, 9, 0, 0);
const DAY = 86_400_000;
const ago = (days: number) => new Date(TRASH_NOW - days * DAY).toISOString();

export function trashItems(): TrashItem[] {
  return [
    { id: "t1", name: "Q3 pricing draft.docx", type: "doc", detail: "Finance / Pricing", deletedAt: ago(28), deletedBy: "Layla Haddad" },
    { id: "t2", name: "منتجات الخريف.xlsx", type: "doc", detail: "المبيعات", deletedAt: ago(26), deletedBy: "Omar Nasser" },
    { id: "t3", name: "banner-final-v2.png", type: "image", detail: "Marketing / Assets", deletedAt: ago(20), deletedBy: "Sara Khalil" },
    { id: "t4", name: "Old onboarding", type: "folder", detail: "12 files", deletedAt: ago(14), deletedBy: "Layla Haddad" },
    { id: "t5", name: "Yousef Amin", type: "contact", detail: "yousef@example.test", deletedAt: ago(9), deletedBy: "Maha Fahad" },
    { id: "t6", name: "contract-draft.pdf", type: "doc", detail: "Legal", deletedAt: ago(5), deletedBy: "Omar Nasser" },
    { id: "t7", name: "team-photo.jpg", type: "image", detail: "HR", deletedAt: ago(2), deletedBy: "Sara Khalil" },
    { id: "t8", name: "شعار قديم", type: "image", detail: "التسويق", deletedAt: ago(1), deletedBy: "مها فهد" },
  ];
}

/* -------------------------------------------------------------------------------------------- shortcuts */

export function shortcutGroups(ar: boolean): ShortcutGroup[] {
  return [
    {
      id: "general",
      title: "General",
      titleAr: "عام",
      items: [
        { id: "palette", label: "Open command palette", labelAr: "فتح لوحة الأوامر", keys: ["Mod+K", "/"] },
        { id: "help", label: "Show shortcuts", labelAr: "عرض الاختصارات", keys: "?" },
        { id: "save", label: "Save", labelAr: "حفظ", keys: "Mod+S" },
        { id: "undo", label: "Undo", labelAr: "تراجع", keys: "Mod+Z", description: ar ? "يتراجع عن آخر تغيير." : "Reverts the last change." },
      ],
    },
    {
      id: "navigate",
      title: "Go to",
      titleAr: "الانتقال إلى",
      items: [
        { id: "inbox", label: "Go to inbox", labelAr: "الذهاب إلى الوارد", keys: "G I" },
        { id: "projects", label: "Go to projects", labelAr: "الذهاب إلى المشاريع", keys: "G P" },
        { id: "settings", label: "Open settings", labelAr: "فتح الإعدادات", keys: "Mod+,", apple: "Mod+," },
      ],
    },
    {
      id: "editing",
      title: "Editing",
      titleAr: "التحرير",
      items: [
        { id: "new", label: "New item", labelAr: "عنصر جديد", keys: "C" },
        { id: "bold", label: "Bold", labelAr: "غامق", keys: "Mod+B" },
        { id: "redo", label: "Redo", labelAr: "إعادة", keys: "Mod+Shift+Z", apple: "Mod+Shift+Z" },
      ],
    },
  ];
}

export function hotkeyBindings(): HotkeyBindingItem[] {
  return [
    { id: "palette", label: "Open command palette", labelAr: "فتح لوحة الأوامر", group: "General", groupAr: "عام", shortcut: "Mod+K", defaultShortcut: "Mod+K" },
    { id: "save", label: "Save", labelAr: "حفظ", group: "General", groupAr: "عام", shortcut: "Mod+S", defaultShortcut: "Mod+S" },
    { id: "search", label: "Search", labelAr: "بحث", group: "General", groupAr: "عام", shortcut: "Mod+Shift+F", defaultShortcut: "Mod+Shift+F" },
    { id: "new", label: "New item", labelAr: "عنصر جديد", group: "Editing", groupAr: "التحرير", shortcut: "Mod+Shift+N", defaultShortcut: "Mod+Shift+N" },
    { id: "bold", label: "Bold", labelAr: "غامق", group: "Editing", groupAr: "التحرير", shortcut: null, defaultShortcut: "Mod+B" },
    { id: "close", label: "Close dialog", labelAr: "إغلاق النافذة", group: "General", groupAr: "عام", shortcut: "Escape", locked: true },
  ];
}
