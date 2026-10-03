
/** Resolve nothing on success, or a failure to show. `fieldErrors.slug` marks the address as taken or invalid. */
export type WorkspaceSubmitResult = void | { error?: string; fieldErrors?: Partial<Record<"name" | "slug", string>> };

export interface WorkspaceValues {
  name: string;
  slug: string;
}

/** True or `{ available }` when the address is free. */
export type SlugCheck = boolean | { available: boolean; message?: string };

export interface WorkspaceListItem {
  id: string;
  name: string;
  /** The address, shown left-to-right under the name. */
  slug?: string;
  logo?: string;
  /** Your role label in it. */
  role?: string;
  members?: number;
  /** The one you are in now. */
  current?: boolean;
}

export type SlugState = { status: "idle" | "checking" | "available" | "taken" | "error"; message?: string };
