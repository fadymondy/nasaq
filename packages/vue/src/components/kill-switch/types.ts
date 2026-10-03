/** What a callback returns: nothing, or `{ error }` to show a message. */
export type KillSwitchResult = void | { error?: string };

/** Why and by whom everything was stopped. */
export interface PauseInfo {
  by: string;
  at: string | number | Date;
  reason: string;
}

export interface PairedBrowser {
  id: string;
  /** For example "Chrome on Windows". */
  name: string;
  /** Free text such as the profile or device. */
  device?: string;
  online: boolean;
  lastSeen?: string | number | Date;
  /** The browser you are using now. It cannot be unpaired from here. */
  current?: boolean;
}
