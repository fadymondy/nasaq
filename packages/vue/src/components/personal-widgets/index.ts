export { default as NqAvailabilityBadge } from "./NqAvailabilityBadge.vue";
export { default as NqLocalClock } from "./NqLocalClock.vue";
export { default as NqSocialLinks } from "./NqSocialLinks.vue";
export { default as NqNowWidget } from "./NqNowWidget.vue";
export { default as NqStatsWidget } from "./NqStatsWidget.vue";
export { default as NqSkillsWidget } from "./NqSkillsWidget.vue";
export { default as NqWeatherWidget } from "./NqWeatherWidget.vue";
export {
  distinct,
  groupSkills,
  isKnownTimeZone,
  isWorkingNow,
  offsetHours,
  partsIn,
  tenureBetween,
  totalExperience,
  type ProfileAvailability,
  type ProfileWorkingHours,
  type Role,
  type SkillLike,
  type Tenure,
} from "./personal-model";
export type { NowItem, ProfileStat, Skill, SocialLink, WeatherCondition } from "./types";
export type { PersonalWidgetLabels } from "./strings";
