import { RepositoryPicker, type RepositoryPickerValue } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { loadBranches, searchRepos, useAr } from "./_devtools-q3-demo";

const meta = { title: "Components/Developer Tools/Repository Picker", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Demo() {
  const ar = useAr();
  const [value, setValue] = useState<RepositoryPickerValue>({ repo: null, branch: null });
  return (
    <div className="flex max-w-md flex-col gap-3">
      <RepositoryPicker value={value} onChange={setValue} searchRepositories={searchRepos} loadBranches={loadBranches} account={{ login: "acme" }} onConfigure={() => undefined} />
      <p className="text-body-sm text-muted-foreground">
        {ar ? "المختار: " : "Picked: "}
        <bdi dir="ltr">{value.repo ? `${value.repo.fullName}@${value.branch ?? ""}` : "-"}</bdi>
      </p>
    </div>
  );
}

/** Search through the app installation, then pick a branch. The default branch is chosen for you. */
export const Default: Story = { render: () => <Demo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
