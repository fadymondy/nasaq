<script setup lang="ts">
import { CircleCheck, ImagePlus, Star, X } from "lucide-vue-next";
import { RadioGroupItem, RadioGroupRoot } from "reka-ui";
import { computed, onBeforeUnmount, ref, useId, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { NqField, NqFieldDescription, NqFieldError, NqFieldLabel, NqInput, NqTextarea } from "../field";
import { useFormatNumber } from "../numeric";
import { useReviewStrings, type ProductReviewsLabels, type ReviewActionResult } from "./labels";
import { DEFAULT_REVIEW_RULES, validateReview, type ReviewErrors, type ReviewFit, type ReviewRules } from "./review-logic";

// Write-a-review form: star rating, optional title, body, name, fit feedback and photos, with validation on submit (and
// once a field has been left). It sends through `onSubmit` and shows a thank-you afterwards.
export interface ProductReviewInput {
  rating: number;
  title: string;
  body: string;
  name: string;
  fit?: ReviewFit;
  photos: File[];
}
interface Props {
  /** Send the review. Return `{ error }` (or throw) to keep the form open with the message. */
  onSubmit: (review: ProductReviewInput) => ReviewActionResult | Promise<ReviewActionResult>;
  /** Show the "how does it fit?" question, for clothing and shoes. */
  askFit?: boolean;
  /** Ask for a name (guests). Signed-in shoppers do not need it. */
  askName?: boolean;
  defaultName?: string;
  rules?: ReviewRules;
  /** Show a Cancel button (it emits `cancel`). */
  cancelable?: boolean;
  labels?: ProductReviewsLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { defaultName: "" });
const emit = defineEmits<{ submitted: []; cancel: [] }>();
const { t } = useReviewStrings(() => props.labels);
const fmt = useFormatNumber();
const uid = useId();
const fileRef = ref<HTMLInputElement>();
const FITS: ReviewFit[] = ["small", "true", "large"];

const r = computed(() => ({ ...DEFAULT_REVIEW_RULES, ...props.rules }));
const rating = ref(0);
const title = ref("");
const body = ref("");
const name = ref(props.defaultName);
const fit = ref<ReviewFit | "">("");
const photos = ref<File[]>([]);
const touched = ref(new Set<string>());
const submitted = ref(false);
const state = ref<"idle" | "sending" | "done">("idle");
const failure = ref<string | null>(null);

const errors = computed<ReviewErrors>(() =>
  validateReview({ rating: rating.value, title: title.value, body: body.value, name: name.value, fit: fit.value, photos: photos.value.length }, { ...props.rules, requireName: props.askName ? true : props.rules?.requireName }),
);
const show = (field: keyof ReviewErrors) => (submitted.value || touched.value.has(field)) && errors.value[field];
const touch = (field: string) => (touched.value = new Set(touched.value).add(field));
const fitLabel = (f: ReviewFit) => (f === "small" ? t.value.fitSmall : f === "true" ? t.value.fitTrue : t.value.fitLarge);

async function send() {
  submitted.value = true;
  failure.value = null;
  if (Object.keys(errors.value).length) {
    const first = (["rating", "title", "body", "name", "photos"] as const).find((k) => errors.value[k]);
    document.getElementById(`${uid}-${first}`)?.focus();
    return;
  }
  state.value = "sending";
  try {
    const result = await props.onSubmit({ rating: rating.value, title: title.value.trim(), body: body.value.trim(), name: name.value.trim(), ...(fit.value ? { fit: fit.value } : {}), photos: photos.value });
    if (result && typeof result === "object" && result.error) {
      failure.value = result.error;
      state.value = "idle";
      return;
    }
    state.value = "done";
    emit("submitted");
  } catch {
    failure.value = t.value.submitFailed;
    state.value = "idle";
  }
}

function addFiles(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files) return;
  photos.value = [...photos.value, ...Array.from(input.files).filter((f) => f.type.startsWith("image/"))];
  touch("photos");
  input.value = "";
}

// Object URLs for the previews, revoked when a photo goes away.
const urls = new Map<File, string>();
const previews = computed(() => photos.value.map((file) => ({ file, url: urls.get(file) ?? (urls.set(file, URL.createObjectURL(file)), urls.get(file)!) })));
watch(photos, (list) => {
  for (const [file, url] of urls) if (!list.includes(file)) (URL.revokeObjectURL(url), urls.delete(file));
});
onBeforeUnmount(() => urls.forEach((url) => URL.revokeObjectURL(url)));
</script>

