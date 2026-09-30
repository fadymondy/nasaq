/* Fake CRM and project data (English and Arabic) plus the three full-page demos: contacts, companies, projects. Nothing here talks to a server. */
import {
  Button,
  type Company,
  CompanyList,
  type Contact,
  ContactList,
  type EntityListContext,
  type ExportColumn,
  ExportButton,
  type Project,
  ProjectList,
  type EntityTag,
} from "@nasaq/web";
import { Plus, Trash2 } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { useAr, wait } from "./_profile-demo";

const DAY = 86_400_000;
const HOUR = 3_600_000;
const ago = (ms: number) => new Date(Date.now() - ms);

/* ------------------------------------------------------------------ people */

const OWNERS = {
  en: ["Layla Haddad", "Omar Nasser", "Nora Al-Saud", "Yusuf Karim"],
  ar: ["ليلى حداد", "عمر ناصر", "نورة السعود", "يوسف كريم"],
};

const CONTACT_NAMES = {
  en: ["Sara Ali", "Khalid Mansour", "Mona Farouk", "Tariq Aziz", "Huda Saleh", "Ziad Rahman", "Dina Habib", "Faisal Otaibi", "Rania Khoury", "Hassan Darwish", "Salma Nabil", "Adel Qasem", "Lina Barakat", "Majed Younis", "Amal Sharif", "Bilal Haddad", "Noor Ibrahim", "Samir Fahmy", "Reem Zaki", "Walid Mostafa"],
  ar: ["سارة علي", "خالد منصور", "منى فاروق", "طارق عزيز", "هدى صالح", "زياد رحمن", "دينا حبيب", "فيصل العتيبي", "رانيا خوري", "حسن درويش", "سلمى نبيل", "عادل قاسم", "لينا بركات", "ماجد يونس", "أمل شريف", "بلال حداد", "نور إبراهيم", "سمير فهمي", "ريم زكي", "وليد مصطفى"],
};

const COMPANY_NAMES = {
  en: ["Northwind Traders", "Bluebird Logistics", "Cedar Health", "Dunes Capital", "Falcon Foods", "Harbor Studio", "Oasis Energy", "Pearl Retail", "Summit Education", "Tamimi Contracting", "Zenith Media", "Al Noor Pharma"],
  ar: ["نورث ويند للتجارة", "بلوبيرد للخدمات اللوجستية", "سيدر للرعاية الصحية", "دونز كابيتال", "فالكون للأغذية", "هاربر ستوديو", "واحة للطاقة", "لؤلؤة للتجزئة", "قمة للتعليم", "التميمي للمقاولات", "زينيث للإعلام", "النور للأدوية"],
};
const DOMAINS = ["northwind.example", "bluebird.example", "cedarhealth.example", "dunescapital.example", "falconfoods.example", "harborstudio.example", "oasisenergy.example", "pearlretail.example", "summit.example", "tamimi.example", "zenithmedia.example", "alnoor.example"];

const TAGS = {
  en: [
    { label: "VIP", hue: "violet" }, { label: "Partner", hue: "teal" }, { label: "Renewal", hue: "amber" }, { label: "Newsletter", hue: "blue" }, { label: "Enterprise", hue: "pink" }, { label: "Referral", hue: "green" },
  ],
  ar: [
    { label: "مهم", hue: "violet" }, { label: "شريك", hue: "teal" }, { label: "تجديد", hue: "amber" }, { label: "نشرة", hue: "blue" }, { label: "مؤسسات", hue: "pink" }, { label: "إحالة", hue: "green" },
  ],
} satisfies Record<"en" | "ar", EntityTag[]>;

const pick = <T,>(list: T[], i: number, step = 1): T => list[(i * step) % list.length] as T;
const someTags = (lang: "en" | "ar", i: number): EntityTag[] => {
  const list = TAGS[lang];
  return Array.from({ length: i % 4 }, (_, k) => list[(i + k * 2) % list.length] as EntityTag);
};

/* ------------------------------------------------------------------ data */

export function makeContacts(lang: "en" | "ar"): Contact[] {
  const stages = ["lead", "prospect", "customer", "customer", "churned"] as const;
  const jobs = lang === "ar" ? ["مدير مشتريات", "مؤسس", "مديرة تسويق", "مهندس", "محاسبة"] : ["Procurement lead", "Founder", "Marketing manager", "Engineer", "Accountant"];
  return CONTACT_NAMES[lang].map((name, i) => ({
    id: `c${i + 1}`,
    name,
    email: `${["sara", "khalid", "mona", "tariq", "huda", "ziad", "dina", "faisal", "rania", "hassan", "salma", "adel", "lina", "majed", "amal", "bilal", "noor", "samir", "reem", "walid"][i]}@${pick(DOMAINS, i, 3)}`,
    phone: `+966 5${(50 + i) % 100} ${String(100 + i * 7).padStart(3, "0")} ${String(2000 + i * 13)}`,
    company: pick(COMPANY_NAMES[lang], i, 5),
    jobTitle: pick(jobs, i),
    stage: pick([...stages], i),
    tags: someTags(lang, i),
    owner: { name: pick(OWNERS[lang], i, 3) },
    lastActivity: i % 9 === 8 ? null : ago(i * 7 * HOUR + 20 * 60_000),
  }));
}

