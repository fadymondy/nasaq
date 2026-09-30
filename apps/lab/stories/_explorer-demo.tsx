/* Shared fixtures and fake servers for the explorer stories: database, files, vault and desktop locations. */
import {
  DatabaseExplorer,
  type DatabaseSchema,
  DesktopLocations,
  type DesktopLocation,
  type DesktopLocationPermissions,
  FileExplorer,
  type FileNode,
  DesktopLocationPicker,
  type QueryOutcome,
  useNasaq,
  type UploadFile,
  Vault,
  type VaultAccessEvent,
  type VaultSecret,
  type VaultSecretInput,
} from "@nasaq/web";
import { useRef, useState } from "react";

export const useAr = () => useNasaq().locale.startsWith("ar");
export const wait = (ms = 600) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
/** A fixed "now" so expiry badges and dates look the same on every visit. */
export const DEMO_NOW = Math.floor(Date.now() / HOUR) * HOUR;
const ago = (ms: number) => DEMO_NOW - ms;

/* ---------------------------------------------------------------- database */

export const demoSchemas: DatabaseSchema[] = [
  {
    name: "public",
    tables: [
      {
        name: "customers",
        rowCount: 12480,
        columns: [
          { name: "id", type: "uuid", primaryKey: true },
          { name: "name", type: "varchar(120)" },
          { name: "email", type: "varchar(255)" },
          { name: "country", type: "char(2)", nullable: true },
          { name: "created_at", type: "timestamptz" },
        ],
      },
      {
        name: "orders",
        rowCount: 48210,
        columns: [
          { name: "id", type: "bigint", primaryKey: true },
          { name: "customer_id", type: "uuid", references: "customers.id" },
          { name: "total", type: "numeric(10,2)" },
          { name: "status", type: "varchar(20)" },
          { name: "meta", type: "jsonb", nullable: true },
          { name: "placed_at", type: "timestamptz" },
        ],
      },
      {
        name: "products",
        rowCount: 342,
        columns: [
          { name: "id", type: "integer", primaryKey: true },
          { name: "sku", type: "varchar(40)" },
          { name: "title", type: "varchar(200)" },
          { name: "price", type: "numeric(10,2)" },
          { name: "active", type: "boolean" },
        ],
      },
      {
        name: "active_customers",
        kind: "view",
        rowCount: 9120,
        columns: [
          { name: "id", type: "uuid" },
          { name: "name", type: "varchar(120)" },
          { name: "orders", type: "bigint" },
        ],
      },
    ],
  },
  {
    name: "audit",
    tables: [
      {
        name: "events",
        rowCount: 903114,
        columns: [
          { name: "id", type: "bigint", primaryKey: true },
          { name: "actor", type: "varchar(80)" },
          { name: "action", type: "varchar(40)" },
          { name: "at", type: "timestamptz" },
        ],
      },
    ],
  },
];

const NAMES = ["Layla Haddad", "Omar Farouk", "Sara Nasser", "Youssef Ali", "Mona Saleh", "Khaled Mansour", "Huda Barakat", "Tariq Aziz"];
const COUNTRIES = ["SA", "AE", "EG", "JO", "KW", null, "QA", "OM"];
const STATUS = ["paid", "shipped", "pending", "refunded"];

function rowsFor(table: string, limit: number): { columns: string[]; rows: unknown[][] } {
  const n = Math.min(limit, 24);
  const at = (i: number) => new Date(ago(i * 7 * HOUR + 3 * DAY));
  const uuid = (i: number) => `8f14e45f-ceea-467a-9c${String(i).padStart(2, "0")}-4e0a5b1d${String(i * 977).padStart(4, "0")}`;
  switch (table) {
    case "customers":
      return { columns: ["id", "name", "email", "country", "created_at"], rows: Array.from({ length: n }, (_, i) => [uuid(i), NAMES[i % NAMES.length], `user${i + 1}@example.com`, COUNTRIES[i % COUNTRIES.length], at(i)]) };
    case "orders":
      return { columns: ["id", "customer_id", "total", "status", "meta", "placed_at"], rows: Array.from({ length: n }, (_, i) => [48210 - i, uuid(i % 7), 19.5 + i * 13.25, STATUS[i % STATUS.length], i % 3 === 0 ? { gift: true, coupon: "EID25" } : null, at(i)]) };
    case "products":
      return { columns: ["id", "sku", "title", "price", "active"], rows: Array.from({ length: n }, (_, i) => [i + 1, `SKU-${1000 + i}`, ["Cotton abaya", "Leather wallet", "Oud perfume", "Prayer mat", "Date box"][i % 5], 24 + i * 3.5, i % 6 !== 0]) };
    case "active_customers":
      return { columns: ["id", "name", "orders"], rows: Array.from({ length: n }, (_, i) => [uuid(i), NAMES[i % NAMES.length], 30 - i]) };
    default:
      return { columns: ["id", "actor", "action", "at"], rows: Array.from({ length: n }, (_, i) => [903114 - i, ["admin", "system", "sara"][i % 3], ["login", "export", "delete", "update"][i % 4], at(i)]) };
  }
}

