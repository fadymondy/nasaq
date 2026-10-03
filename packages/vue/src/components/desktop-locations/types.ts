export type DesktopLocationStatus = "ready" | "indexing" | "missing" | "not-directory" | "denied";

export interface DesktopLocationPermissions {
  /** List and read files. */
  read: boolean;
  /** Create and change files. */
  write: boolean;
  /** Include the folder in the local search index. */
  index: boolean;
}

export interface DesktopLocation {
  id: string;
  /** Absolute path on the user's computer. */
  path: string;
  /** A friendlier name. Defaults to the last segment of the path. */
  label?: string;
  status: DesktopLocationStatus;
  permissions: DesktopLocationPermissions;
  /** The default location: relative paths resolve against it. */
  primary?: boolean;
  fileCount?: number;
  indexedAt?: Date | number | string;
  addedAt?: Date | number | string;
}

export type LocationResult = void | { error?: string };
