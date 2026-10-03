export type { ToolAccess } from "./format";
import type { ToolAccess } from "./format";

export interface ApiArg {
  name: string;
  /** `string`, `integer`, `boolean`, `string[]`, `object`. Shown left-to-right. */
  type: string;
  required?: boolean;
  description?: string;
  /** Shown left-to-right. */
  default?: string;
  /** Allowed values, when the argument is an enum. */
  values?: string[];
}

export interface ApiExample {
  title?: string;
  /** The request, usually JSON. */
  call: string;
  /** The response, usually JSON. */
  result: string;
  callLanguage?: string;
  resultLanguage?: string;
}

export interface ApiTool {
  id: string;
  /** The identifier callers use, e.g. `create_issue` or `POST /v1/issues`. Shown left-to-right. */
  name: string;
  summary: string;
  description?: string;
  /** Groups the catalog, e.g. "Issues". Localise it. */
  category?: string;
  /** The permission the caller's token needs, e.g. `issues:write`. */
  scope: string;
  /** The lowest role that may call it, e.g. "Member". Localise it. */
  minRole: string;
  /** Default `read`. */
  access?: ToolAccess;
  args?: ApiArg[];
  /** What comes back, in a sentence. */
  returns?: string;
  examples?: ApiExample[];
  deprecated?: boolean;
  since?: string;
}

export const accessVariant: Record<ToolAccess, "neutral" | "warning" | "danger"> = { read: "neutral", write: "warning", destructive: "danger" };