/** A tiny fake SQL server: understands `SELECT ... FROM [schema.]table [LIMIT n]`, a COUNT, and reports anything else as a write. */
export async function fakeQuery(sql: string): Promise<QueryOutcome> {
  await wait(450);
  const text = sql.trim().replace(/;+\s*$/, "");
  if (!text) return { error: "Empty statement." };
  if (/^(insert|update|delete)\b/i.test(text)) return { columns: [], rows: [], affectedRows: 3, durationMs: 12 };
  if (/^(drop|truncate|alter|create)\b/i.test(text)) return { error: 'permission denied: this demo user is not allowed to run "' + text.split(/\s+/)[0]?.toUpperCase() + '"' };
  if (!/^(select|with|explain|show|values)\b/i.test(text)) return { error: `syntax error at or near "${text.split(/\s+/)[0]}"` };
  if (/count\s*\(/i.test(text)) return { columns: ["count"], rows: [[12480]], durationMs: 9 };
  const from = text.match(/\bfrom\s+(?:"?(\w+)"?\.)?"?(\w+)"?/i);
  if (!from) return { columns: ["result"], rows: [[1]], durationMs: 1 };
  const table = from[2] ?? "";
  const known = demoSchemas.some((s) => s.tables.some((t) => t.name === table));
  if (!known) return { error: `relation "${table}" does not exist` };
  const limit = Number(text.match(/\blimit\s+(\d+)/i)?.[1] ?? 100);
  const { columns, rows } = rowsFor(table, limit);
  return { columns, rows, durationMs: 14 + rows.length, truncated: limit > 24 };
}

export function DatabaseDemo(_props: { ar?: boolean } = {}) {
  const ar = useAr();
  return (
    <DatabaseExplorer
      schemas={demoSchemas}
      onRunQuery={fakeQuery}
      defaultQuery={'SELECT id, name, country FROM "public"."customers" LIMIT 10;'}
      defaultTable={{ schema: "public", table: ar ? "orders" : "customers" }}
    />
  );
}

/* ------------------------------------------------------------------- files */

const SNIPPET = `import { Button } from "@nasaq/web";

export function Save() {
  return <Button variant="primary">Save</Button>;
}
`;

const SVG_THUMB = (hue: number) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240"><rect width="320" height="240" fill="hsl(${hue} 55% 78%)"/><circle cx="220" cy="90" r="34" fill="hsl(${hue} 60% 92%)"/><path d="M0 240 L110 120 L190 200 L240 150 L320 240Z" fill="hsl(${hue} 45% 45%)"/></svg>`,
  )}`;

export function sampleFiles(ar: boolean): FileNode[] {
  const d = (i: number) => new Date(ago(i * DAY));
  return [
    {
      id: "designs",
      name: ar ? "التصاميم" : "Designs",
      kind: "folder",
      children: [
        { id: "hero", name: ar ? "صورة-الغلاف.png" : "hero.png", kind: "file", size: 842_000, mime: "image/png", modifiedAt: d(2), previewUrl: SVG_THUMB(210) },
        { id: "logo", name: "logo.svg", kind: "file", size: 3_400, mime: "image/svg+xml", modifiedAt: d(9), previewUrl: SVG_THUMB(28) },
        { id: "mock", name: ar ? "نموذج-الصفحة.png" : "landing-mockup.png", kind: "file", size: 2_310_000, mime: "image/png", modifiedAt: d(5), previewUrl: SVG_THUMB(150) },
        { id: "raw", name: "raw", kind: "folder", modifiedAt: d(14), children: [{ id: "raw1", name: "shoot-01.zip", kind: "file", size: 48_200_000, modifiedAt: d(14) }] },
      ],
    },
    {
      id: "docs",
      name: ar ? "المستندات" : "Documents",
      kind: "folder",
      children: [
        { id: "brief", name: ar ? "ملخص-المشروع.pdf" : "project-brief.pdf", kind: "file", size: 1_250_000, mime: "application/pdf", modifiedAt: d(3) },
        { id: "budget", name: ar ? "الميزانية.xlsx" : "budget-2026.xlsx", kind: "file", size: 96_000, modifiedAt: d(6) },
        { id: "notes", name: "notes.md", kind: "file", size: 1_820, modifiedAt: d(1), previewText: "# Kickoff notes\n\n- Ship the explorer components\n- Review the RTL pass\n- Decide on the vault audit format\n" },
        { id: "contracts", name: ar ? "العقود" : "Contracts", kind: "folder", children: [] },
      ],
    },
    {
      id: "code",
      name: "src",
      kind: "folder",
      children: [
        { id: "save", name: "save-button.tsx", kind: "file", size: 214, modifiedAt: d(4), previewText: SNIPPET },
        { id: "cfg", name: "config.json", kind: "file", size: 96, modifiedAt: d(11), previewText: '{\n  "locale": "ar",\n  "theme": "auto"\n}\n' },
      ],
    },
    { id: "readme", name: "README.md", kind: "file", size: 5_600, modifiedAt: d(20), previewText: "# Storefront\n\nThe demo storefront files.\n" },
    { id: "intro", name: ar ? "فيديو-تعريفي.mp4" : "intro.mp4", kind: "file", size: 74_000_000, mime: "video/mp4", modifiedAt: d(30) },
  ];
}

function addChild(nodes: FileNode[], parentId: string | null, child: FileNode): FileNode[] {
  if (parentId === null) return [...nodes, child];
  return nodes.map((n) => (n.id === parentId ? { ...n, children: [...(n.children ?? []), child] } : n.children ? { ...n, children: addChild(n.children, parentId, child) } : n));
}
function removeNode(nodes: FileNode[], id: string): FileNode[] {
  return nodes.filter((n) => n.id !== id).map((n) => (n.children ? { ...n, children: removeNode(n.children, id) } : n));
}

export function FileExplorerDemo({ loading = false, empty = false, defaultView = "list", readOnly = false }: { loading?: boolean; empty?: boolean; defaultView?: "list" | "grid"; readOnly?: boolean }) {
  const ar = useAr();
  const [nodes, setNodes] = useState<FileNode[]>(() => (empty ? [] : sampleFiles(ar)));
  const [uploads, setUploads] = useState<UploadFile[]>([]);
  const seq = useRef(0);

  const patch = (id: string, change: Partial<UploadFile>) => setUploads((list) => list.map((u) => (u.id === id ? { ...u, ...change } : u)));

  const send = async (files: File[], folderId: string | null) => {
    const items: UploadFile[] = files.map((file) => ({ id: `u${++seq.current}`, file, status: "uploading", progress: 0 }));
    setUploads((list) => [...items, ...list]);
    for (const item of items) {
      for (const p of [25, 60, 90]) {
        await wait(250);
        patch(item.id, { progress: p });
      }
      patch(item.id, { status: "done", progress: 100 });
      setNodes((cur) => addChild(cur, folderId, { id: `new-${item.id}`, name: item.file.name, kind: "file", size: item.file.size, mime: item.file.type, modifiedAt: new Date(DEMO_NOW) }));
    }
    await wait(1500);
    setUploads((list) => list.filter((u) => !items.some((i) => i.id === u.id)));
  };

  return (
    <FileExplorer
      nodes={nodes}
      loading={loading}
      defaultView={defaultView}
      uploads={uploads}
      onRemoveUpload={(u) => setUploads((list) => list.filter((x) => x.id !== u.id))}
      onDownload={() => {}}
      {...(readOnly
        ? {}
        : {
            onUpload: send,
            onCreateFolder: async (name: string, parent: string | null) => {
              await wait(500);
              setNodes((cur) => addChild(cur, parent, { id: `f-${++seq.current}`, name, kind: "folder", children: [], modifiedAt: new Date(DEMO_NOW) }));
            },
            onDelete: async (node: FileNode) => {
              await wait(500);
              setNodes((cur) => removeNode(cur, node.id));
            },
          })}
    />
  );
}

/* ------------------------------------------------------------------- vault */

export function sampleSecrets(ar: boolean): VaultSecret[] {
  return [
    { id: "s1", name: "STRIPE_SECRET_KEY", group: "Stripe", kind: "api-key", description: ar ? "مفتاح الدفع الحي" : "Live payments key", hint: "…9f2a", updatedAt: ago(12 * DAY), expiresAt: DEMO_NOW + 240 * DAY, lastAccessedAt: ago(2 * HOUR) },
    { id: "s2", name: "STRIPE_WEBHOOK_SECRET", group: "Stripe", kind: "token", hint: "…c41d", updatedAt: ago(40 * DAY), lastAccessedAt: ago(3 * DAY) },
    { id: "s3", name: "DATABASE_URL", group: ar ? "قاعدة البيانات" : "Database", kind: "password", description: ar ? "المستخدم الرئيسي" : "Primary connection string", hint: "…/prod", updatedAt: ago(90 * DAY), expiresAt: DEMO_NOW + 9 * DAY },
    { id: "s4", name: "DEPLOY_SSH_KEY", group: ar ? "قاعدة البيانات" : "Database", kind: "ssh-key", hint: "ed25519", updatedAt: ago(200 * DAY), expiresAt: DEMO_NOW - 4 * DAY },
    { id: "s5", name: "TLS_CERT_STOREFRONT", group: ar ? "الشهادات" : "Certificates", kind: "certificate", hint: "*.nasaq-demo.com", updatedAt: ago(70 * DAY), expiresAt: DEMO_NOW + 21 * DAY },
    { id: "s6", name: "SENDGRID_API_KEY", group: "", kind: "api-key", hint: "…77be", updatedAt: ago(5 * DAY) },
  ];
}

export function sampleAccessLog(ar: boolean): VaultAccessEvent[] {
  const who = ar ? ["سارة", "عمر", "النظام"] : ["Sara", "Omar", "System"];
  const rows: [string, string, VaultAccessEvent["action"], number, string][] = [
    ["a1", "STRIPE_SECRET_KEY", "reveal", 2 * HOUR, "203.0.113.24"],
    ["a2", "DATABASE_URL", "copy", 5 * HOUR, "203.0.113.24"],
    ["a3", "STRIPE_SECRET_KEY", "update", 12 * DAY, "198.51.100.7"],
    ["a4", "SENDGRID_API_KEY", "create", 5 * DAY, "198.51.100.7"],
    ["a5", "DEPLOY_SSH_KEY", "reveal", 30 * DAY, "10.0.0.12"],
    ["a6", "OLD_TOKEN", "delete", 45 * DAY, "10.0.0.12"],
  ];
  return rows.map(([id, secretName, action, back, address], i) => ({ id, secretName, action, at: ago(back), address, actor: who[i % 3] as string }));
}

export function VaultDemo({ loading = false, readOnly = false }: { loading?: boolean; readOnly?: boolean }) {
  const ar = useAr();
  const [secrets, setSecrets] = useState<VaultSecret[]>(() => sampleSecrets(ar));
  const [log, setLog] = useState<VaultAccessEvent[]>(() => sampleAccessLog(ar));
  const seq = useRef(0);

  const record = (secretName: string, action: VaultAccessEvent["action"]) =>
    setLog((l) => [{ id: `n${++seq.current}`, secretName, action, at: Date.now(), actor: ar ? "أنت" : "You", address: "203.0.113.24" }, ...l]);

  return (
    <Vault
      secrets={secrets}
      accessLog={log}
      loading={loading}
      now={DEMO_NOW}
      onReveal={async (id, purpose) => {
        await wait(400);
        const s = secrets.find((x) => x.id === id);
        if (!s) return { error: ar ? "لم يعد السر موجودًا." : "That secret no longer exists." };
        record(s.name, purpose);
        // Not a real credential: a made-up string shaped like one.
        return { value: `demo_${s.id}_${"x7Kq2mZp9Lw4".repeat(3)}` };
      }}
      {...(readOnly
        ? {}
        : {
            onSave: async (input: VaultSecretInput, id?: string) => {
              await wait(500);
              if (secrets.some((s) => s.id !== id && s.name.toLowerCase() === input.name.toLowerCase())) return { error: ar ? "يوجد سر بهذا الاسم." : "A secret with this name already exists." };
              if (id) {
                setSecrets((list) => list.map((s) => (s.id === id ? { ...s, name: input.name, group: input.group, kind: input.kind, ...(input.description ? { description: input.description } : {}), ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}), updatedAt: Date.now() } : s)));
                record(input.name, "update");
              } else {
                setSecrets((list) => [...list, { id: `s${Date.now()}`, name: input.name, group: input.group, kind: input.kind, updatedAt: Date.now(), ...(input.description ? { description: input.description } : {}), ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}), hint: `…${input.value.slice(-4)}` }]);
                record(input.name, "create");
              }
            },
            onDelete: async (id: string) => {
              await wait(500);
              const s = secrets.find((x) => x.id === id);
              setSecrets((list) => list.filter((x) => x.id !== id));
              if (s) record(s.name, "delete");
            },
          })}
    />
  );
}

/* ------------------------------------------------------------------ locations */

export function sampleLocations(ar: boolean): DesktopLocation[] {
  return [
    { id: "l1", path: "C:\\Sites\\nasaq", label: ar ? "نسق" : "Nasaq", status: "ready", primary: true, permissions: { read: true, write: true, index: true }, fileCount: 4820, indexedAt: ago(35 * MIN), addedAt: ago(60 * DAY) },
    { id: "l2", path: "D:\\Clients\\Hosbah\\storefront", status: "indexing", permissions: { read: true, write: true, index: true }, fileCount: 1290, addedAt: ago(9 * DAY) },
    { id: "l3", path: "C:\\Users\\Fady\\Documents\\Contracts", label: ar ? "العقود" : "Contracts", status: "ready", permissions: { read: true, write: false, index: false }, fileCount: 86, indexedAt: ago(3 * DAY), addedAt: ago(30 * DAY) },
    { id: "l4", path: "E:\\Archive\\2024", status: "missing", permissions: { read: true, write: false, index: true }, addedAt: ago(200 * DAY) },
    { id: "l5", path: "\\\\nas\\shared\\design", status: "denied", permissions: { read: true, write: false, index: false }, addedAt: ago(15 * DAY) },
  ];
}

export function LocationsDemo({ loading = false, empty = false }: { loading?: boolean; empty?: boolean }) {
  const ar = useAr();
  const [locations, setLocations] = useState<DesktopLocation[]>(() => (empty ? [] : sampleLocations(ar)));
  const seq = useRef(0);
  const picks = ["C:\\Users\\Fady\\Projects\\orchestra", "D:\\Work\\notes"];

  return (
    <DesktopLocations
      locations={locations}
      loading={loading}
      onBrowse={async () => {
        await wait(400);
        return picks[seq.current++ % picks.length] ?? null;
      }}
      onAdd={async (path: string, permissions: DesktopLocationPermissions) => {
        await wait(500);
        setLocations((list) => [...list, { id: `l${Date.now()}`, path, status: permissions.index ? "indexing" : "ready", permissions, primary: list.length === 0, addedAt: Date.now() }]);
      }}
      onRemove={async (id: string) => {
        await wait(400);
        setLocations((list) => {
          const rest = list.filter((l) => l.id !== id);
          const removedPrimary = list.find((l) => l.id === id)?.primary;
          return removedPrimary && rest[0] ? rest.map((l, i) => (i === 0 ? { ...l, primary: true } : l)) : rest;
        });
      }}
      onPermissionsChange={async (id: string, permissions: DesktopLocationPermissions) => {
        await wait(300);
        setLocations((list) => list.map((l) => (l.id === id ? { ...l, permissions } : l)));
      }}
      onMakeDefault={async (id: string) => {
        await wait(300);
        setLocations((list) => list.map((l) => ({ ...l, primary: l.id === id })));
      }}
      onReindex={async (id: string) => {
        await wait(900);
        setLocations((list) => list.map((l) => (l.id === id ? { ...l, indexedAt: Date.now() } : l)));
      }}
    />
  );
}

export function LocationPickerDemo() {
  const ar = useAr();
  const [id, setId] = useState<string | null>("l1");
  return (
    <div className="flex max-w-sm flex-col gap-2">
      <span className="text-label text-foreground">{ar ? "احفظ في" : "Save to"}</span>
      <DesktopLocationPicker locations={sampleLocations(ar)} requires="write" value={id} onValueChange={(next) => setId(next)} aria-label={ar ? "احفظ في" : "Save to"} />
    </div>
  );
}
