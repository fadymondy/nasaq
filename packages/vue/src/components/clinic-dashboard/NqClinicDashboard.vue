<script setup lang="ts">
import { BedDouble, Clock, DoorClosed, DoorOpen, Sparkles, Stethoscope, Users } from "lucide-vue-next";
import { computed, type Component, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqAvatar } from "../avatar";
import { NqBadge } from "../badge";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { NqNum } from "../numeric";
import { NqProgress } from "../progress";
import { NqStatCard, NqStatGrid } from "../stat-card";
import { NqQueueLiveIndicator, useQueueNow, type QueueConnection } from "../waiting-screen";
import { busyMinutes, doctorsOnDuty, roomCounts, roomOccupancy, waitingFigures, type ClinicDoctor, type ClinicDoctorStatus, type ClinicRoom, type ClinicRoomStatus } from "./clinic-math";
import { useClinicDashboardLabels, type ClinicDashboardLabels } from "./strings";

// The clinic at a glance for the front desk: waiting count and longest wait, doctors on duty, room use, then a card per room and a row per
// doctor. Every state has an icon and a word, never colour alone. Read only; selecting a room or a doctor calls back.
const props = withDefaults(
  defineProps<{
    rooms: readonly ClinicRoom[];
    doctors: readonly ClinicDoctor[];
    /** When each waiting patient joined the queue (epoch ms). */
    queuedAt: readonly number[];
    connection?: QueueConnection;
    updatedAt?: number;
    /** Called when a room card is used. */
    onRoomSelect?: (room: ClinicRoom) => void;
    /** Called when a doctor row is used. */
    onDoctorSelect?: (doctor: ClinicDoctor) => void;
    /** Overrides the clock (epoch ms) for examples and tests. */
    now?: number;
    labels?: Partial<ClinicDashboardLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { connection: "live", updatedAt: undefined, onRoomSelect: undefined, onDoctorSelect: undefined, now: undefined, labels: undefined },
);

const ROOM_STYLE: Record<ClinicRoomStatus, { icon: Component; badge: "success" | "warning" | "neutral" | "info" }> = {
  free: { icon: DoorOpen, badge: "success" },
  busy: { icon: BedDouble, badge: "warning" },
  cleaning: { icon: Sparkles, badge: "info" },
  closed: { icon: DoorClosed, badge: "neutral" },
};
const DOCTOR_BADGE: Record<ClinicDoctorStatus, "success" | "warning" | "neutral" | "info"> = { available: "success", in_visit: "warning", break: "info", off: "neutral" };

const t = useClinicDashboardLabels(() => props.labels);
const clock = useQueueNow(() => props.now);
const figures = computed(() => waitingFigures(props.queuedAt, clock.value));
const duty = computed(() => doctorsOnDuty(props.doctors, new Date(clock.value)));
const counts = computed(() => roomCounts(props.rooms));
const occupancy = computed(() => Math.round(roomOccupancy(props.rooms) * 100));
const doctorOf = (r: ClinicRoom) => props.doctors.find((d) => d.id === r.doctorId);
const roomOf = (d: ClinicDoctor) => props.rooms.find((r) => r.id === d.roomId);
</script>

<template>
  <div data-slot="clinic-dashboard" :class="cn('flex flex-col gap-4', props.class)">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-h3">{{ t.title }}</h2>
      <NqQueueLiveIndicator :connection="connection" :updated-at="updatedAt" :now="now" />
    </div>

    <NqStatGrid>
      <NqStatCard :label="t.waiting" :value="figures.waiting" :delta-label="figures.waiting > 0 ? t.average(figures.averageMinutes) : undefined">
        <template #icon><Users /></template>
      </NqStatCard>
      <NqStatCard :label="t.longest">
        <template #icon><Clock /></template>
        <template #value><span class="tabular-nums">{{ t.minutes(figures.longestMinutes) }}</span></template>
      </NqStatCard>
      <NqStatCard :label="t.onDuty" :value="duty.length" :delta-label="t.ofTotal(doctors.length)">
        <template #icon><Stethoscope /></template>
      </NqStatCard>
      <NqStatCard :label="t.occupancy" :delta-label="t.roomsHint(counts.free, counts.busy)">
        <template #icon><BedDouble /></template>
        <template #value><span class="tabular-nums">{{ occupancy }}%</span></template>
      </NqStatCard>
    </NqStatGrid>

    <section :aria-label="t.rooms" class="flex flex-col gap-2">
      <h3 class="text-label">{{ t.rooms }}</h3>
      <p v-if="rooms.length === 0" class="text-body-sm text-muted-foreground">{{ t.noRooms }}</p>
      <ul v-else class="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3 p-0">
        <li v-for="r in rooms" :key="r.id">
          <component
            :is="onRoomSelect ? 'button' : 'div'"
            data-slot="clinic-room"
            :data-status="r.status"
            :type="onRoomSelect ? 'button' : undefined"
            :class="
              onRoomSelect
                ? 'flex w-full flex-col gap-1.5 rounded-card border border-border bg-card p-3 text-start outline-none transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-nq-focus'
                : 'flex flex-col gap-1.5 rounded-card border border-border bg-card p-3'
            "
            @click="onRoomSelect?.(r)"
          >
            <span class="flex items-center justify-between gap-2">
              <span class="text-label">{{ r.name }}</span>
              <NqBadge :variant="ROOM_STYLE[r.status].badge">
                <component :is="ROOM_STYLE[r.status].icon" aria-hidden="true" class="size-3" />
                {{ t.room[r.status] }}
              </NqBadge>
            </span>
            <span v-if="doctorOf(r)" class="text-caption text-muted-foreground">{{ doctorOf(r)!.name }}</span>
            <span v-if="r.status === 'busy'" class="flex items-center gap-2 text-caption text-muted-foreground">
              <bdi v-if="r.ticket" dir="ltr" class="font-mono font-semibold tabular-nums text-foreground">{{ r.ticket }}</bdi>
              <span class="tabular-nums">{{ t.since(busyMinutes(r, clock)) }}</span>
            </span>
          </component>
        </li>
      </ul>
      <NqProgress v-if="rooms.length > 0" :value="occupancy" :aria-label="t.occupancy" class="mt-1" />
    </section>

    <NqCard data-slot="clinic-doctors">
      <NqCardHeader>
        <NqCardTitle as="h3">{{ t.doctors }}</NqCardTitle>
        <NqCardDescription>
          <NqNum :value="duty.length" /> {{ t.ofTotal(doctors.length) }}
        </NqCardDescription>
      </NqCardHeader>
      <NqCardContent>
        <p v-if="duty.length === 0" class="text-body-sm text-muted-foreground">{{ t.noDoctors }}</p>
        <ul v-else class="m-0 flex list-none flex-col divide-y divide-border p-0">
          <li v-for="d in duty" :key="d.id">
            <component
              :is="onDoctorSelect ? 'button' : 'div'"
              data-slot="clinic-doctor"
              :type="onDoctorSelect ? 'button' : undefined"
              :class="
                onDoctorSelect
                  ? 'flex w-full items-center gap-3 rounded-control py-2.5 text-start outline-none hover:bg-accent focus-visible:outline-2 focus-visible:outline-nq-focus'
                  : 'flex items-center gap-3 py-2.5'
              "
              @click="onDoctorSelect?.(d)"
            >
              <NqAvatar :name="d.name" :src="d.avatar" />
              <span class="min-w-0 flex-1">
                <span class="block truncate text-label">{{ d.name }}</span>
                <span class="block truncate text-caption text-muted-foreground">
                  {{ d.specialty }}{{ roomOf(d) ? ` · ${roomOf(d)!.name}` : "" }}
                  <template v-if="d.shift">
                    {{ " · " }}<bdi dir="ltr" class="tabular-nums">{{ d.shift.start }} - {{ d.shift.end }}</bdi>
                  </template>
                </span>
              </span>
              <span class="flex flex-col items-end gap-1">
                <NqBadge :variant="DOCTOR_BADGE[d.status]">{{ t.doctor[d.status] }}</NqBadge>
                <span class="text-caption text-muted-foreground">{{ t.waitingFor(d.waiting) }}</span>
              </span>
            </component>
          </li>
        </ul>
      </NqCardContent>
    </NqCard>
    <slot />
  </div>
</template>
