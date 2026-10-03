<script setup lang="ts">
import { DEFAULT_PREFS, NqNotificationPreferences, type NotificationDestination, type NotificationKind, type NotificationPrefs } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const kinds: NotificationKind[] = [
  { id: "mention", label: "Mentions", description: "Someone mentions you.", group: "Activity" },
  { id: "comment", label: "Comments", description: "Replies to your comments.", group: "Activity" },
  { id: "security", label: "Security alerts", description: "Sign-ins and password changes.", group: "Account", locked: ["email"] },
  { id: "billing", label: "Billing", group: "Account" },
];

const prefs = ref<NotificationPrefs>({
  ...DEFAULT_PREFS,
  matrix: { mention: { email: true, push: true }, comment: { email: true }, billing: { email: true } },
  quietHours: { enabled: true, from: "22:00", to: "07:00" },
  dailyCap: 20,
  digest: { enabled: true, frequency: "weekly", time: "08:00", day: 1 },
});
const destinations = ref<NotificationDestination[]>([
  { id: "d1", kind: "email", target: "team@example.com", verified: true },
  { id: "d2", kind: "webhook", target: "https://hooks.example.com/nasaq" },
]);
// A fixed clock keeps the "Next digest" line stable.
const now = new Date(2026, 8, 29, 9, 0, 0);

async function save(next: NotificationPrefs) {
  prefs.value = next;
}
async function add({ kind, target }: { kind: "email" | "webhook"; target: string }) {
  destinations.value = [...destinations.value, { id: `d${destinations.value.length + 1}`, kind, target }];
}
async function remove(d: NotificationDestination) {
  destinations.value = destinations.value.filter((x) => x.id !== d.id);
}
async function test() {
  return { ok: true };
}
async function requestPush() {
  return "granted" as const;
}
</script>

<template>
  <NqNotificationPreferences
    :kinds="kinds"
    :value="prefs"
    :on-change="save"
    :now="now"
    push-permission="default"
    :on-request-push="requestPush"
    :unavailable="{ whatsapp: 'Add a WhatsApp number first' }"
    :destinations="destinations"
    :on-add-destination="add"
    :on-remove-destination="remove"
    :on-test-destination="test"
  />
</template>
