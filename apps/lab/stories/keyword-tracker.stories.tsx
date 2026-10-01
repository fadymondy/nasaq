import { AddKeywordsDialog, KeywordTracker, RankChange, RankDistribution, rankDistribution } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { KeywordsDemo, keywordLocations, trackedKeywords, useAr, wait } from "./_moharrik-demo";

const meta = { title: "Components/SEO/Keyword Tracker", component: KeywordTracker, parameters: { layout: "padded" } } satisfies Meta<typeof KeywordTracker>;
export default meta;
type Story = StoryObj;

function Distribution() {
  const ar = useAr();
  return (
    <div className="max-w-md">
      <RankDistribution distribution={rankDistribution(trackedKeywords(ar).map((k) => k.position))} />
    </div>
  );
}

function Changes() {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <RankChange current={4} previous={9} />
      <RankChange current={18} previous={11} />
      <RankChange current={7} previous={7} />
      <RankChange current={null} previous={40} />
    </div>
  );
}

function Dialog() {
  const ar = useAr();
  const [open, setOpen] = useState(true);
  return (
    <>
      <button type="button" className="rounded-control border border-input px-3 py-1.5 text-body-sm" onClick={() => setOpen(true)}>
        {ar ? "إضافة كلمات" : "Add keywords"}
      </button>
      <AddKeywordsDialog open={open} onOpenChange={setOpen} locations={keywordLocations(ar)} onAdd={async () => { await wait(500); }} />
    </>
  );
}

export const Default: Story = { render: () => <KeywordsDemo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <KeywordsDemo /> };
export const Distribution_: Story = { name: "Distribution", render: () => <Distribution /> };
export const RankChanges: Story = { render: () => <Changes /> };
export const AddDialog: Story = { render: () => <Dialog /> };
export const Loading: Story = { render: () => <KeywordTracker keywords={[]} loading /> };
export const Empty: Story = { render: () => <KeywordTracker keywords={[]} /> };
