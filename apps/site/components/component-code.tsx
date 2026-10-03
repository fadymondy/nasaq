"use client";

import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import { useState } from "react";

export interface CodeStack {
  stack: string;
  label: string;
  lang: string;
}

const tab = (on: boolean) =>
  `rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${on ? "bg-fd-accent text-fd-accent-foreground" : "text-fd-muted-foreground hover:text-fd-foreground"}`;

/**
 * The component's source for every stack. The first stack ships with the page; the rest come from
 * public/code/<name>.json on first switch, which keeps 20+ MB of examples out of the build graph.
 */
export function ComponentCode({ name, stacks, initial }: { name: string; stacks: [CodeStack, ...CodeStack[]]; initial: string }) {
  const [active, setActive] = useState(stacks[0].stack);
  const [code, setCode] = useState<Record<string, string>>({ [stacks[0].stack]: initial });
  const [failed, setFailed] = useState(false);

  const select = async (stack: string) => {
    setActive(stack);
    if (code[stack] !== undefined) return;
    try {
      const res = await fetch(`/code/${name}.json`);
      if (!res.ok) throw new Error(String(res.status));
      setCode(await res.json());
    } catch {
      setFailed(true);
    }
  };

  const current = stacks.find((s) => s.stack === active) ?? stacks[0];
  const source = code[current.stack];

  return (
    <div className="not-prose my-6 flex flex-col gap-2">
      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Stack">
        {stacks.map((s) => (
          <button key={s.stack} type="button" role="tab" aria-selected={s.stack === current.stack} className={tab(s.stack === current.stack)} onClick={() => select(s.stack)}>
            {s.label}
          </button>
        ))}
      </div>
      {source !== undefined ? (
        <DynamicCodeBlock lang={current.lang} code={source} />
      ) : (
        <p className="rounded-lg border p-4 text-sm text-fd-muted-foreground">{failed ? "Could not load this example." : "Loading…"}</p>
      )}
    </div>
  );
}
