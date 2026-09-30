import { NasaqProvider, type TreeNode, TreeView, useNasaq } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { File, FileText, Folder, Image, Music } from "lucide-react";
import { type ReactNode, useState } from "react";

const meta = { title: "Components/Navigation/Tree View", component: TreeView, parameters: { layout: "padded" } } satisfies Meta<typeof TreeView>;
export default meta;
type Story = StoryObj;

const COPY = {
  en: {
    label: "Files",
    documents: "Documents",
    cv: "CV.pdf",
    letters: "Letters",
    letter: "Cover letter.docx",
    photos: "Photos",
    holiday: "Holiday.jpg",
    music: "Music",
    notes: "Notes.txt",
    archive: "Archive (locked)",
    remote: "Remote folder",
    lazyA: "Report.xlsx",
    lazyB: "Budget.xlsx",
    selected: "Selected",
    none: "nothing",
  },
  ar: {
    label: "الملفات",
    documents: "المستندات",
    cv: "السيرة الذاتية.pdf",
    letters: "الخطابات",
    letter: "خطاب التقديم.docx",
    photos: "الصور",
    holiday: "الإجازة.jpg",
    music: "الموسيقى",
    notes: "ملاحظات.txt",
    archive: "الأرشيف (مقفل)",
    remote: "مجلد بعيد",
    lazyA: "التقرير.xlsx",
    lazyB: "الميزانية.xlsx",
    selected: "المحدد",
    none: "لا شيء",
  },
};
type Copy = (typeof COPY)["en"];

const useCopy = (): Copy => COPY[useNasaq().locale.startsWith("ar") ? "ar" : "en"];

function fileTree(t: Copy): TreeNode[] {
  return [
    {
      id: "docs",
      label: t.documents,
      textValue: t.documents,
      icon: <Folder />,
      children: [
        { id: "cv", label: t.cv, textValue: t.cv, icon: <FileText /> },
        { id: "letters", label: t.letters, textValue: t.letters, icon: <Folder />, children: [{ id: "letter", label: t.letter, textValue: t.letter, icon: <FileText /> }] },
      ],
    },
    { id: "photos", label: t.photos, textValue: t.photos, icon: <Folder />, children: [{ id: "holiday", label: t.holiday, textValue: t.holiday, icon: <Image /> }] },
    { id: "music", label: t.music, textValue: t.music, icon: <Music /> },
    { id: "notes", label: t.notes, textValue: t.notes, icon: <File /> },
    { id: "archive", label: t.archive, textValue: t.archive, icon: <Folder />, disabled: true },
  ];
}

function Frame({ children }: { children: ReactNode }) {
  return <div className="w-72 rounded-card border border-border bg-card p-2">{children}</div>;
}

function Basic() {
  const t = useCopy();
  const [selected, setSelected] = useState<string[]>(["cv"]);
  return (
    <div className="flex flex-col gap-3">
      <Frame>
        <TreeView aria-label={t.label} items={fileTree(t)} defaultExpanded={["docs"]} selected={selected} onSelectedChange={setSelected} />
      </Frame>
      <p className="text-body-sm text-muted-foreground">
        {t.selected}: {selected.join(", ") || t.none}
      </p>
    </div>
  );
}

function Multiple() {
  const t = useCopy();
  return (
    <Frame>
      <TreeView aria-label={t.label} items={fileTree(t)} selectionMode="multiple" defaultExpanded={["docs", "letters"]} defaultSelected={["cv", "letter"]} />
    </Frame>
  );
}

/** A folder without loaded children: expanding it calls `onExpand`, and the row shows a spinner until the promise settles. */
function Lazy() {
  const t = useCopy();
  const [items, setItems] = useState<TreeNode[]>(() => [
    { id: "local", label: t.documents, textValue: t.documents, icon: <Folder />, children: [{ id: "cv", label: t.cv, textValue: t.cv, icon: <FileText /> }] },
    { id: "remote", label: t.remote, textValue: t.remote, icon: <Folder />, hasChildren: true },
  ]);
  const load = (node: TreeNode) =>
    new Promise<void>((resolve) => {
      setTimeout(() => {
        setItems((prev) =>
          prev.map((n) =>
            n.id === node.id
              ? { ...n, children: [{ id: "a", label: t.lazyA, textValue: t.lazyA, icon: <File /> }, { id: "b", label: t.lazyB, textValue: t.lazyB, icon: <File /> }] }
              : n,
          ),
        );
        resolve();
      }, 900);
    });
  return (
    <Frame>
      <TreeView aria-label={t.label} items={items} onExpand={load} />
    </Frame>
  );
}

function ArabicScope({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useNasaq();
  return (
    <NasaqProvider target="scope" locale="ar" theme={resolvedTheme} className="contents">
      {children}
    </NasaqProvider>
  );
}

/** Up and Down move, Right expands or enters, Left collapses or goes to the parent, Home and End jump, type to search, Enter selects. Follows the lab locale. */
export const Default: Story = { render: () => <Basic /> };

/** Enter or click toggles each row. The tree gets `aria-multiselectable`. */
export const MultipleSelection: Story = { name: "Multiple selection", render: () => <Multiple /> };

/** Expand Remote folder: its children load on demand. */
export const LazyChildren: Story = { name: "Lazy children", render: () => <Lazy /> };

/** Arabic and RTL: indentation follows the inline start, the chevron mirrors, and Left expands while Right collapses. */
export const ArabicRtl: Story = {
  name: "Arabic RTL",
  render: () => (
    <ArabicScope>
      <div className="flex flex-col gap-6">
        <Basic />
        <Lazy />
      </div>
    </ArabicScope>
  ),
};

export const English: Story = {
  render: () => (
    <NasaqProvider target="scope" locale="en" className="contents">
      <Basic />
    </NasaqProvider>
  ),
};
