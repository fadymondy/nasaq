---
name: file-upload
title: FileUpload
category: files
status: beta
summary: Dropzone with type, size and count validation, a file list with per-file progress, remove and retry, and a single-image upload with a thumbnail. You run the upload; it holds the state.
exports: [FileUpload, Dropzone, UploadList, UploadListItem, ImageUpload, useObjectUrl, formatFileSize, matchesAccept, UploadFile, UploadStatus, FileUploadControls, FileUploadProps, DropzoneProps, FileRejection, RejectionCode, FileRules, UploadListProps, UploadListItemProps, ImageUploadProps]
related: [progress, button, field, alert]
story: components-files-file-upload
base-ui: []
keywords: [upload, file, dropzone, drag, drop, image, avatar, attachment, progress]
---

# FileUpload

Choose files by clicking, pressing a key or dragging them in, see each one with its size and progress, and
remove or retry it. Nasaq does not send anything: your `onFiles` callback starts the request and reports
progress by patching the file's state, so it works with any transport (fetch, XHR, a presigned URL, tus).

## When to use

- Attachments, documents, imports: `FileUpload`.
- A profile or product picture: `ImageUpload`.
- Your own list or layout: `Dropzone` alone.

## When not to use

- Picking one value from a list: use [`Select`](../select/README.md).
- Showing progress of something that is not a file: use [`Progress`](../progress/README.md).

## Import

```tsx
import { FileUpload, ImageUpload, Dropzone } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { FileUpload, type FileUploadControls, type UploadFile } from "@fadymondy/nasaq/web";

function send(item: UploadFile, controls: FileUploadControls) {
  const body = new FormData();
  body.append("file", item.file);
  const xhr = new XMLHttpRequest();
  xhr.open("POST", "/api/files");
  xhr.upload.onprogress = (e) =>
    controls.update(item.id, { status: "uploading", progress: Math.round((e.loaded / e.total) * 100) });
  xhr.onload = () =>
    controls.update(item.id, xhr.status < 300 ? { status: "done", progress: 100 } : { status: "error", error: "Upload failed" });
  xhr.onerror = () => controls.update(item.id, { status: "error", error: "Network error" });
  xhr.send(body);
}

export function Attachments() {
  return (
    <FileUpload
      accept="image/*,.pdf"
      maxSize={5 * 1024 * 1024}
      maxFiles={4}
      onFiles={(added, controls) => added.forEach((f) => send(f, controls))}
      onRetry={send}
    />
  );
}
```

## Anatomy

```
FileUpload                     data-slot="file-upload"
├─ Dropzone                    data-slot="dropzone"  (data-dragging, data-invalid, data-disabled)
├─ ul (rejections, role=alert) data-slot="file-upload-errors"
└─ UploadList                    data-slot="file-list"
   └─ UploadListItem             data-slot="file-list-item"  (data-status)
      └─ Progress              while pending or uploading

ImageUpload                    data-slot="image-upload"
├─ preview (img + remove)      data-slot="image-upload-preview"
└─ Dropzone
```

## API

### FileUpload

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `readonly UploadFile[]` | none | Controlled list. Omit for uncontrolled. |
| `defaultValue` | `readonly UploadFile[]` | `[]` | Initial list when uncontrolled. |
| `onValueChange` | `(files: UploadFile[]) => void` | none | Fires on every list change, including progress patches. |
| `onFiles` | `(added: UploadFile[], controls: FileUploadControls) => void` | none | New, validated files (status `"pending"`). Start the upload here. |
| `onRetry` | `(item: UploadFile, controls: FileUploadControls) => void` | none | The retry button of a failed file was pressed. |
| `onRemove` | `(item: UploadFile) => void` | none | After removal. Cancel the request here. |
| `accept` | `string` | none | Native syntax: `"image/*,.pdf"`. |
| `maxSize` | `number` | none | Largest file in bytes. |
| `maxFiles` | `number` | none | Largest total number of files, counting those already in the list. |
| `multiple` | `boolean` | `true` | Allow several files per pick. |
| `disabled` | `boolean` | `false` | |
| `children` | `ReactNode` | localised prompt | Replaces the prompt text. Localise it yourself. |

### FileUploadControls

| Member | Type | Description |
| --- | --- | --- |
| `update` | `(id: string, patch: Partial<Omit<UploadFile, "id" \| "file">>) => void` | Patch `status`, `progress` or `error` of one file. |
| `remove` | `(id: string) => void` | Drop a file from the list. |

