<script setup lang="ts">
import { ShieldCheck } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAvatar } from "../avatar";
import { NqBadge } from "../badge";
import { NqIconRailSidebar, type RailSection } from "../icon-rail-sidebar";
import { NqImpersonationBanner } from "../impersonation-banner";
import { NqTooltip } from "../tooltip";
import { type AdminAreaLabels, adminStrings } from "./strings";
import { defaultAdminSections } from "./sections";

// The admin frame. An icon rail plus sub-sidebar (NqIconRailSidebar) with the admin navigation ready made, an
// environment tag, an account button, and the impersonation banner. Put NqAdminPage inside.
// Every other NqIconRailSidebar prop (v-model, active-item, sub-open ...) is passed through.
// Slots: default (the page), brand, rail-footer (above the user), sub-header (below the environment tag).
export interface AdminUser {
  name: string;
  email: string;
  avatar?: string;
}

defineOptions({ inheritAttrs: false });
interface Props {
  /** The rail and its sub-sidebars. Default `defaultAdminSections(locale)`. */
  sections?: readonly RailSection[];
  /** The signed-in admin, shown at the bottom of the rail. */
  user?: AdminUser;
  /** A short environment tag above the sub-sidebar, such as "Production". */
  environment?: string;
  /** While set, a banner pins to the top: the admin is acting as this user. */
  impersonating?: { name: string; email?: string } | null;
  onStopImpersonating?: () => void | Promise<void>;
  labels?: AdminAreaLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  sections: undefined,
  user: undefined,
  environment: undefined,
  impersonating: null,
  onStopImpersonating: undefined,
  labels: undefined,
});

const nasaq = useNasaq();
const locale = computed(() => nasaq.locale.value);
const t = computed(() => ({ ...adminStrings(locale.value), ...props.labels }));
const railSections = computed(() => props.sections ?? defaultAdminSections(locale.value));
</script>

<template>
  <div data-slot="admin-area" :class="cn('flex h-full min-h-0 w-full flex-col', props.class)">
    <NqImpersonationBanner
      v-if="props.impersonating"
      :as="props.impersonating"
      :sticky="false"
      data-slot="admin-impersonation"
      :on-exit="() => props.onStopImpersonating?.()"
      :hint="t.impersonatingHint"
      :labels="{ impersonating: t.impersonating, exit: t.stop }"
    />
    <NqIconRailSidebar v-bind="$attrs" class="min-h-0 flex-1" :sections="railSections">
      <template #brand>
        <slot name="brand">
          <span class="flex size-9 items-center justify-center rounded-control bg-primary text-primary-foreground [&_svg]:size-5">
            <ShieldCheck aria-hidden="true" />
          </span>
        </slot>
      </template>
      <template #sub-header>
        <NqBadge v-if="props.environment" variant="warning" class="self-start">{{ props.environment }}</NqBadge>
        <slot name="sub-header" />
      </template>
      <template #rail-footer>
        <slot name="rail-footer" />
        <NqTooltip v-if="props.user" :content="`${props.user.name} · ${props.user.email}`" side="inline-end">
          <button
            type="button"
            :aria-label="`${t.account}: ${props.user.name}`"
            class="rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus"
          >
            <NqAvatar :name="props.user.name" :src="props.user.avatar" size="sm" />
          </button>
        </NqTooltip>
      </template>
      <slot />
    </NqIconRailSidebar>
  </div>
</template>
