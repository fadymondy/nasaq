export interface FileNode {
  id: string;
  name: string;
  kind: "file" | "folder";
  /** Bytes. */
  size?: number;
  modifiedAt?: Date | number | string;
  mime?: string;
  /** Folder contents. A folder without `children` shows as empty. */
  children?: FileNode[];
  /** An image URL used for the grid thumbnail and the preview. */
  previewUrl?: string;
  /** Text shown in the preview with syntax highlighting by extension (keep it short). */
  previewText?: string;
}

export type FileExplorerView = "list" | "grid";
export type FileResult = void | { error?: string };
