/*
 * Pure maths for the avatar crop. No DOM, so it can be tested with `node --test`.
 *
 * The crop is a square window over the image. It is described in source-image pixels, independent of how big
 * the on-screen window is: `zoom` (1 = the window is as large as the image's short side, so the image covers it)
 * and `cx`, `cy`, the source pixel under the window's centre. Panning and zooming keep the window inside the image.
 */

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

export interface CropState {
  zoom: number;
  cx: number;
  cy: number;
}

export interface CropRect {
  /** Left and top of the square in source pixels. */
  sx: number;
  sy: number;
  /** Side of the square in source pixels. */
  side: number;
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Side of the crop square, in source pixels, at a zoom. */
export function cropSide(width: number, height: number, zoom: number) {
  return Math.min(width, height) / clamp(zoom, MIN_ZOOM, MAX_ZOOM);
}

/** Forces zoom into range and the window inside the image. */
export function clampCrop(state: CropState, width: number, height: number, maxZoom = MAX_ZOOM): CropState {
  const zoom = clamp(Number.isFinite(state.zoom) ? state.zoom : MIN_ZOOM, MIN_ZOOM, maxZoom);
  const half = cropSide(width, height, zoom) / 2;
  return { zoom, cx: clamp(state.cx, half, width - half), cy: clamp(state.cy, half, height - half) };
}

/** The framing before the user touches anything: the largest centred square. */
export function initialCrop(width: number, height: number): CropState {
  return { zoom: MIN_ZOOM, cx: width / 2, cy: height / 2 };
}

/** Same centre, new zoom. */
export function zoomCrop(state: CropState, zoom: number, width: number, height: number, maxZoom = MAX_ZOOM): CropState {
  return clampCrop({ ...state, zoom }, width, height, maxZoom);
}

/**
 * Drag the image by `dx`, `dy`, given as fractions of the on-screen window's width (a 60px drag in a 240px
 * window is 0.25). Dragging right moves the picture right, so the window moves left across the source.
 */
export function panCrop(state: CropState, dx: number, dy: number, width: number, height: number, maxZoom = MAX_ZOOM): CropState {
  const side = cropSide(width, height, state.zoom);
  return clampCrop({ zoom: state.zoom, cx: state.cx - dx * side, cy: state.cy - dy * side }, width, height, maxZoom);
}

/** The square to copy out of the source image. */
export function cropRect(state: CropState, width: number, height: number): CropRect {
  const c = clampCrop(state, width, height);
  const side = cropSide(width, height, c.zoom);
  return { sx: c.cx - side / 2, sy: c.cy - side / 2, side };
}

/** Edge of the exported square: `target`, but never more than the source has (no upscaling). At least 1. */
export function outputSide(rect: Pick<CropRect, "side">, target: number) {
  return Math.max(1, Math.min(Math.round(target), Math.round(rect.side)));
}

/** CSS placement of the full image inside the window, in percent of the window: works at any window size. */
export function imagePlacement(state: CropState, width: number, height: number) {
  const side = cropSide(width, height, state.zoom);
  return {
    width: (width / side) * 100,
    height: (height / side) * 100,
    left: (0.5 - state.cx / side) * 100,
    top: (0.5 - state.cy / side) * 100,
  };
}

const EXTENSIONS: Record<string, string> = { "image/webp": "webp", "image/png": "png", "image/jpeg": "jpg" };

/** File extension for an exported image type. */
export function extensionFor(type: string) {
  return EXTENSIONS[type.toLowerCase()] ?? "png";
}

/** `name` with the extension of `type`: ("avatar", "image/webp") gives "avatar.webp". */
export function outputName(base: string, type: string) {
  return `${base.replace(/\.[a-z0-9]+$/i, "")}.${extensionFor(type)}`;
}
