import { CircleAlert, CircleCheck, CirclePause, Globe, Loader, Lock, Users } from "lucide-vue-next";
import type { Component } from "vue";
import type { StatusTone } from "../status";
import type { BrainStatus, BrainVisibility } from "./types";

export const BRAIN_STATUS_VIEW: Record<BrainStatus, { tone: StatusTone; icon: Component }> = {
  ready: { tone: "success", icon: CircleCheck },
  indexing: { tone: "info", icon: Loader },
  paused: { tone: "neutral", icon: CirclePause },
  error: { tone: "danger", icon: CircleAlert },
};
export const BRAIN_STATUS_ORDER = Object.keys(BRAIN_STATUS_VIEW) as BrainStatus[];
export const BRAIN_VISIBILITY_VIEW: Record<BrainVisibility, Component> = { private: Lock, team: Users, public: Globe };
export const BRAIN_VISIBILITY_ORDER = Object.keys(BRAIN_VISIBILITY_VIEW) as BrainVisibility[];
