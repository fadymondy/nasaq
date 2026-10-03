<script setup lang="ts">
import { CalendarClock, ImagePlus, Send, Video, X } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqAiSplitButton } from "../ai-states";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardHeader, NqCardTitle } from "../card";
import { NqDatePicker, NqTimePicker } from "../date-picker";
import { NqField, NqFieldDescription, NqFieldLabel, NqTextarea } from "../field";
import { formatNumber } from "../numeric";
import { NqProgress } from "../progress";
import { NqStatus } from "../status";
import {
  checkSocialPost,
  socialReady,
  socialRule,
  type SocialMedia,
  type SocialMediaKind,
  type SocialPlatform,
  type SocialPlatformCheck,
  type SocialProblem,
} from "./social-composer-logic";
import { useSocialStrings, type SocialComposerLabels } from "./strings";
import type { SocialAccount, SocialComposerAssistAction, SocialPost } from "./types";

// One post for several social networks. Each chosen platform gets its own counter and limit (X weighs links as 23), a
// preview of what it will send, a check for media it requires, and an optional version of its own. The composer never
// cuts text: it tells you what is wrong and lets you fix it.
const props = withDefaults(
  defineProps<{
    accounts: readonly SocialAccount[];
    /** The post (v-model). */
    modelValue?: SocialPost;
    defaultValue?: SocialPost;
    /**
     * The user asked to add media. Open your picker or uploader and return the file (or resolve it). Without this
     * the attach buttons are hidden.
     */
    onAttach?: (kind: SocialMediaKind) => SocialMedia | null | undefined | void | Promise<SocialMedia | null | undefined | void>;
    /** Choices in the Improve menu. The first one runs from the main button. Without them there is no menu. */
    assistActions?: readonly SocialComposerAssistAction[];
    assisting?: boolean;
    /** Save as a draft. Without it the Save draft button is hidden. Always enabled. */
    onSaveDraft?: (post: SocialPost) => void;
    /** The submit button shows a spinner and blocks while true. */
    submitting?: boolean;
    disabled?: boolean;
    locale?: string;
    labels?: SocialComposerLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { modelValue: undefined, defaultValue: undefined, onAttach: undefined, assistActions: undefined, assisting: false, onSaveDraft: undefined, submitting: false, disabled: false, locale: undefined, labels: undefined },
);
const emit = defineEmits<{
  "update:modelValue": [post: SocialPost];
  /** An Improve action was chosen. You run the AI and write the result back through v-model. */
  assist: [actionId: string, post: SocialPost];
  /** Only reachable when every target passes. */
  submit: [post: SocialPost, checks: SocialPlatformCheck[]];
}>();

const { t, locale } = useSocialStrings(
  () => props.locale,
  () => props.labels,
);
const EMPTY: SocialPost = { body: "", variants: {}, accountIds: [], media: [], scheduledAt: null };
const inner = ref<SocialPost>(props.defaultValue ?? EMPTY);
const post = computed(() => props.modelValue ?? inner.value);
const custom = ref<ReadonlySet<SocialPlatform>>(new Set(Object.keys(post.value.variants) as SocialPlatform[]));
const num = (n: number) => formatNumber(n, locale.value);

function update(patch: Partial<SocialPost>) {
  const next = { ...post.value, ...patch };
  if (props.modelValue === undefined) inner.value = next;
  emit("update:modelValue", next);
}

const platforms = computed(() => [...new Set(props.accounts.filter((a) => post.value.accountIds.includes(a.id)).map((a) => a.platform))]);
const checks = computed(() => checkSocialPost({ body: post.value.body, variants: post.value.variants, platforms: platforms.value, media: post.value.media }));
const ready = computed(() => socialReady(checks.value));
const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
const time = computed(() => (post.value.scheduledAt ? hhmm(post.value.scheduledAt) : "09:00"));
function withTime(date: Date, value: string): Date {
  const [h, m] = value.split(":").map(Number);
  const next = new Date(date);
  next.setHours(h || 0, m || 0, 0, 0);
  return next;
}

const toggleAccount = (id: string) =>
  update({ accountIds: post.value.accountIds.includes(id) ? post.value.accountIds.filter((x) => x !== id) : [...post.value.accountIds, id] });

async function attach(kind: SocialMediaKind) {
  const media = await props.onAttach?.(kind);
  if (media) update({ media: [...post.value.media, media] });
}

function setCustomFor(platform: SocialPlatform, on: boolean) {
  const next = new Set(custom.value);
  const variants = { ...post.value.variants };
  if (on) {
    next.add(platform);
    variants[platform] = variants[platform] ?? post.value.body;
  } else {
    next.delete(platform);
    delete variants[platform];
  }
  custom.value = next;
  update({ variants });
}

function problemText(p: SocialProblem, platform: SocialPlatform): string {
  const rule = socialRule(platform);
  if (p === "media") return t.value.problems.media(rule.requiresMedia ?? "image");
  if (p === "hashtags") return t.value.problems.hashtags(rule.maxHashtags ?? 0);
  return t.value.problems[p];
}

const toneOf = { ok: "default", near: "warning", over: "danger" } as const;
</script>

<template>
  <div data-slot="social-composer" :class="cn('grid w-full gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]', props.class)">
    <div class="flex min-w-0 flex-col gap-4">
      <fieldset class="flex min-w-0 flex-col gap-2" :disabled="props.disabled">
        <legend class="mb-1 text-label font-medium">{{ t.accounts }}</legend>
        <p v-if="props.accounts.length === 0" class="text-body-sm text-muted-foreground">{{ t.noAccounts }}</p>
        <div v-else class="flex flex-wrap gap-2">
          <NqButton
            v-for="a in props.accounts"
            :key="a.id"
            type="button"
            size="sm"
            variant="secondary"
            :aria-pressed="post.accountIds.includes(a.id)"
            :data-selected="post.accountIds.includes(a.id) ? '' : undefined"
            class="data-selected:border-primary data-selected:bg-nq-selected"
            @click="toggleAccount(a.id)"
          >
            <span class="font-medium">{{ socialRule(a.platform).label }}</span>
            <bdi class="text-muted-foreground">{{ a.name }}</bdi>
          </NqButton>
        </div>
      </fieldset>

      <NqField>
        <NqFieldLabel>{{ t.text }}</NqFieldLabel>
        <NqTextarea :rows="6" :model-value="post.body" :disabled="props.disabled" :placeholder="t.placeholder" @update:model-value="update({ body: $event ?? '' })" />
        <NqFieldDescription>{{ t.textHint }}</NqFieldDescription>
      </NqField>

      <div class="flex flex-wrap items-center gap-2">
        <template v-if="props.onAttach">
          <NqButton type="button" size="sm" variant="secondary" :disabled="props.disabled" @click="attach('image')">
            <ImagePlus aria-hidden="true" />
            {{ t.addImage }}
          </NqButton>
          <NqButton type="button" size="sm" variant="secondary" :disabled="props.disabled" @click="attach('video')">
            <Video aria-hidden="true" />
            {{ t.addVideo }}
          </NqButton>
        </template>
        <NqAiSplitButton
          v-if="props.assistActions?.length"
          class="ms-auto"
          :label="t.assist"
          :generating="props.assisting"
          :disabled="props.disabled"
          :actions="props.assistActions"
          :on-run="() => emit('assist', props.assistActions?.[0]?.id ?? '', post)"
          :on-action="(id: string) => emit('assist', id, post)"
        />
      </div>

      <ul v-if="post.media.length" :aria-label="t.media" class="flex flex-wrap gap-2">
        <li v-for="m in post.media" :key="m.id" class="inline-flex items-center gap-1.5 rounded-control border border-border bg-nq-surface-soft py-1 ps-2 pe-1 text-body-sm">
          <ImagePlus v-if="m.kind === 'image'" aria-hidden="true" class="size-3.5 text-muted-foreground" />
          <Video v-else aria-hidden="true" class="size-3.5 text-muted-foreground" />
          <bdi>{{ m.name }}</bdi>
          <NqButton type="button" variant="ghost" size="icon-sm" :aria-label="t.removeMedia(m.name)" @click="update({ media: post.media.filter((x) => x.id !== m.id) })">
            <X aria-hidden="true" />
          </NqButton>
        </li>
      </ul>

      <fieldset class="flex min-w-0 flex-col gap-2" :disabled="props.disabled">
        <legend class="mb-1 inline-flex items-center gap-1.5 text-label font-medium">
          <CalendarClock aria-hidden="true" class="size-4 text-muted-foreground" />
          {{ t.schedule }}
        </legend>
        <div class="flex flex-wrap items-center gap-2">
          <NqDatePicker :aria-label="t.date" :model-value="post.scheduledAt" :locale="locale" @update:model-value="update({ scheduledAt: $event ? withTime($event, time) : null })" />
          <NqTimePicker
            :aria-label="t.time"
            :model-value="post.scheduledAt ? time : null"
            :locale="locale"
            @update:model-value="update({ scheduledAt: withTime(post.scheduledAt ?? new Date(), $event ?? '09:00') })"
          />
          <NqButton v-if="post.scheduledAt" type="button" variant="ghost" size="sm" @click="update({ scheduledAt: null })">{{ t.clearSchedule }}</NqButton>
        </div>
        <p class="text-caption text-muted-foreground">{{ t.scheduleHint }}</p>
      </fieldset>

      <div class="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <NqButton type="button" :loading="props.submitting" :disabled="props.disabled || !ready" @click="emit('submit', post, checks)">
          <Send aria-hidden="true" />
          {{ post.scheduledAt ? t.scheduleAction : t.publish }}
        </NqButton>
        <NqButton v-if="props.onSaveDraft" type="button" variant="secondary" :disabled="props.disabled || props.submitting" @click="props.onSaveDraft(post)">{{ t.saveDraft }}</NqButton>
        <NqStatus v-if="ready" tone="success" class="ms-auto">{{ t.ready }}</NqStatus>
      </div>
    </div>

    <section :aria-label="t.targets" class="flex min-w-0 flex-col gap-3">
      <h3 class="text-label font-medium">{{ t.targets }}</h3>
      <p v-if="checks.length === 0" class="text-body-sm text-muted-foreground">{{ t.pickTargets }}</p>
      <NqCard v-for="c in checks" :key="c.platform" data-slot="social-target" :data-platform="c.platform" :data-level="c.level">
        <NqCardHeader class="flex-row items-center justify-between gap-2">
          <NqCardTitle as="h4" class="flex items-center gap-2 text-body font-medium">
            {{ socialRule(c.platform).label }}
            <NqBadge v-if="c.usesVariant" variant="outline">{{ t.custom }}</NqBadge>
          </NqCardTitle>
          <span :class="cn('text-body-sm tabular-nums', c.level === 'over' ? 'text-nq-danger-text' : 'text-muted-foreground')">{{ t.chars(num(c.length), num(c.limit)) }}</span>
        </NqCardHeader>
        <NqCardContent class="flex flex-col gap-2">
          <NqProgress size="sm" :aria-label="t.counter(socialRule(c.platform).label)" :value="Math.min(100, (c.length / c.limit) * 100)" :tone="toneOf[c.level]" :format="{ style: 'percent', maximumFractionDigits: 0 }" />
          <p :class="cn('text-caption', c.level === 'over' ? 'text-nq-danger-text' : 'text-muted-foreground')">{{ c.remaining < 0 ? t.over(num(-c.remaining)) : t.left(num(c.remaining)) }}</p>
          <NqTextarea
            v-if="custom.has(c.platform)"
            :rows="4"
            :aria-label="`${socialRule(c.platform).label} — ${t.custom}`"
            :model-value="post.variants[c.platform] ?? ''"
            :disabled="props.disabled"
            @update:model-value="update({ variants: { ...post.variants, [c.platform]: $event ?? '' } })"
          />
          <p v-else class="line-clamp-4 whitespace-pre-wrap rounded-control bg-nq-surface-soft p-2 text-body-sm" :aria-label="t.preview">
            <template v-if="c.text">{{ c.text }}</template>
            <span v-else class="text-muted-foreground">{{ t.placeholder }}</span>
          </p>
          <ul v-if="c.problems.length" class="flex flex-col gap-0.5 text-caption text-nq-danger-text">
            <li v-for="p in c.problems" :key="p">{{ problemText(p, c.platform) }}</li>
          </ul>
          <NqButton type="button" variant="link" size="sm" class="self-start px-0" :disabled="props.disabled" @click="setCustomFor(c.platform, !custom.has(c.platform))">
            {{ custom.has(c.platform) ? t.useShared : t.customVersion }}
          </NqButton>
        </NqCardContent>
      </NqCard>
    </section>
  </div>
</template>
