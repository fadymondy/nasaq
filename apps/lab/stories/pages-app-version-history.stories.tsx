/* Version history: what changed, when and by whom, with a confirmed restore. Demo data lives in ./_automation-demo.tsx. */
import { VersionHistory } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { demoHistory, useAr, wait } from "./_automation-demo";
import { FlowPage } from "./_workflow-demo";

const meta = { title: "Pages/App/Version History", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  const [versions, setVersions] = useState(() => demoHistory(ar));
  return (
    <FlowPage title={ar ? "سجل النسخ" : "Version history"} description={ar ? "كل عملية حفظ، الأحدث أولًا. اقرأ نسخة، قارنها، واستعدها عند الحاجة." : "Every save, newest first. Read a version, compare it and restore it when needed."}>
      <VersionHistory
        versions={versions}
        language="json"
        defaultSelectedId="v2"
        onRestore={async (v) => {
          await wait(700);
          setVersions((list) => [...list, { ...v, id: `v${list.length + 1}`, version: list.length + 1, savedAt: Date.now(), note: ar ? `استعادة النسخة ${v.version}` : `Restored version ${v.version}` }]);
        }}
      />
    </FlowPage>
  );
}

export const Default: Story = { render: () => <Page /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
