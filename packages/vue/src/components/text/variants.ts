export type TextRole = "display" | "h1" | "h2" | "h3" | "body" | "body-sm" | "label" | "caption" | "eyebrow" | "code";

// Same classes as the React Text (packages/web/src/components/text/text.tsx).
export const roleClass: Record<TextRole, string> = {
  display: "text-display text-foreground",
  h1: "text-h1 text-foreground",
  h2: "text-h2 text-foreground",
  h3: "text-h3 text-foreground",
  body: "text-body text-nq-fg-body",
  "body-sm": "text-body-sm text-nq-fg-body",
  label: "text-label text-foreground",
  caption: "text-caption text-muted-foreground",
  eyebrow: "eyebrow",
  code: "font-mono text-code",
};

export const defaultElement: Record<TextRole, string> = {
  display: "h1",
  h1: "h1",
  h2: "h2",
  h3: "h3",
  body: "p",
  "body-sm": "p",
  label: "span",
  caption: "span",
  eyebrow: "span",
  code: "code",
};
