<script setup lang="ts">
import { ExternalLink, MapPin } from "lucide-vue-next";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { formatCoords, mapsUrl, type GeoPoint } from "./inbox-format";
import { useInboxLabels, type InboxLabels } from "./inbox-strings";

// A shared location inside a message: a pad with the pin, the label, the coordinates and a link to open it in maps.
const props = defineProps<{ point: GeoPoint; labels?: Partial<InboxLabels>; class?: HTMLAttributes["class"] }>();
const t = useInboxLabels(() => props.labels);
const PAD_GRID = "[background-image:linear-gradient(var(--nq-line)_1px,transparent_1px),linear-gradient(90deg,var(--nq-line)_1px,transparent_1px)] [background-size:2rem_2rem]";
</script>

<template>
  <div data-slot="location-card" :class="cn('w-60 max-w-full overflow-hidden rounded-control border border-border bg-card', props.class)">
    <div aria-hidden="true" dir="ltr" :class="cn('relative grid h-24 place-items-center bg-secondary', PAD_GRID)">
      <MapPin class="size-7 -translate-y-2 fill-current stroke-background text-nq-danger-text" />
    </div>
    <div class="flex flex-col gap-0.5 p-2.5">
      <span dir="auto" class="text-label text-foreground">{{ props.point.label ?? t.locationMessage }}</span>
      <bdi dir="ltr" class="text-caption tabular-nums text-muted-foreground">{{ formatCoords(props.point) }}</bdi>
      <a
        :href="mapsUrl(props.point)"
        target="_blank"
        rel="noopener noreferrer"
        class="mt-1 inline-flex items-center gap-1 self-start text-caption text-foreground underline decoration-nq-line underline-offset-4 hover:decoration-current"
      >
        {{ t.openInMaps }}
        <ExternalLink aria-hidden="true" class="size-3" />
      </a>
    </div>
  </div>
</template>
