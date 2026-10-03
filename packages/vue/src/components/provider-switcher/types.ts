export interface ProviderOption {
  /** The backend id sent to `select`: "postgres", "redis", "s3". */
  id: string;
  /** Shown in the menu. Default the id. */
  label?: string;
  /** One line under the label in the menu. */
  description?: string;
  disabled?: boolean;
}

export interface ProviderCapability {
  /** The capability key: "data", "queue", "cache", "storage", "realtime". */
  capability: string;
  /** Human name. Default the key. */
  label?: string;
  /** What the capability does, under the name. */
  description?: string;
  /** The backend in use. */
  active: string;
  options: readonly (string | ProviderOption)[];
  /** True while `active` is the app's configured default, false once someone switched it. */
  isDefault?: boolean;
  /** Lock the row: the backend is pinned by config. */
  locked?: boolean;
}

export interface ProviderSwitcherLabels {
  capability: string;
  backend: string;
  isDefault: string;
  overridden: string;
  empty: string;
  choose: (capability: string) => string;
}
