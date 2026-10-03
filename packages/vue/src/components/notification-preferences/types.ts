import type { DestinationKind, NotificationDestination } from "./notification-rules";

export type NotificationSaveResult = void | { error?: string };
export type NotificationPushPermission = "default" | "granted" | "denied" | "unsupported";
export type NotificationSection = "matrix" | "quiet" | "limits" | "digest" | "destinations";
export type NotificationDestinationResult = void | { error?: string };
export type NotificationTestResult = { ok: boolean; message?: string };
export type NotificationAddValues = { kind: DestinationKind; target: string };
