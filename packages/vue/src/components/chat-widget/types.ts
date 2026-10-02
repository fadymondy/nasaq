export type { ChatWidgetLabels } from "./labels";

export interface WidgetMessage {
  id: string;
  /** `visitor` is the person using the site; `agent` a teammate; `bot` an automatic reply. */
  from: "visitor" | "agent" | "bot";
  text: string;
  at: Date | number | string;
  name?: string;
  avatar?: string;
  status?: "sending" | "sent" | "error";
  attachments?: { id: string; name: string; url?: string; kind: "image" | "file" }[];
}

export interface WidgetOfflineForm {
  name: string;
  email: string;
  message: string;
}

/** What `onSend` and `onOfflineSubmit` resolve with: `{ error }` keeps the text and shows the message. */
export type WidgetResult = void | { error?: string };
