---
name: avatar-upload
title: AvatarUpload
category: account
status: beta
summary: A profile photo with change, remove and a square crop editor (drag or arrow keys to pan, slider or +/- to zoom) drawn on a canvas. Pick by click, drop or paste. It hands your async callback a cropped File.
exports: [AvatarUpload, AvatarOutputType, AvatarUploadControls, AvatarUploadProps]
related: [avatar, file-upload, slider, progress, button]
story: components-account-avatar-upload
base-ui: [slider]
keywords: [avatar, photo, profile, picture, crop, upload, zoom, drag, drop, paste, canvas]
---

# AvatarUpload

Shows the current photo (or initials), lets the user pick a new one by clicking, dropping or pasting, then
frames it in a square window before saving. The export is a real `File` of a fixed size and type, so you can
send it as is. Nasaq sends nothing: `onChange` and `onRemove` are your async callbacks.

## When to use

- The photo section of a profile or account page.
- Any place where a square, fixed-size picture must come out of an arbitrary photo.

## When not to use

- Attachments or documents: use [`FileUpload`](../file-upload/README.md).
- A plain image with no cropping: use `ImageUpload` from the same file-upload page.

## Import

```tsx
import { AvatarUpload } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<AvatarUpload
  name="Sara Alharbi"
  src={user.avatarUrl}
  outputSize={256}
  onChange={async (file, { onProgress }) => {
    await upload(file, onProgress); // your request; resolve when saved
    await refreshUser();
  }}
  onRemove={async () => {
    await api.removeAvatar();
    await refreshUser();
  }}
/>
```

## Anatomy

```
AvatarUpload                   data-slot="avatar-upload"  
├─ idle: Avatar button, Upload / Change, Remove, hint
└─ editing
   ├─ crop window              data-slot="avatar-upload-viewport"  (role="group", dir="ltr")
   ├─ zoom out, Slider, zoom in
   ├─ Progress                 while saving
   └─ Cancel, Save
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `name` | `string` | required | Alt text and the source of the initials. |
| `src` | `string` | none | The saved photo. Update it after `onChange` resolves. |
| `onChange` | `(file: File, controls: AvatarUploadControls) => Promise<void>` | required | The cropped image. Reject to keep the editor open and show the message. |
| `onRemove` | `() => Promise<void>` | none | Shows the Remove button. Reject to show an error. |
| `accept` | `string` | `"image/png,image/jpeg,image/webp"` | Native syntax. |
| `maxSize` | `number` | 5 MB | Largest file the user may pick, in bytes. |
| `outputSize` | `number` | `256` | Edge of the exported square. Never upscaled past the source. |
| `outputType` | `"image/webp" \| "image/png" \| "image/jpeg"` | `"image/webp"` | Export format. |
| `quality` | `number` | `0.9` | 0 to 1, for webp and jpeg. |
| `shape` | `"circle" \| "square"` | `"circle"` | Preview and crop mask. The file is always square. |
| `maxZoom` | `number` | `4` | Largest zoom. |
| `disabled` | `boolean` | `false` | |
| `labels` | `Partial<Labels>` | en / ar | Override any string. |

`AvatarUploadControls` is `{ onProgress: (percent: number) => void }`.

## Examples

- **Square shape for a workspace logo**: `shape="square"`.
- **Small PNG**: `outputSize={128} outputType="image/png"`.
- **Progress**: call `onProgress(percent)` from an XHR `upload.onprogress`.

## Accessibility

| Key | Action |
| --- | --- |
| Arrow keys | Pan the crop window. |
| `+` / `-` | Zoom in / out. |
| Tab | From the window to the zoom controls, then Cancel and Save. |

- The crop window is focusable with an accessible name and instructions; the zoom Slider is labelled.
- Validation errors, save results and removal are announced through a live region.
- Pasting an image while the component has focus works the same as choosing a file.

## RTL & i18n

- Strings follow the Nasaq locale in English and Arabic; override with `labels`.
- The crop window is always `dir="ltr"`, so dragging and arrow keys move the picture physically in both directions.
- Sizes use Western digits.

## Styling & tokens

Uses `Avatar`, `Slider`, `Progress` and `Button` tokens plus `border-nq-focus`, `bg-nq-hover`, `text-nq-danger-text`. Extend with `className`; never hard-code colours.

## Do / Don't

- Do validate and re-encode on the server: the client crop is a convenience.
- Do update `src` after saving so the new photo appears.
- Do not put a huge `outputSize` here; 256 to 512 is plenty for an avatar.
- Do not send the original file; the callback already receives the cropped one.

## Related

- [Avatar](../avatar/README.md)
- [FileUpload](../file-upload/README.md)
- [Slider](../slider/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-account-avatar-upload--docs
