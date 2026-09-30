import { IconRailSidebar, type RailSection } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { BarChart3, Home, Inbox, Settings, Users } from "lucide-react";
import { useState } from "react";
import { ArabicScope, useAr } from "./_profile-demo";

const meta = { title: "Components/Navigation/Icon Rail Sidebar", component: IconRailSidebar, parameters: { layout: "fullscreen" } } satisfies Meta<typeof IconRailSidebar>;
export default meta;
type Story = StoryObj;

function sections(ar: boolean): RailSection[] {
  const t = (en: string, a: string) => (ar ? a : en);
  return [
    { id: "home", label: t("Home", "الرئيسية"), icon: <Home />, groups: [{ id: "g", items: [{ id: "dash", label: t("Dashboard", "لوحة التحكم") }, { id: "activity", label: t("Activity", "النشاط") }] }] },
    {
      id: "inbox",
      label: t("Inbox", "الوارد"),
      icon: <Inbox />,
      groups: [
        {
          id: "g",
          label: t("Folders", "المجلدات"),
          items: [
            { id: "all", label: t("All messages", "كل الرسائل"), badge: "12" },
            { id: "sent", label: t("Sent", "المرسلة"), children: [{ id: "sent-week", label: t("This week", "هذا الأسبوع") }, { id: "sent-old", label: t("Older", "الأقدم") }] },
          ],
        },
      ],
    },
    { id: "people", label: t("People", "الأشخاص"), icon: <Users />, groups: [{ id: "g", items: [{ id: "users", label: t("Users", "المستخدمون") }, { id: "teams", label: t("Teams", "الفرق") }] }] },
    { id: "reports", label: t("Reports", "التقارير"), icon: <BarChart3 /> },
    { id: "settings", label: t("Settings", "الإعدادات"), icon: <Settings /> },
  ];
}

function Demo() {
  const ar = useAr();
  const [item, setItem] = useState("dash");
  return (
    <div className="h-dvh">
      <IconRailSidebar sections={sections(ar)} activeItem={item} onItemSelect={(id) => setItem(id)}>
        <div className="p-6">
          <h1 className="text-h1">{item}</h1>
          <p className="text-body text-muted-foreground">{ar ? "المحتوى هنا." : "Page content goes here."}</p>
        </div>
      </IconRailSidebar>
    </div>
  );
}

export const Default: Story = { render: () => <Demo /> };
export const Arabic: Story = {
  render: () => (
    <ArabicScope>
      <Demo />
    </ArabicScope>
  ),
};
