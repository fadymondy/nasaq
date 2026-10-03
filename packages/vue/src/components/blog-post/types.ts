import type { BlogPostSummary } from "../blog-index/blog-model";

export interface BlogPostData extends BlogPostSummary {
  /** The article in Markdown. */
  body: string;
  /** When it was last edited. */
  updated?: string | number | Date;
}
