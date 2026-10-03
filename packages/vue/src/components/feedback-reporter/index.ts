export { default as NqFeedbackFloatingLauncher } from "./NqFeedbackFloatingLauncher.vue";
export { default as NqFeedbackHub } from "./NqFeedbackHub.vue";
export { default as NqFeedbackLauncherConfigurator } from "./NqFeedbackLauncherConfigurator.vue";
export { default as NqShakeReportSheet } from "./NqShakeReportSheet.vue";
export { useShakeToReport } from "./useShakeToReport";
export type { ShakeToReportOptions } from "./useShakeToReport";
export { countByStatus, FEEDBACK_POSITIONS, FEEDBACK_SHAPES, feedbackInstallSnippet, filterHubIssues, isShake, motionDelta, moveLauncherSpot, normalizePosition, parseLauncherSpot, snapLauncherSpot, spotFromPosition } from "./feedback-reporter-utils";
export type { FeedbackHubIssue, FeedbackIssueStatus, FeedbackLauncherConfig, FeedbackLauncherPosition, FeedbackLauncherShape, FeedbackHubFilter, FeedbackLauncherSpot, FeedbackSnippetFormat } from "./feedback-reporter-utils";
export type { FeedbackReporterLabels } from "./strings";
