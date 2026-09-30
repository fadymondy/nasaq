"use client";

import { Children, type ComponentProps, isValidElement, type ReactNode } from "react";
import ReactMarkdown, { type Components, type Options } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "../../lib/cn";
import { CodeBlock, InlineCode } from "../code-block";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../table";
import { Text } from "../text";

type Html<E extends keyof React.JSX.IntrinsicElements> = ComponentProps<E> & { node?: unknown };

/** Text of a fenced block: react-markdown hands `<pre><code className="language-x">text</code></pre>`. */
function codeOf(children: ReactNode): { language: string; code: string } | null {
  const child = Children.toArray(children)[0];
  if (!isValidElement<{ className?: string; children?: ReactNode }>(child)) return null;
  const text = Children.toArray(child.props.children).join("");
  const language = /language-([\w+-]+)/.exec(child.props.className ?? "")?.[1] ?? "text";
  return { language, code: text };
}

const heading =
  (variant: "h1" | "h2" | "h3", tag: "h1" | "h2" | "h3" | "h4" | "h5" | "h6") =>
  ({ node: _n, className, ...props }: Html<"h1">) => (
    <Text as={tag} variant={variant} dir="auto" className={cn("mt-2 text-start first:mt-0", className)} {...props} />
  );

/** GFM column alignment arrives as `text-align: left|right|center`; map it to start/end so it follows the page direction. */
function cellAlign(style?: { textAlign?: string }) {
  if (style?.textAlign === "left") return "text-start";
  if (style?.textAlign === "right") return "text-end";
  if (style?.textAlign === "center") return "text-center";
  return undefined;
}

const defaultComponents: Components = {
  h1: heading("h1", "h1"),
  h2: heading("h2", "h2"),
  h3: heading("h3", "h3"),
  h4: heading("h3", "h4"),
  h5: heading("h3", "h5"),
  h6: heading("h3", "h6"),
  p: ({ node: _n, className, ...props }: Html<"p">) => (
    <Text as="p" variant="body" dir="auto" className={cn("text-start", className)} {...props} />
  ),
  ul: ({ node: _n, className, ...props }: Html<"ul">) => (
    <ul dir="auto" className={cn("list-disc space-y-1 ps-6 text-body text-nq-fg-body marker:text-muted-foreground", className)} {...props} />
  ),
  ol: ({ node: _n, className, ...props }: Html<"ol">) => (
    <ol dir="auto" className={cn("list-decimal space-y-1 ps-6 text-body text-nq-fg-body marker:text-muted-foreground", className)} {...props} />
  ),
  li: ({ node: _n, className, ...props }: Html<"li">) => (
    <li dir="auto" className={cn("text-start [&.task-list-item]:list-none [&.task-list-item]:-ms-6", className)} {...props} />
  ),
  a: ({ node: _n, className, href, ...props }: Html<"a">) => {
    const external = typeof href === "string" && /^https?:\/\//i.test(href);
    return (
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className={cn(
          "rounded-[2px] text-foreground underline decoration-nq-line-strong underline-offset-4 outline-none hover:decoration-current",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
          className,
        )}
        {...props}
      />
    );
  },
  blockquote: ({ node: _n, className, ...props }: Html<"blockquote">) => (
    <blockquote dir="auto" className={cn("border-s-2 border-nq-line-strong ps-4 text-start text-muted-foreground", className)} {...props} />
  ),
  hr: ({ node: _n, className, ...props }: Html<"hr">) => <hr className={cn("border-0 border-t border-border", className)} {...props} />,
  strong: ({ node: _n, className, ...props }: Html<"strong">) => <strong className={cn("font-semibold text-foreground", className)} {...props} />,
  img: ({ node: _n, className, alt, ...props }: Html<"img">) => (
    // biome-ignore lint/a11y/useAltText: alt is forwarded from the Markdown source
    <img alt={alt ?? ""} loading="lazy" className={cn("h-auto max-w-full rounded-card border border-border", className)} {...props} />
  ),
  pre: ({ node: _n, children }: Html<"pre">) => {
    const block = codeOf(children);
    return block ? <CodeBlock code={block.code} language={block.language} /> : <pre>{children}</pre>;
  },
  // A `code` that reaches here is inline: fenced code is consumed by `pre` above.
  code: ({ node: _n, ...props }: Html<"code">) => <InlineCode {...props} />,
  table: ({ node: _n, className, ...props }: Html<"table">) => <Table dir="auto" className={className} {...props} />,
  thead: ({ node: _n, ...props }: Html<"thead">) => <TableHeader {...props} />,
  tbody: ({ node: _n, ...props }: Html<"tbody">) => <TableBody {...props} />,
  tr: ({ node: _n, ...props }: Html<"tr">) => <TableRow {...props} />,
  th: ({ node: _n, style, className, ...props }: Html<"th">) => (
    <TableHead dir="auto" className={cn("text-start", cellAlign(style), className)} {...props} />
  ),
  td: ({ node: _n, style, className, ...props }: Html<"td">) => (
    <TableCell dir="auto" className={cn("h-auto whitespace-normal py-2 text-start", cellAlign(style), className)} {...props} />
  ),
  input: ({ node: _n, className, ...props }: Html<"input">) => (
    <input {...props} disabled className={cn("me-2 align-middle accent-[var(--nq-accent)]", className)} />
  ),
};

export interface MarkdownProps extends Omit<ComponentProps<"div">, "children"> {
  /** The Markdown source. GitHub-flavoured: tables, task lists, strikethrough, autolinks. */
  children: string;
  /** Replace or add element renderers. Merged over the Nasaq defaults. */
  components?: Components;
  /** Extra remark plugins, added after `remark-gfm`. */
  remarkPlugins?: Options["remarkPlugins"];
}

/**
 * Renders Markdown in Nasaq typography. Raw HTML in the source is dropped (never rendered), and unsafe URLs such as
 * `javascript:` are removed by react-markdown's default URL transform, so it is safe for model or user text.
 * Every block has `dir="auto"`, so an Arabic paragraph between English ones orients itself.
 */
export function Markdown({ children, components, remarkPlugins, className, ...props }: MarkdownProps) {
  return (
    <div data-slot="markdown" className={cn("flex min-w-0 flex-col gap-3 text-body text-nq-fg-body", className)} {...props}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, ...(remarkPlugins ?? [])]}
        components={{ ...defaultComponents, ...components }}
        skipHtml
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
