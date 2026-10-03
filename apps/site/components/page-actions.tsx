"use client";

import { Check, Copy, FileText } from "lucide-react";
import { useState } from "react";

const action =
  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground";

/** Copy the page as markdown, view it raw, or hand it to an AI assistant. The markdown lives at <page>.md. */
export function PageActions({ markdown, url }: { markdown: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const prompt = encodeURIComponent(`Read ${url}.md and help me use it in my project.`);

  const copy = async () => {
    const res = await fetch(markdown);
    if (!res.ok) return;
    await navigator.clipboard.writeText(await res.text());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="not-prose flex flex-wrap gap-2">
      <button type="button" className={action} onClick={copy}>
        {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
        {copied ? "Copied" : "Copy Markdown"}
      </button>
      <a className={action} href={markdown} target="_blank" rel="noreferrer">
        <FileText className="size-3.5" aria-hidden />
        View as Markdown
      </a>
      <a className={action} href={`https://chatgpt.com/?hints=search&q=${prompt}`} target="_blank" rel="noreferrer">
        Open in ChatGPT
      </a>
      <a className={action} href={`https://claude.ai/new?q=${prompt}`} target="_blank" rel="noreferrer">
        Open in Claude
      </a>
    </div>
  );
}
