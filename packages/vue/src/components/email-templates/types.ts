import type { EmailDirection } from "./email-render";
import type { EmailTemplateCategory, EmailTemplateStatus } from "./strings";

export type { EmailTemplateCategory, EmailTemplateStatus };
export type EmailTemplateResult = void | { error?: string };

export interface EmailTemplate {
  id: string;
  name: string;
  category: EmailTemplateCategory;
  status: EmailTemplateStatus;
  subject: string;
  preheader?: string;
  /** HTML from the body editor. `{{variable}}` placeholders are allowed. */
  body: string;
  /** Text direction of the email itself. Default `"ltr"`. */
  dir?: EmailDirection;
  footer?: string;
  updatedAt?: Date | string | number;
}

export const CATEGORY_ORDER: EmailTemplateCategory[] = ["welcome", "transactional", "marketing", "notification"];

/** A blank template ready to edit. */
export function blankEmailTemplate(id: string, dir: EmailDirection = "ltr"): EmailTemplate {
  return { id, name: "", category: "transactional", status: "draft", subject: "", preheader: "", body: "<p></p>", dir };
}