<template>
  <div v-if="state === 'done'" data-slot="product-review-form" role="status" :class="cn('flex flex-col items-center gap-2 py-8 text-center', props.class)">
    <CircleCheck aria-hidden="true" class="size-10 text-nq-success" />
    <p class="text-h3 text-foreground">{{ t.reviewThanks }}</p>
    <p class="text-body-sm text-muted-foreground">{{ t.reviewThanksHint }}</p>
  </div>
  <form v-else data-slot="product-review-form" novalidate :class="cn('flex flex-col gap-5', props.class)" @submit.prevent="send">
    <div class="flex flex-col gap-1.5">
      <span :id="`${uid}-rating-label`" class="text-label text-foreground">{{ t.yourRating }}</span>
      <div class="flex items-center gap-3">
        <RadioGroupRoot
          :id="`${uid}-rating`"
          :model-value="rating ? String(rating) : undefined"
          :aria-labelledby="`${uid}-rating-label`"
          :aria-invalid="show('rating') ? true : undefined"
          :aria-describedby="show('rating') ? `${uid}-rating-error` : undefined"
          orientation="horizontal"
          class="flex gap-1"
          @update:model-value="(v) => ((rating = Number(v)), touch('rating'))"
        >
          <RadioGroupItem
            v-for="n in [1, 2, 3, 4, 5]"
            :key="n"
            :value="String(n)"
            :aria-label="t.ratingStar(fmt(n))"
            class="inline-flex size-9 items-center justify-center rounded-control outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus"
          >
            <Star aria-hidden="true" :class="cn('size-6 transition-colors duration-150', n <= rating ? 'fill-nq-accent text-nq-accent' : 'text-nq-line-strong')" />
          </RadioGroupItem>
        </RadioGroupRoot>
        <span aria-hidden="true" class="text-body-sm text-muted-foreground">{{ rating ? t.ratingWord[rating] : "" }}</span>
      </div>
      <p v-if="show('rating')" :id="`${uid}-rating-error`" role="alert" class="text-caption text-nq-danger-text">{{ t.errors[errors.rating!] }}</p>
    </div>

    <NqField :invalid="Boolean(show('title'))">
      <NqFieldLabel>{{ t.reviewTitle }}</NqFieldLabel>
      <NqInput :id="`${uid}-title`" v-model="title" :maxlength="r.titleMax + 20" autocomplete="off" @blur="touch('title')" />
      <NqFieldDescription>{{ t.reviewTitleHint }}</NqFieldDescription>
      <NqFieldError v-if="show('title')" match>{{ t.errors[errors.title!] }}</NqFieldError>
    </NqField>

    <NqField :invalid="Boolean(show('body'))">
      <NqFieldLabel>{{ t.reviewBody }}</NqFieldLabel>
      <NqTextarea :id="`${uid}-body`" v-model="body" :rows="5" @blur="touch('body')" />
      <NqFieldDescription>{{ t.reviewBodyHint(fmt(r.bodyMin)) }}</NqFieldDescription>
      <NqFieldError v-if="show('body')" match>{{ t.errors[errors.body!] }}</NqFieldError>
    </NqField>

    <NqField v-if="askName" :invalid="Boolean(show('name'))">
      <NqFieldLabel>{{ t.yourName }}</NqFieldLabel>
      <NqInput :id="`${uid}-name`" v-model="name" autocomplete="name" @blur="touch('name')" />
      <NqFieldError v-if="show('name')" match>{{ t.errors[errors.name!] }}</NqFieldError>
    </NqField>

    <div v-if="askFit" class="flex flex-col gap-1.5">
      <span :id="`${uid}-fit-label`" class="text-label text-foreground">{{ t.fitQuestion }}</span>
      <RadioGroupRoot :model-value="fit || undefined" :aria-labelledby="`${uid}-fit-label`" orientation="horizontal" class="flex flex-wrap gap-2" @update:model-value="(v) => (fit = v as ReviewFit)">
        <RadioGroupItem
          v-for="f in FITS"
          :key="f"
          :value="f"
          :data-checked="fit === f ? '' : undefined"
          class="inline-flex h-control items-center rounded-control border border-border bg-card px-3 text-label text-foreground outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus data-checked:border-foreground data-checked:ring-1 data-checked:ring-foreground"
        >
          {{ fitLabel(f) }}
        </RadioGroupItem>
      </RadioGroupRoot>
    </div>

    <div class="flex flex-col gap-2">
      <div class="flex flex-wrap items-center gap-3">
        <input ref="fileRef" :id="`${uid}-photos`" type="file" accept="image/*" multiple hidden @change="addFiles" />
        <NqButton type="button" variant="secondary" :disabled="photos.length >= r.maxPhotos" @click="fileRef?.click()">
          <ImagePlus aria-hidden="true" />
          {{ t.addPhotos }}
        </NqButton>
        <span :class="cn('text-caption', show('photos') ? 'text-nq-danger-text' : 'text-muted-foreground')">{{ show("photos") ? t.errors["too-many-photos"] : t.photosHint(fmt(r.maxPhotos)) }}</span>
      </div>
      <ul v-if="photos.length > 0" class="flex flex-wrap gap-2">
        <li v-for="(p, i) in previews" :key="`${p.file.name}-${i}`" class="relative size-16 overflow-hidden rounded-control border border-border bg-secondary">
          <img :src="p.url" :alt="p.file.name" width="64" height="64" class="size-full object-cover" />
          <button type="button" :aria-label="`${t.removePhoto}: ${p.file.name}`" class="absolute end-0.5 top-0.5 inline-flex size-5 items-center justify-center rounded-full bg-background/90 text-foreground outline-none hover:bg-background focus-visible:outline-2 focus-visible:outline-nq-focus" @click="photos = photos.filter((_, j) => j !== i)">
            <X aria-hidden="true" class="size-3" />
          </button>
        </li>
      </ul>
    </div>

    <p v-if="failure" role="alert" class="text-body-sm text-nq-danger-text">{{ failure }}</p>
    <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <NqButton v-if="cancelable" type="button" variant="ghost" @click="emit('cancel')">{{ t.cancel }}</NqButton>
      <NqButton type="submit" variant="primary" :loading="state === 'sending'">{{ state === "sending" ? t.submitting : t.submitReview }}</NqButton>
    </div>
  </form>
</template>
