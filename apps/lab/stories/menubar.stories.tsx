import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
  NasaqProvider,
  useNasaq,
} from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, type ReactNode } from "react";

const meta = { title: "Components/Navigation/Menubar", component: Menubar, parameters: { layout: "padded" } } satisfies Meta<typeof Menubar>;
export default meta;
type Story = StoryObj<typeof meta>;

const COPY = {
  en: {
    file: "File", edit: "Edit", view: "View", help: "Help",
    newFile: "New file", newWindow: "New window", open: "Open…", save: "Save", saveAs: "Save as…", share: "Share", email: "Email link", messages: "Messages", notes: "Notes", print: "Print…", quit: "Quit",
    undo: "Undo", redo: "Redo", cut: "Cut", copy: "Copy", paste: "Paste",
    toolbar: "Show toolbar", sidebar: "Show sidebar", zoom: "Zoom", small: "Small", normal: "Normal", large: "Large",
    docs: "Documentation", about: "About Nasaq", last: "Last action: ",
  },
  ar: {
    file: "ملف", edit: "تحرير", view: "عرض", help: "مساعدة",
    newFile: "ملف جديد", newWindow: "نافذة جديدة", open: "فتح…", save: "حفظ", saveAs: "حفظ باسم…", share: "مشاركة", email: "رابط بالبريد", messages: "الرسائل", notes: "الملاحظات", print: "طباعة…", quit: "خروج",
    undo: "تراجع", redo: "إعادة", cut: "قص", copy: "نسخ", paste: "لصق",
    toolbar: "إظهار شريط الأدوات", sidebar: "إظهار الشريط الجانبي", zoom: "التكبير", small: "صغير", normal: "عادي", large: "كبير",
    docs: "التوثيق", about: "عن نسق", last: "آخر إجراء: ",
  },
};

/** A desktop-app menu bar: File, Edit, View, Help. */
function DesktopApp() {
  const t = COPY[useNasaq().locale.startsWith("ar") ? "ar" : "en"];
  const [toolbar, setToolbar] = useState(true);
  const [sidebar, setSidebar] = useState(false);
  const [zoom, setZoom] = useState("normal");
  const [last, setLast] = useState("");
  const run = (name: string) => () => setLast(name);
  return (
    <div className="flex flex-col gap-4">
      <Menubar aria-label={t.file}>
        <MenubarMenu>
          <MenubarTrigger>{t.file}</MenubarTrigger>
          <MenubarContent>
            <MenubarItem shortcut={["Ctrl", "N"]} onClick={run(t.newFile)}>{t.newFile}</MenubarItem>
            <MenubarItem shortcut={["Ctrl", "Shift", "N"]} onClick={run(t.newWindow)}>{t.newWindow}</MenubarItem>
            <MenubarItem shortcut="⌘O" onClick={run(t.open)}>{t.open}</MenubarItem>
            <MenubarSeparator />
            <MenubarItem shortcut={["Ctrl", "S"]} onClick={run(t.save)}>{t.save}</MenubarItem>
            <MenubarItem onClick={run(t.saveAs)}>{t.saveAs}</MenubarItem>
            <MenubarSub>
              <MenubarSubTrigger>{t.share}</MenubarSubTrigger>
              <MenubarSubContent>
                <MenubarItem onClick={run(t.email)}>{t.email}</MenubarItem>
                <MenubarItem onClick={run(t.messages)}>{t.messages}</MenubarItem>
                <MenubarItem onClick={run(t.notes)}>{t.notes}</MenubarItem>
              </MenubarSubContent>
            </MenubarSub>
            <MenubarSeparator />
            <MenubarItem shortcut={["Ctrl", "P"]} onClick={run(t.print)}>{t.print}</MenubarItem>
            <MenubarItem variant="danger" shortcut={["Ctrl", "Q"]} onClick={run(t.quit)}>{t.quit}</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>{t.edit}</MenubarTrigger>
          <MenubarContent>
            <MenubarItem shortcut={["Ctrl", "Z"]} onClick={run(t.undo)}>{t.undo}</MenubarItem>
            <MenubarItem shortcut={["Ctrl", "Y"]} onClick={run(t.redo)}>{t.redo}</MenubarItem>
            <MenubarSeparator />
            <MenubarItem shortcut={["Ctrl", "X"]} onClick={run(t.cut)}>{t.cut}</MenubarItem>
            <MenubarItem shortcut={["Ctrl", "C"]} onClick={run(t.copy)}>{t.copy}</MenubarItem>
            <MenubarItem shortcut={["Ctrl", "V"]} onClick={run(t.paste)}>{t.paste}</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>{t.view}</MenubarTrigger>
          <MenubarContent>
            <MenubarCheckboxItem checked={toolbar} onCheckedChange={setToolbar} shortcut={["Ctrl", "T"]}>{t.toolbar}</MenubarCheckboxItem>
            <MenubarCheckboxItem checked={sidebar} onCheckedChange={setSidebar}>{t.sidebar}</MenubarCheckboxItem>
            <MenubarSeparator />
            <MenubarGroup>
              <MenubarLabel>{t.zoom}</MenubarLabel>
              <MenubarRadioGroup value={zoom} onValueChange={setZoom}>
                <MenubarRadioItem value="small">{t.small}</MenubarRadioItem>
                <MenubarRadioItem value="normal">{t.normal}</MenubarRadioItem>
                <MenubarRadioItem value="large">{t.large}</MenubarRadioItem>
              </MenubarRadioGroup>
            </MenubarGroup>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>{t.help}</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={run(t.docs)}>{t.docs}</MenubarItem>
            <MenubarItem onClick={run(t.about)}>{t.about}</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
      <p className="text-body-sm text-muted-foreground" aria-live="polite">
        {t.last}
        {last || "-"} / {toolbar ? "toolbar" : "no toolbar"} / {sidebar ? "sidebar" : "no sidebar"} / {zoom}
      </p>
    </div>
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

/** File, Edit, View, Help with submenus, checkbox and radio items, and shortcuts shown with Kbd. Follows the lab locale. */
export const DesktopApp_: Story = { name: "Desktop app", render: () => <DesktopApp /> };

/** Arrow keys walk the triggers by reading direction: in Arabic, ArrowLeft goes to the next menu, and the Share submenu opens on the left. */
export const ArabicRtl: Story = {
  name: "Arabic RTL",
  render: () => (
    <ArabicScope>
      <DesktopApp />
    </ArabicScope>
  ),
};

export const English: Story = {
  render: () => (
    <NasaqProvider target="scope" locale="en" className="contents">
      <DesktopApp />
    </NasaqProvider>
  ),
};