export function makeCompanies(lang: "en" | "ar"): Company[] {
  const industries = lang === "ar" ? ["تجارة", "لوجستيات", "رعاية صحية", "خدمات مالية", "أغذية", "إعلام"] : ["Trading", "Logistics", "Healthcare", "Finance", "Food", "Media"];
  const cities = lang === "ar" ? ["الرياض", "جدة", "دبي", "القاهرة", "الدمام"] : ["Riyadh", "Jeddah", "Dubai", "Cairo", "Dammam"];
  return COMPANY_NAMES[lang].map((name, i) => ({
    id: `co${i + 1}`,
    name,
    domain: DOMAINS[i],
    industry: pick(industries, i),
    location: pick(cities, i, 2),
    contactsCount: 3 + ((i * 7) % 23),
    tags: someTags(lang, i + 1),
    owner: { name: pick(OWNERS[lang], i, 2) },
    lastActivity: ago(i * 19 * HOUR + 40 * 60_000),
  }));
}

export function makeProjects(lang: "en" | "ar"): Project[] {
  const names =
    lang === "ar"
      ? ["إعادة تصميم الموقع", "تطبيق الجوال", "ترحيل البيانات", "حملة الربع الثالث", "لوحة التقارير", "بوابة العملاء", "تدقيق الأمان", "دليل العلامة", "نظام الفوترة", "مركز المساعدة"]
      : ["Website redesign", "Mobile app", "Data migration", "Q3 campaign", "Reporting dashboard", "Client portal", "Security audit", "Brand guidelines", "Billing system", "Help centre"];
  const statuses = ["active", "active", "planning", "on-hold", "completed", "active", "planning", "archived", "active", "completed"] as const;
  const progress = [62, 35, 8, 44, 100, 78, 15, 100, 51, 100];
  const clients = COMPANY_NAMES[lang];
  return names.map((name, i) => ({
    id: `p${i + 1}`,
    name,
    key: ["WEB", "APP", "DAT", "MKT", "RPT", "CLI", "SEC", "BRD", "BIL", "HLP"][i],
    client: pick(clients, i, 3),
    status: statuses[i] as Project["status"],
    progress: progress[i] as number,
    members: Array.from({ length: 1 + (i % 5) }, (_, k) => ({ name: pick(CONTACT_NAMES[lang], i + k * 3) })),
    owner: { name: pick(OWNERS[lang], i) },
    dueDate: new Date(Date.now() + (i % 3 === 1 ? -6 : 12 + i * 9) * DAY),
    tags: someTags(lang, i + 2),
    lastActivity: ago(i * 11 * HOUR + 15 * 60_000),
  }));
}

/* ------------------------------------------------------------------ helpers */

/** Rows that appear after a short delay, so the skeleton state shows. */
export function useFakeRows<T>(make: (lang: "en" | "ar") => T[], delay = 1100) {
  const ar = useAr();
  const lang = ar ? "ar" : "en";
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    setLoading(true);
    wait(delay).then(() => {
      if (!live) return;
      setRows(make(lang));
      setLoading(false);
    });
    return () => {
      live = false;
    };
  }, [lang]); // eslint-disable-line
  return { rows, setRows, loading, ar };
}

