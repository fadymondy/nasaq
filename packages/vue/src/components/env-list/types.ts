/** What a callback returns: nothing on success, or a message to show. */
export type EnvResult = void | { error?: string };

export interface EnvEnvironment {
  id: string;
  label: string;
}

export interface EnvImportOptions {
  /** Replace the value of keys that already exist. */
  overwrite: boolean;
}
