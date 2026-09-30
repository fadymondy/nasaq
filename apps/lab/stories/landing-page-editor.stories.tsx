import { type LandingPage, LandingPageEditor } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { makeLandingPage } from "./_builders-demo";
import { wait } from "./_profile-demo";

const meta = { title: "Components/Editors/Landing Page Editor", component: LandingPageEditor, parameters: { layout: "padded" } } satisfies Meta<typeof LandingPageEditor>;
export default meta;
type Story = StoryObj;

function Demo({ lang, initial }: { lang: "en" | "ar"; initial?: LandingPage }) {
  const [page, setPage] = useState<LandingPage>(() => initial ?? makeLandingPage(lang));
  return <LandingPageEditor value={page} onValueChange={setPage} onSave={async () => wait(500)} onPublish={async () => wait(800)} />;
}

/** Outline, live preview and inspector. Add, reorder, hide and duplicate sections; edit the page address and search fields on the Page tab. */
export const Default: Story = { render: () => <Demo lang="en" /> };
/** Nothing to publish yet: the blockers are listed and Publish stays disabled. */
export const Empty: Story = { render: () => <Demo lang="en" initial={{ title: "", slug: "", seoTitle: "", seoDescription: "", dir: "ltr", sections: [], status: "draft" }} /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo lang="ar" /> };
