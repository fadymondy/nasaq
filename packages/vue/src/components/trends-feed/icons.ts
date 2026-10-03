import { Bookmark, CheckCheck, EyeOff, RotateCcw } from "lucide-vue-next";
import type { TrendAction } from "./trends-feed-math";

export const ACTION_ICONS = { save: Bookmark, review: CheckCheck, dismiss: EyeOff, restore: RotateCcw } as const satisfies Record<TrendAction, unknown>;
