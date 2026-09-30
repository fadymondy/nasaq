import { VersionHistory } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { demoHistory, useAr, wait } from "./_automation-demo";

const meta = { title: "Components/Collaboration/Version History", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Demo({ selected, fail }: { selected?: string; fail?: boolean }) {
  const ar = useAr();
  const [versions, setVersions] = useState(() => demoHistory(ar));
  return (
    <VersionHistory
      versions={versions}
      language="json"
      defaultSelectedId={selected ?? null}
      onRestore={async (v) => {
        await wait(700);
        if (fail) return { error: ar ? "تعذّر الحفظ. حاول مرة أخرى." : "Could not save. Try again." };
        setVersions((list) => [...list, { ...v, id: `v${list.length + 1}`, version: list.length + 1, savedAt: Date.now(), note: ar ? `استعادة النسخة ${v.version}` : `Restored version ${v.version}` }]);
      }}
    />
  );
}

/** Versions newest first; choose one to preview, compare and restore. */
export const Default: Story = { render: () => <Demo selected="v2" /> };
export const NothingSelected: Story = { render: () => <Demo /> };
/** The save fails: the dialog closes and the reason shows above the preview. */
export const RestoreFails: Story = { render: () => <Demo selected="v1" fail /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo selected="v2" /> };
