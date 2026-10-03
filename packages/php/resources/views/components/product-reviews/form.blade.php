{{-- <x-nq::product-reviews.form ask-fit ask-name />
     The write-a-review form: stars, optional title, body, name, fit and photos, validated on submit (and once a field was left).
     It fires nq-review { review: { rating, title, body, name, fit?, photos: File[] }, waitUntil } on its root; resolve nothing for
     success or { error: "…" } to keep the form open with the message. Inside <x-nq::product-reviews> the block's own listener gets it.
     ask-fit: the "how does it fit?" question (clothing, shoes)   ask-name: ask for a name (guests)   default-name: pre-filled name
     rules: titleMax, bodyMin, bodyMax, maxPhotos, requireTitle, requireName   cancelable: a Cancel button that fires nq-cancel
     labels: an array overriding any built-in text. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['askFit' => false, 'askName' => false, 'defaultName' => '', 'rules' => null, 'cancelable' => false, 'labels' => []])
@php
    $config = ['askFit' => (bool) $askFit, 'askName' => (bool) $askName, 'defaultName' => $defaultName, 'rules' => $rules, 'labels' => (object) $labels];
    $hide = 'display: none';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'product-review-form') }}" x-data="nqProductReviewForm(@js($config))" {{ $attributes->except('data-slot')->cn('contents') }}>
    <div x-show="state === 'done'" style="{{ $hide }}" role="status" class="flex flex-col items-center gap-2 py-8 text-center">
        <x-lucide-circle-check aria-hidden="true" class="size-10 text-nq-success" />
        <p class="text-h3 text-foreground" x-text="t.reviewThanks"></p>
        <p class="text-body-sm text-muted-foreground" x-text="t.reviewThanksHint"></p>
    </div>
    <form x-show="state !== 'done'" novalidate class="flex flex-col gap-5" x-on:submit.prevent="submit()">
        <div class="flex flex-col gap-1.5" x-id="['nq-review-rating']">
            <span :id="$id('nq-review-rating')" class="text-label text-foreground" x-text="t.yourRating"></span>
            <div class="flex items-center gap-3">
                <div role="radiogroup" data-field="rating" tabindex="-1" :aria-labelledby="$id('nq-review-rating')"
                    :aria-invalid="show('rating') ? 'true' : null" aria-orientation="horizontal" class="flex gap-1">
                    <template x-for="n in stars" :key="n">
                        <button type="button" role="radio" data-slot="rating-star" :data-value="n" :aria-checked="rating === n ? 'true' : 'false'"
                            :tabindex="(rating ? rating === n : n === 1) ? 0 : -1" :aria-label="starLabel(n)"
                            x-on:click="setRating(n)" x-on:keydown="ratingKey($event)"
                            class="inline-flex size-9 items-center justify-center rounded-control outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus">
                            <x-lucide-star aria-hidden="true" class="size-6 transition-colors duration-150" x-bind:class="n <= rating ? 'fill-nq-accent text-nq-accent' : 'text-nq-line-strong'" />
                        </button>
                    </template>
                </div>
                <span aria-hidden="true" class="text-body-sm text-muted-foreground" x-text="ratingWord()"></span>
            </div>
            <p x-show="show('rating')" style="{{ $hide }}" role="alert" class="text-caption text-nq-danger-text" x-text="show('rating')"></p>
        </div>

        <x-nq::field x-effect="invalid = show('title') !== ''">
            <x-nq::field.label><span x-text="t.reviewTitle"></span></x-nq::field.label>
            <x-nq::field.input data-field="title" x-model="title" x-bind:maxlength="titleMax" autocomplete="off" x-on:blur="touch('title')" />
            <x-nq::field.description><span x-text="t.reviewTitleHint"></span></x-nq::field.description>
            <x-nq::field.error><span x-text="show('title')"></span></x-nq::field.error>
        </x-nq::field>

        <x-nq::field x-effect="invalid = show('body') !== ''">
            <x-nq::field.label><span x-text="t.reviewBody"></span></x-nq::field.label>
            <x-nq::field.textarea data-field="body" rows="5" x-model="body" x-on:blur="touch('body')" />
            <x-nq::field.description><span x-text="bodyHint"></span></x-nq::field.description>
            <x-nq::field.error><span x-text="show('body')"></span></x-nq::field.error>
        </x-nq::field>

        @if ($askName)
            <x-nq::field x-effect="invalid = show('name') !== ''">
                <x-nq::field.label><span x-text="t.yourName"></span></x-nq::field.label>
                <x-nq::field.input data-field="name" x-model="name" autocomplete="name" x-on:blur="touch('name')" />
                <x-nq::field.error><span x-text="show('name')"></span></x-nq::field.error>
            </x-nq::field>
        @endif

        @if ($askFit)
            <div class="flex flex-col gap-1.5" x-id="['nq-review-fit']">
                <span :id="$id('nq-review-fit')" class="text-label text-foreground" x-text="t.fitQuestion"></span>
                <div role="radiogroup" :aria-labelledby="$id('nq-review-fit')" aria-orientation="horizontal" class="flex flex-wrap gap-2">
                    <template x-for="(f, i) in fits" :key="f">
                        <button type="button" role="radio" data-slot="fit-option" :data-value="f" :aria-checked="fit === f ? 'true' : 'false'"
                            :data-checked="fit === f ? '' : null" :tabindex="(fit ? fit === f : i === 0) ? 0 : -1"
                            x-on:click="fit = f" x-on:keydown="fitKey($event)" x-text="fitText(f)"
                            class="inline-flex h-control items-center rounded-control border border-border bg-card px-3 text-label text-foreground outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus data-checked:border-foreground data-checked:ring-1 data-checked:ring-foreground"></button>
                    </template>
                </div>
            </div>
        @endif

        <div class="flex flex-col gap-2">
            <div class="flex flex-wrap items-center gap-3">
                <input x-ref="files" data-field="photos" type="file" accept="image/*" multiple hidden x-on:change="addFiles($event)">
                <x-nq::button type="button" variant="secondary" x-bind:disabled="previews.length >= maxPhotos" x-on:click="$refs.files.click()">
                    <x-lucide-image-plus aria-hidden="true" />
                    <span x-text="t.addPhotos"></span>
                </x-nq::button>
                <span class="text-caption" x-bind:class="show('photos') ? 'text-nq-danger-text' : 'text-muted-foreground'" x-text="show('photos') || photosHint"></span>
            </div>
            <ul x-show="previews.length > 0" style="{{ $hide }}" class="flex flex-wrap gap-2">
                <template x-for="(p, i) in previews" :key="p.url">
                    <li class="relative size-16 overflow-hidden rounded-control border border-border bg-secondary">
                        <img :src="p.url" :alt="p.name" width="64" height="64" class="size-full object-cover">
                        <button type="button" :aria-label="removeLabel(p.name)" x-on:click="removePhoto(i)"
                            class="absolute end-0.5 top-0.5 inline-flex size-5 items-center justify-center rounded-full bg-background/90 text-foreground outline-none hover:bg-background focus-visible:outline-2 focus-visible:outline-nq-focus">
                            <x-lucide-x aria-hidden="true" class="size-3" />
                        </button>
                    </li>
                </template>
            </ul>
        </div>

        <p x-show="failure" style="{{ $hide }}" role="alert" class="text-body-sm text-nq-danger-text" x-text="failure"></p>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            @if ($cancelable)
                <x-nq::button type="button" variant="ghost" x-on:click="$dispatch('nq-cancel')"><span x-text="t.cancel"></span></x-nq::button>
            @endif
            <x-nq::button type="submit" variant="primary" x-bind:disabled="state === 'sending'" x-bind:aria-busy="state === 'sending' ? 'true' : null">
                <template x-if="state === 'sending'"><x-nq::spinner /></template>
                <span x-text="state === 'sending' ? t.submitting : t.submitReview"></span>
            </x-nq::button>
        </div>
    </form>
</div>
