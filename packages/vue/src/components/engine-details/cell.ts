// Each verdict has its own shape and fill as well as its own hue: a solid square for on protocol, a striped
// square for off protocol and a hollow dashed circle for a day the engine declined to judge. Copied from the React history-strip.
import type { DayVerdict } from "../engine-card/health-engines";

export const CELL: Record<DayVerdict, string> = {
  on_protocol: "rounded-[3px] border border-nq-success bg-nq-success",
  off_protocol: "rounded-[3px] border border-nq-danger bg-[repeating-linear-gradient(45deg,var(--nq-danger)_0_2px,transparent_2px_5px)]",
  unevaluated: "rounded-full border border-dashed border-muted-foreground bg-transparent",
};

export const GLYPH_TONE: Record<DayVerdict, string> = { on_protocol: "text-nq-success-text", off_protocol: "text-nq-danger-text", unevaluated: "text-muted-foreground" };
