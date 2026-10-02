<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import type { BlogPostSummary } from "../blog-index";
import { NqLocalClock, NqNowWidget, NqStatsWidget, NqWeatherWidget } from "../personal-widgets";
import NqProfileAbout from "./NqProfileAbout.vue";
import NqProfileAccount from "./NqProfileAccount.vue";
import NqProfileApps from "./NqProfileApps.vue";
import NqProfileContact from "./NqProfileContact.vue";
import NqProfileExperience from "./NqProfileExperience.vue";
import NqProfileProjects from "./NqProfileProjects.vue";
import NqProfileSidebar from "./NqProfileSidebar.vue";
import NqProfileSkills from "./NqProfileSkills.vue";
import NqProfileTestimonials from "./NqProfileTestimonials.vue";
import NqProfileWriting from "./NqProfileWriting.vue";
import { useProfileStrings, type ProfilePageLabels } from "./strings";
import type { ProfileAccountDetail, ProfileApp, ProfileData } from "./types";

// A profile page in two columns: the identity column beside about, experience, skills, projects, writing and testimonials,
// with personal widgets under the identity. The default slot holds your own sections, shown first in the content column.
// The owner view (`owner` or `editHref`) swaps contact for "Edit profile" and shows apps and account details.
interface Props {
  profile: ProfileData;
  /** Show the contact button as a real button: the page emits `contact`. Without it the button opens mailto: to `profile.email`. */
  contactButton?: boolean;
  /** The owner is looking at their own page: "Edit profile" (emits `edit`) replaces contact, and the closing call to action is left out. */
  owner?: boolean;
  /** Same as `owner`, as a link to the settings page. */
  editHref?: string;
  postHref?: (post: BlogPostSummary) => string;
  /** Link to the blog archive, shown next to the latest writing. */
  blogHref?: string;
  /** Fixed "now" for the clock and tenure, for stories and tests. */
  now?: Date | number;
  /** Show the personal widgets under the identity column. Default true. */
  widgets?: boolean;
  /** The owner's apps, shown to them only. An empty list shows an empty state. */
  apps?: ProfileApp[];
  /** Where to find more apps, for the apps section. */
  appsHref?: string;
  /** The owner's account details, shown to them only after the apps. */
  account?: ProfileAccountDetail[];
  labels?: Partial<ProfilePageLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { widgets: true });
const emit = defineEmits<{ contact: []; edit: [] }>();
const { t } = useProfileStrings(() => props.labels);
const p = computed(() => props.profile);
const owner = computed(() => Boolean(props.owner || props.editHref));
const hasWidgets = computed(() => props.widgets && Boolean(p.value.timeZone || p.value.weather || p.value.stats?.length || p.value.now?.length));
</script>

<template>
  <div data-slot="profile-page" :class="cn('@container mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-8 @2xl:px-6 @2xl:py-12', props.class)">
    <div class="grid grid-cols-1 gap-10 @4xl:grid-cols-[17rem_minmax(0,1fr)] @4xl:grid-rows-[auto_1fr] @4xl:gap-x-12">
      <NqProfileSidebar
        :profile="p"
        :owner="props.owner"
        :edit-href="props.editHref"
        :contact-button="props.contactButton"
        :labels="props.labels"
        class="@4xl:col-start-1 @4xl:row-start-1"
        @contact="emit('contact')"
        @edit="emit('edit')"
      />
      <div class="flex min-w-0 flex-col gap-12 @4xl:col-start-2 @4xl:row-span-2 @4xl:row-start-1">
        <slot />
        <NqProfileApps v-if="owner && props.apps" :apps="props.apps" :browse-href="props.appsHref" :labels="props.labels" />
        <NqProfileAccount v-if="owner && props.account && props.account.length > 0" :details="props.account" :labels="props.labels" />
        <NqProfileAbout v-if="p.about" :about="p.about" :labels="props.labels" />
        <NqProfileExperience v-if="p.experience?.length" :experience="p.experience" :now="props.now" :labels="props.labels" />
        <NqProfileSkills v-if="p.skills?.length" :skills="p.skills" :labels="props.labels" />
        <NqProfileProjects v-if="p.projects?.length" :projects="p.projects" :labels="props.labels" />
        <NqProfileWriting v-if="p.posts?.length" :posts="p.posts" :post-href="props.postHref" :all-href="props.blogHref" :labels="props.labels" />
        <NqProfileTestimonials v-if="p.testimonials?.length" :testimonials="p.testimonials" :labels="props.labels" />
      </div>
      <aside v-if="hasWidgets" :aria-label="t.sections" class="grid grid-cols-1 content-start gap-4 @xl:grid-cols-2 @4xl:col-start-1 @4xl:row-start-2 @4xl:grid-cols-1">
        <NqLocalClock v-if="p.timeZone" :time-zone="p.timeZone" :city="p.location" :working-hours="p.workingHours" :now="props.now" />
        <NqWeatherWidget v-if="p.weather" v-bind="p.weather" />
        <NqStatsWidget v-if="p.stats?.length" :stats="p.stats" />
        <NqNowWidget v-if="p.now?.length" :items="p.now" :updated="p.nowUpdated" />
      </aside>
    </div>
    <NqProfileContact
      v-if="!owner"
      :email="p.email"
      :availability="p.availability"
      :availability-note="p.availabilityNote"
      :contact-button="props.contactButton"
      :labels="props.labels"
      @contact="emit('contact')"
    />
  </div>
</template>
