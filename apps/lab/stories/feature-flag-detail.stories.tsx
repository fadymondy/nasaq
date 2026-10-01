import { FeatureFlagDetail, FlagAuditHistory } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMemo, useState } from "react";
import { featureFlags, flagAudit, flagEnvironments, flagFields, useAr, wait } from "./_moharrik-demo";

const meta = { title: "Components/Developer Tools/Feature Flag Detail", component: FeatureFlagDetail, parameters: { layout: "padded" } } satisfies Meta<typeof FeatureFlagDetail>;
export default meta;
type Story = StoryObj;

function Detail({ index = 0 }) {
  const ar = useAr();
  const envs = useMemo(() => flagEnvironments(ar), [ar]);
  const fields = useMemo(() => flagFields(ar), [ar]);
  const [flag, setFlag] = useState(() => featureFlags(ar)[index]!);
  const audit = useMemo(() => flagAudit(ar), [ar]);
  return (
    <div className="max-w-4xl">
      <FeatureFlagDetail
        flag={flag}
        environments={envs}
        fields={fields}
        audit={audit}
        onToggle={async (id, enabled) => { await wait(350); setFlag((f) => ({ ...f, environments: { ...f.environments, [id]: { ...(f.environments[id] ?? { enabled: true, rollout: 100 }), enabled } } })); }}
        onRolloutChange={async (id, rollout) => { await wait(350); setFlag((f) => ({ ...f, environments: { ...f.environments, [id]: { ...(f.environments[id] ?? { enabled: true, rollout: 100 }), rollout } } })); }}
        onRulesChange={async (rules) => { await wait(400); setFlag((f) => ({ ...f, rules })); }}
        onVariantsChange={async (variants) => { await wait(400); setFlag((f) => ({ ...f, variants })); }}
        onKill={async () => { await wait(500); setFlag((f) => ({ ...f, killed: true })); }}
        onRestore={async () => { await wait(500); setFlag((f) => ({ ...f, killed: false })); }}
      />
    </div>
  );
}

function History() {
  const ar = useAr();
  return (
    <div className="max-w-xl">
      <FlagAuditHistory entries={flagAudit(ar)} />
    </div>
  );
}

export const Default: Story = { render: () => <Detail /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Detail /> };
export const Killed: Story = { render: () => <Detail index={5} /> };
export const AuditHistory: Story = { render: () => <History /> };
