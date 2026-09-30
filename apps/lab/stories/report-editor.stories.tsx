import { ReportEditor, ReportViewer } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fakeSave, report } from "./_editors-demo";
import { useAr } from "./_profile-demo";

const meta = { title: "Components/Editors/Report Editor", component: ReportEditor, parameters: { layout: "padded" } } satisfies Meta<typeof ReportEditor>;
export default meta;
type Story = StoryObj;

function Demo({ save = false, view = "edit" as "edit" | "preview" }) {
  const ar = useAr();
  return <ReportEditor defaultValue={report(ar)} onSave={save ? fakeSave(ar) : undefined} defaultView={view} />;
}

export const Default: Story = { render: () => <Demo /> };
export const WithSave: Story = { render: () => <Demo save /> };
export const Preview: Story = { render: () => <Demo view="preview" /> };
export const Empty: Story = { render: () => <ReportEditor defaultValue={{ title: "", blocks: [] }} /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo save /> };

function Viewer() {
  const ar = useAr();
  return <ReportViewer report={report(ar)} />;
}
/** The read-only, print friendly viewer used by Preview. */
export const ReadOnlyViewer: Story = { name: "Report viewer", render: () => <Viewer /> };
export const ViewerArabic: Story = { name: "Report viewer (Arabic)", globals: { locale: "ar" }, render: () => <Viewer /> };
