import { BedDouble, CalendarClock, CalendarHeart, CircleAlert, CircleCheck, CircleDot, CircleMinus, CircleX, Clock, Coffee, Droplets, Pill, Timer, Utensils } from "lucide-vue-next";
import type { Component } from "vue";
import type { StatusTone } from "../status";
import type { EngineId } from "./health-engines";

/** The glyph for each engine. Decorative: the title names the engine. */
export const ENGINE_ICONS: Record<EngineId, Component> = {
  hydration: Droplets,
  caffeine: Coffee,
  gerd: BedDouble,
  medication: Pill,
  triggers: Utensils,
  cycle: CalendarHeart,
  contraceptive: CalendarClock,
};

/** Each tone has its own shape, so state never depends on colour alone. */
export const TONE_ICON: Record<StatusTone, Component> = { neutral: CircleMinus, info: CircleDot, success: CircleCheck, warning: CircleAlert, danger: CircleX };

export const DOSE_ICON: Record<string, Component> = { scheduled: Clock, grace_open: Timer, logged: CircleCheck, late_logged: CircleAlert, missed: CircleMinus };
