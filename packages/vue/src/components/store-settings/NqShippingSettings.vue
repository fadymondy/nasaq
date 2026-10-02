<script setup lang="ts">
import { MapPin, Pencil, Plus, Store, Trash2, Truck } from "lucide-vue-next";
import { ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqAlert } from "../alert";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardHeader, NqCardTitle } from "../card";
import { NqContextMenuActions, type ContextMenuAction } from "../context-menu";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqEmptyState, NqErrorState, NqSkeleton } from "../states";
import ShippingDestinationTester from "./ShippingDestinationTester.vue";
import ShippingPickupEditor from "./ShippingPickupEditor.vue";
import ShippingZoneEditor from "./ShippingZoneEditor.vue";
import StoreMoney from "./StoreMoney.vue";
import { overlappingCountries, type PickupLocation, type ShippingRate, type ShippingZone } from "./shipping-logic";
import { regionName, uid, type SettingsResult, type StoreSettingsLabels } from "./strings";
import { useAction, useSettingsStrings } from "./use-settings";

// Shipping zones and rates (flat, by weight, by price, free over a threshold) and local pickup points. A "try a
// destination" panel runs the same resolver checkout uses. Money is integer minor units, weight is grams.
const props = withDefaults(
  defineProps<{
    zones: readonly ShippingZone[];
    pickups?: readonly PickupLocation[];
    /** ISO 4217 code of the store. Defaults to USD, or SAR in Arabic. */
    currency?: string;
    /** Saves a new or changed zone with its rates. New zones arrive with a fresh `id`. Resolve `{ error }` to keep the editor open. */
    onSaveZone: (zone: ShippingZone) => Promise<SettingsResult>;
    onDeleteZone?: (zone: ShippingZone) => Promise<SettingsResult>;
    onSavePickup?: (pickup: PickupLocation) => Promise<SettingsResult>;
    onDeletePickup?: (pickup: PickupLocation) => Promise<SettingsResult>;
    loading?: boolean;
    error?: string;
    onRetry?: () => void;
    labels?: StoreSettingsLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { pickups: () => [], currency: undefined, onDeleteZone: undefined, onSavePickup: undefined, onDeletePickup: undefined, loading: false, error: undefined, onRetry: undefined, labels: undefined },
);

const currency = useCurrency(() => props.currency);
const { t, locale, n } = useSettingsStrings(() => props.labels);
const zone = ref<ShippingZone | null>(null);
const pickup = ref<PickupLocation | null>(null);
const deleting = ref<{ kind: "zone" | "pickup"; id: string; name: string } | null>(null);
const action = useAction(() => t.value.saveFailed);

const regionList = (codes: string[]) => codes.map((c) => (c === "*" ? t.value.restOfWorld : regionName(locale.value, c))).join(", ");
const overlapText = () => overlappingCountries(props.zones).map((c) => (c === "*" ? t.value.restOfWorld : regionName(locale.value, c))).join(", ");

function newZone() {
  action.error.value = null;
  zone.value = { id: uid("zone"), name: "", countries: [], rates: [] };
}
function newPickup() {
  action.error.value = null;
  pickup.value = { id: uid("pickup"), name: "", address: "", country: "EG", active: true };
}
function editZone(z: ShippingZone) {
  action.error.value = null;
  zone.value = z;
}
function editPickup(p: PickupLocation) {
  action.error.value = null;
  pickup.value = p;
}
function ask(kind: "zone" | "pickup", id: string, name: string) {
  action.error.value = null;
  deleting.value = { kind, id, name };
}
function zoneActions(z: ShippingZone): ContextMenuAction[] {
  const tt = t.value;
  return [
    { id: "edit", label: tt.edit, icon: Pencil, onSelect: () => editZone(z) },
    ...(props.onDeleteZone ? [{ id: "delete", label: tt.delete, icon: Trash2, danger: true, group: "danger", onSelect: () => ask("zone", z.id, z.name) }] : []),
  ];
}
function pickupActions(p: PickupLocation): ContextMenuAction[] {
  const tt = t.value;
  return [
    ...(props.onSavePickup ? [{ id: "edit", label: tt.edit, icon: Pencil, onSelect: () => editPickup(p) }] : []),
    ...(props.onDeletePickup ? [{ id: "delete", label: tt.delete, icon: Trash2, danger: true, group: "danger", onSelect: () => ask("pickup", p.id, p.name) }] : []),
  ];
}
async function saveZone(z: ShippingZone) {
  if (await action.run(() => props.onSaveZone(z))) zone.value = null;
}
async function savePickup(p: PickupLocation) {
  const save = props.onSavePickup;
  if (save && (await action.run(() => save(p)))) pickup.value = null;
}
async function confirmDelete() {
  const target = deleting.value;
  if (!target) return;
  let job: (() => Promise<SettingsResult>) | null = null;
  if (target.kind === "zone") {
    const z = props.zones.find((x) => x.id === target.id);
    const del = props.onDeleteZone;
    if (z && del) job = () => del(z);
  } else {
    const p = props.pickups.find((x) => x.id === target.id);
    const del = props.onDeletePickup;
    if (p && del) job = () => del(p);
  }
  if (job && (await action.run(job))) deleting.value = null;
}
function rateFree(r: ShippingRate) {
  return (r.amount ?? 0) === 0;
}
</script>

<template>
  <NqErrorState v-if="props.error" :title="t.loadFailed" :description="props.error">
    <template v-if="props.onRetry" #actions>
      <NqButton size="sm" variant="secondary" @click="props.onRetry()">{{ locale.startsWith("ar") ? "إعادة المحاولة" : "Try again" }}</NqButton>
    </template>
  </NqErrorState>
  <div v-else-if="props.loading" aria-busy="true" class="grid gap-3">
    <NqSkeleton class="h-32 w-full" />
    <NqSkeleton class="h-32 w-full" />
  </div>
  <section v-else data-slot="shipping-settings" :aria-label="t.shipping" :class="cn('flex min-w-0 flex-col gap-4', props.class)">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-h3 text-foreground">{{ t.zones }}</h2>
      <NqButton variant="primary" @click="newZone">
        <Plus aria-hidden="true" />
        {{ t.addZone }}
      </NqButton>
    </div>

    <NqAlert v-if="overlappingCountries(props.zones).length > 0" tone="warning" :title="t.overlapTitle">{{ t.overlapBody(overlapText()) }}</NqAlert>
    <p v-if="action.error.value && !zone && !pickup && !deleting" role="alert" class="text-body-sm text-nq-danger-text">{{ action.error.value }}</p>

    <NqEmptyState v-if="props.zones.length === 0" :icon="Truck" :title="t.zonesEmpty" :description="t.zonesEmptyHint">
      <template #actions>
        <NqButton @click="newZone">{{ t.addZone }}</NqButton>
      </template>
    </NqEmptyState>
    <ul v-else class="grid gap-3 lg:grid-cols-2">
      <li v-for="z in props.zones" :key="z.id" class="min-w-0">
        <NqContextMenuActions :actions="zoneActions(z)" class="h-full rounded-card">
          <NqCard class="h-full w-full">
            <NqCardHeader>
              <NqCardTitle as="h3" class="flex min-w-0 items-center justify-between gap-2">
                <span class="truncate">{{ z.name }}</span>
                <NqButton size="sm" variant="secondary" @click="editZone(z)">
                  <Pencil aria-hidden="true" />
                  {{ t.edit }}
                </NqButton>
              </NqCardTitle>
            </NqCardHeader>
            <NqCardContent class="grid gap-3">
              <p class="flex items-start gap-2 text-body-sm text-muted-foreground">
                <MapPin aria-hidden="true" class="mt-0.5 size-4 shrink-0" />
                <span class="min-w-0">{{ regionList(z.countries) }}{{ z.cities?.length ? ` · ${z.cities.join(", ")}` : "" }}</span>
              </p>
              <p v-if="z.rates.length === 0" class="text-body-sm text-muted-foreground">{{ t.noRates }}</p>
              <ul v-else class="grid gap-1.5">
                <li v-for="r in z.rates" :key="r.id" class="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-control border border-border px-2.5 py-1.5 text-body-sm">
                  <span class="flex min-w-0 items-center gap-2">
                    <span class="truncate font-medium text-foreground">{{ r.label }}</span>
                    <NqBadge variant="neutral">{{ t.rateTypes[r.type] }}</NqBadge>
                    <NqBadge v-if="r.express" variant="accent">{{ t.express }}</NqBadge>
                    <NqBadge v-if="r.active === false" variant="outline">{{ t.off }}</NqBadge>
                  </span>
                  <span class="flex items-center gap-2">
                    <span v-if="r.etaDays" class="text-caption text-muted-foreground">{{ t.etaDays(r.etaDays[0], r.etaDays[1]) }}</span>
                    <span class="font-medium text-foreground">
                      <template v-if="r.type === 'flat'">
                        <template v-if="rateFree(r)">{{ t.free }}</template>
                        <StoreMoney v-else :minor="r.amount ?? 0" :currency="currency" />
                      </template>
                      <span v-else-if="r.type === 'free-over'">{{ t.freeOver }} <StoreMoney :minor="r.freeOver ?? 0" :currency="currency" /></span>
                      <template v-else>{{ t.tiersCount(String(r.tiers?.length ?? 0)) }}</template>
                    </span>
                  </span>
                </li>
              </ul>
            </NqCardContent>
          </NqCard>
        </NqContextMenuActions>
      </li>
    </ul>

    <div class="flex flex-wrap items-center justify-between gap-2 pt-2">
      <h2 class="text-h3 text-foreground">{{ t.pickup }}</h2>
      <NqButton v-if="props.onSavePickup" variant="secondary" @click="newPickup">
        <Plus aria-hidden="true" />
        {{ t.addPickup }}
      </NqButton>
    </div>
    <NqEmptyState v-if="props.pickups.length === 0" :icon="Store" :title="t.pickupEmpty" :description="t.pickupEmptyHint" class="border-dashed" />
    <ul v-else class="grid gap-3 lg:grid-cols-2">
      <li v-for="p in props.pickups" :key="p.id" class="min-w-0">
        <NqContextMenuActions :actions="pickupActions(p)" class="h-full rounded-card">
          <NqCard class="h-full w-full">
            <NqCardContent class="flex min-w-0 items-start justify-between gap-3 pt-4">
              <div class="grid min-w-0 gap-0.5">
                <p class="flex items-center gap-2 font-medium text-foreground">
                  <span class="truncate">{{ p.name }}</span>
                  <NqBadge v-if="p.active === false" variant="outline">{{ t.off }}</NqBadge>
                </p>
                <p class="text-body-sm text-muted-foreground">{{ p.address }}</p>
                <p class="text-caption text-muted-foreground">{{ regionName(locale, p.country) }}{{ p.city ? ` · ${p.city}` : "" }}{{ p.readyInHours !== undefined ? ` · ${t.readyIn(n(p.readyInHours))}` : "" }}</p>
              </div>
              <div class="shrink-0 text-body-sm font-medium text-foreground">
                <template v-if="(p.fee ?? 0) === 0">{{ t.free }}</template>
                <StoreMoney v-else :minor="p.fee ?? 0" :currency="currency" />
              </div>
            </NqCardContent>
          </NqCard>
        </NqContextMenuActions>
      </li>
    </ul>

    <ShippingDestinationTester :zones="props.zones" :pickups="props.pickups" :currency="currency" :labels="props.labels" />

    <ShippingZoneEditor v-if="zone" :key="zone.id" :zone="zone" :is-new="!props.zones.some((z) => z.id === zone?.id)" :currency="currency" :busy="action.busy.value" :error="action.error.value" :labels="props.labels" @cancel="zone = null" @save="saveZone" />
    <ShippingPickupEditor v-if="pickup && props.onSavePickup" :key="pickup.id" :pickup="pickup" :is-new="!props.pickups.some((p) => p.id === pickup?.id)" :currency="currency" :busy="action.busy.value" :error="action.error.value" :labels="props.labels" @cancel="pickup = null" @save="savePickup" />

    <NqDialog :open="deleting !== null" @update:open="(o: boolean) => !o && !action.busy.value && (deleting = null)">
      <NqDialogContent>
        <NqDialogHeader>
          <NqDialogTitle>{{ deleting?.kind === "pickup" ? t.deletePickupTitle : t.deleteZoneTitle }}</NqDialogTitle>
          <NqDialogDescription>{{ t.deleteBody(deleting?.name ?? "") }}</NqDialogDescription>
        </NqDialogHeader>
        <p v-if="action.error.value" role="alert" class="text-body-sm text-nq-danger-text">{{ action.error.value }}</p>
        <NqDialogFooter>
          <NqButton variant="ghost" @click="deleting = null">{{ t.cancel }}</NqButton>
          <NqButton variant="danger" :loading="action.busy.value" @click="confirmDelete">{{ t.delete }}</NqButton>
        </NqDialogFooter>
      </NqDialogContent>
    </NqDialog>
  </section>
</template>
