import { type EnvVariable, EnvList } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { ENVIRONMENTS, ENVIRONMENTS_AR, sampleEnv, useAr, wait } from "./_developer-demo";

const meta = { title: "Components/Developer Tools/Env List", component: EnvList, parameters: { layout: "padded" } } satisfies Meta<typeof EnvList>;
export default meta;
type Story = StoryObj;

function Demo({ readOnly = false, environments = false }: { readOnly?: boolean; environments?: boolean }) {
  const ar = useAr();
  const [env, setEnv] = useState("development");
  const [byEnv, setByEnv] = useState<Record<string, EnvVariable[]>>(() => ({
    development: sampleEnv("development"),
    preview: sampleEnv("preview"),
    production: sampleEnv("production"),
  }));
  const list = byEnv[env] ?? [];
  const set = (next: EnvVariable[]) => setByEnv((all) => ({ ...all, [env]: next }));
  return (
    <EnvList
      className="max-w-3xl"
      variables={list}
      readOnly={readOnly}
      {...(environments ? { environments: ar ? ENVIRONMENTS_AR : ENVIRONMENTS, environment: env, onEnvironmentChange: setEnv } : {})}
      onSave={async (variable, previousKey) => {
        await wait(500);
        if (variable.key === "FORBIDDEN") return { error: ar ? "هذا الاسم محجوز." : "That name is reserved." };
        set(previousKey ? list.map((v) => (v.key === previousKey ? variable : v)) : [...list, variable]);
      }}
      onDelete={async (key) => {
        await wait(400);
        set(list.filter((v) => v.key !== key));
      }}
      onImport={async (incoming, { overwrite }) => {
        await wait(600);
        const have = new Map(list.map((v) => [v.key, v]));
        for (const v of incoming) if (overwrite || !have.has(v.key)) have.set(v.key, v);
        set([...have.values()]);
      }}
    />
  );
}

/** Reveal, copy, add, edit, delete, import a pasted .env (try duplicate keys and `1BAD=x`), export. */
export const Default: Story = { render: () => <Demo /> };

/** Tabs switch environments; each has its own variables. */
export const Environments: Story = { render: () => <Demo environments /> };

/** Reveal and copy only. */
export const ReadOnly: Story = { render: () => <Demo readOnly /> };

/** Nothing yet. */
export const Empty: Story = {
  render: () => <EnvList className="max-w-3xl" variables={[]} onSave={async () => {}} onImport={async () => {}} />,
};

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo environments /> };
