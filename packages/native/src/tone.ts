import { alpha, type Tone } from "./logic";
import type { NasaqColors } from "./theme";

export interface ToneColors {
  /** Readable text and icon colour on the page ground or on `soft`. */
  text: string;
  /** Strong fill (buttons, bars). `onSolid` is the text on it. */
  solid: string;
  onSolid: string;
  /** Tinted background, and the line colour for outlines. */
  soft: string;
  border: string;
}

/** Token colours for a tone, so every component reads success, warning, danger and info the same way. */
export function toneColors(c: NasaqColors, tone: Tone): ToneColors {
  switch (tone) {
    case "success":
      return { text: c.successText, solid: c.successText, onSolid: c.onDanger, soft: alpha(c.success, 0.16), border: c.success };
    case "warning":
      return { text: c.warningText, solid: c.warning, onSolid: c.bg, soft: alpha(c.warning, 0.16), border: c.warning };
    case "danger":
      return { text: c.dangerText, solid: c.dangerSolid, onSolid: c.onDanger, soft: alpha(c.danger, 0.14), border: c.danger };
    case "info":
      return { text: c.infoText, solid: c.infoText, onSolid: c.onDanger, soft: alpha(c.info, 0.16), border: c.info };
    default:
      return { text: c.fgBody, solid: c.fg, onSolid: c.bg, soft: c.surfaceSoft, border: c.line };
  }
}