### UploadFile

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` | Stable key. |
| `file` | `File` | |
| `status` | `"pending" \| "uploading" \| "done" \| "error"` | |
| `progress` | `number \| null` | 0 to 100. `null` shows an indeterminate bar. |
| `error` | `string` | Shown under the row when `status` is `"error"`. Localise it. |

### Dropzone

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `onFiles` | `(files: File[]) => void` | required | Files that passed validation. |
| `onReject` | `(rejections: FileRejection[]) => void` | none | Called after every pick or drop; empty when all passed. |
| `accept`, `maxSize`, `maxFiles` | | none | As above. |
| `count` | `number` | `0` | Files already added, so `maxFiles` counts them. |
| `multiple` | `boolean` | `true` | |
| `invalid` | `boolean` | `false` | Danger border. |
| `inputProps` | input props | none | For the hidden `<input type="file">`, for example `name`. |
| `children` | `ReactNode` | localised prompt | |

`FileRejection` is `{ file: File; code: "too-large" | "wrong-type" | "too-many"; message: string }` with a localised `message`.

### UploadList / UploadListItem

| Prop | Type | Description |
| --- | --- | --- |
| `items` (UploadList) | `readonly UploadFile[]` | Rows to render. Renders nothing when empty. |
| `item` (UploadListItem) | `UploadFile` | |
| `onRemove`, `onRetry` | `(item: UploadFile) => void` | Buttons show only when set. Retry shows only on errors. |

### ImageUpload

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `File \| null` | none | Controlled image. |
| `defaultValue` | `File \| null` | `null` | |
| `onValueChange` | `(file: File \| null) => void` | none | |
| `src` | `string` | none | Saved image URL shown until a file is chosen. |
| `onRemove` | `() => void` | none | The remove button was pressed (also for a saved `src`). |
| `accept` | `string` | `"image/*"` | |
| `maxSize` | `number` | none | Bytes. |
| `progress` | `number \| null` | none | Shows a bar over the thumbnail while below 100. |
| `alt` | `string` | `""` | Alt text of the preview. Localise it. |
| `disabled` | `boolean` | `false` | |

### Helpers

| Export | Signature | Description |
| --- | --- | --- |
| `useObjectUrl` | `(file: File \| Blob \| null \| undefined) => string \| null` | Object URL that is revoked when the file changes or the component unmounts. |
| `formatFileSize` | `(bytes: number, locale?: string) => string` | `"1.5 MB"`, or Arabic units in Arabic. |
| `matchesAccept` | `(file: { name, type }, accept?: string) => boolean` | The `accept` matcher. |

## Examples

Controlled, with a saved avatar:

```tsx
import { ImageUpload } from "@fadymondy/nasaq/web";
import { useState } from "react";

export function Avatar() {
  const [file, setFile] = useState<File | null>(null);
  return (
    <ImageUpload value={file} onValueChange={setFile} src="/avatars/current.png" alt="Profile picture" maxSize={2 * 1024 * 1024} />
  );
}
```

Arabic copy for your own errors:

```tsx
controls.update(item.id, { status: "error", error: "انقطع الاتصال أثناء الرفع." });
```

## Accessibility

| Key | Action |
| --- | --- |
| Tab | Moves to the dropzone, then to each row's buttons. |
| Enter, Space | On the dropzone: opens the file dialog. |

- The dropzone is `role="button"` and described by the accepted types and size limit.
- Rejections render in a `role="alert"` list, so they are announced.
- Every row button is named with the file name ("Remove report.pdf"). Each Progress is named "report.pdf · Uploading".
- You localise: `alt` on `ImageUpload`, `children` prompts and the `error` text you set.

## RTL & i18n

- Built-in strings (prompt, statuses, limits, validation messages, size units) follow the Nasaq locale in English and Arabic.
- Sizes use Nasaq number formatting (Western digits by default). File names are wrapped in `<bdi>`, so an English name inside Arabic text keeps its order.
- The remove button on an image sits at the inline end and mirrors; progress fills from the inline start.

## Styling & tokens

Uses `border-input`, `bg-card`, `bg-nq-hover`, `bg-nq-selected`, `border-nq-focus` and `text-nq-danger-text`. Target `[data-dragging]`, `[data-invalid]`, `[data-disabled]` on the dropzone and `[data-status]` on rows. Extend with `className`; never override colours with raw hex.

## Do / Don't

- Do validate again on the server: `accept` and `maxSize` are conveniences, not security.
- Do give every failed file an `error` message that says what to do.
- Do not start uploads during render; start requests from `onFiles`.
- Do not revoke object URLs by hand; `useObjectUrl` does it.

## Related

- [Progress](../progress/README.md)
- [Button](../button/README.md)
- [Field](../field/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-files-file-upload--docs