/** The page frame: a title, a line under it, page actions and the content. */
export function CrmPage({ title, description, actions, children }: { title: string; description: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-8">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
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

const iso = (d: Date | string | number | null | undefined) => (d == null ? "" : new Date(d).toISOString());

/** Export columns for contacts. */
export function contactExportColumns(ar: boolean): ExportColumn<Contact>[] {
  return [
    { id: "name", label: ar ? "الاسم" : "Name" },
    { id: "email", label: ar ? "البريد" : "Email" },
    { id: "phone", label: ar ? "الهاتف" : "Phone" },
    { id: "company", label: ar ? "الشركة" : "Company" },
    { id: "stage", label: ar ? "المرحلة" : "Stage" },
    { id: "tags", label: ar ? "الوسوم" : "Tags", value: (c) => (c.tags ?? []).map((t) => t.label).join("; ") },
    { id: "owner", label: ar ? "المسؤول" : "Owner", value: (c) => c.owner?.name },
    { id: "lastActivity", label: ar ? "آخر نشاط" : "Last activity", value: (c) => iso(c.lastActivity) },
  ];
}

export function companyExportColumns(ar: boolean): ExportColumn<Company>[] {
  return [
    { id: "name", label: ar ? "الاسم" : "Name" },
    { id: "domain", label: ar ? "النطاق" : "Domain" },
    { id: "industry", label: ar ? "القطاع" : "Industry" },
    { id: "location", label: ar ? "الموقع" : "Location" },
    { id: "contactsCount", label: ar ? "جهات الاتصال" : "Contacts" },
    { id: "tags", label: ar ? "الوسوم" : "Tags", value: (c) => (c.tags ?? []).map((t) => t.label).join("; ") },
    { id: "owner", label: ar ? "المسؤول" : "Owner", value: (c) => c.owner?.name },
    { id: "lastActivity", label: ar ? "آخر نشاط" : "Last activity", value: (c) => iso(c.lastActivity) },
  ];
}

export function projectExportColumns(ar: boolean): ExportColumn<Project>[] {
  return [
    { id: "name", label: ar ? "المشروع" : "Project" },
    { id: "key", label: ar ? "الرمز" : "Key" },
    { id: "client", label: ar ? "العميل" : "Client" },
    { id: "status", label: ar ? "الحالة" : "Status" },
    { id: "progress", label: ar ? "التقدم %" : "Progress %" },
    { id: "members", label: ar ? "الأعضاء" : "Members", value: (p) => (p.members ?? []).map((m) => m.name).join("; ") },
    { id: "owner", label: ar ? "المسؤول" : "Lead", value: (p) => p.owner?.name },
    { id: "dueDate", label: ar ? "الاستحقاق" : "Due", value: (p) => iso(p.dueDate) },
  ];
}

/** The export button wired to a list's state: selected, filtered and all rows. PDF is a fake callback. */
export function ListExport<T>({ ctx, all, columns, filename, ar }: { ctx: EntityListContext<T>; all: T[]; columns: ExportColumn<T>[]; filename: string; ar: boolean }) {
  return (
    <ExportButton<T>
      columns={columns}
      filename={filename}
      scopes={{ selected: ctx.selectedRows, filtered: ctx.filteredRows, all }}
      defaultScope={ctx.selectedRows.length ? "selected" : "filtered"}
      onExportPdf={async (_request, { signal, onProgress }) => {
        for (let i = 1; i <= 5; i++) {
          await wait(260);
          if (signal.aborted) return;
          onProgress(i / 5);
        }
        return new Blob(["%PDF-1.4 demo"], { type: "application/pdf" });
      }}
    >
      {ar ? "تصدير" : "Export"}
    </ExportButton>
  );
}

/* ------------------------------------------------------------------ pages */

export function ContactsPage() {
  const { rows, setRows, loading, ar } = useFakeRows(makeContacts);
  const cols = contactExportColumns(ar);
  return (
    <CrmPage
      title={ar ? "جهات الاتصال" : "Contacts"}
      description={ar ? "الأشخاص الذين تتعامل معهم، وآخر نشاط لكل منهم." : "The people you work with, and when you last spoke."}
      actions={
        <Button variant="primary">
          <Plus aria-hidden />
          {ar ? "إضافة جهة اتصال" : "Add contact"}
        </Button>
      }
    >
      <ContactList
        contacts={rows}
        loading={loading}
        onRowClick={() => undefined}
        toolbar={(ctx) => <ListExport ctx={ctx} all={rows} columns={cols} filename="contacts" ar={ar} />}
        bulkActions={({ selectedRows, clearSelection }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const ids = new Set(selectedRows.map((r) => r.id));
              setRows((prev) => prev.filter((r) => !ids.has(r.id)));
              clearSelection();
            }}
          >
            <Trash2 aria-hidden />
            {ar ? "حذف" : "Delete"}
          </Button>
        )}
      />
    </CrmPage>
  );
}

export function CompaniesPage() {
  const { rows, loading, ar } = useFakeRows(makeCompanies);
  const cols = companyExportColumns(ar);
  return (
    <CrmPage
      title={ar ? "الشركات" : "Companies"}
      description={ar ? "الحسابات التي تعمل معها وعدد جهات الاتصال في كل منها." : "The accounts you work with and how many people you know at each."}
      actions={
        <Button variant="primary">
          <Plus aria-hidden />
          {ar ? "إضافة شركة" : "Add company"}
        </Button>
      }
    >
      <CompanyList companies={rows} loading={loading} onRowClick={() => undefined} toolbar={(ctx) => <ListExport ctx={ctx} all={rows} columns={cols} filename="companies" ar={ar} />} />
    </CrmPage>
  );
}

export function ProjectsPage() {
  const { rows, loading, ar } = useFakeRows(makeProjects);
  const cols = projectExportColumns(ar);
  return (
    <CrmPage
      title={ar ? "المشاريع" : "Projects"}
      description={ar ? "نظرة على كل مشروع: الحالة والتقدم والفريق وموعد التسليم." : "Every project at a glance: status, progress, team and due date."}
      actions={
        <Button variant="primary">
          <Plus aria-hidden />
          {ar ? "مشروع جديد" : "New project"}
        </Button>
      }
    >
      <ProjectList projects={rows} loading={loading} defaultView="cards" onRowClick={() => undefined} toolbar={(ctx) => <ListExport ctx={ctx} all={rows} columns={cols} filename="projects" ar={ar} />} />
    </CrmPage>
  );
}
