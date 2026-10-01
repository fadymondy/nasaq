{{-- <x-nq::product-reviews :reviews="$reviews" :page-size="5" can-submit can-report x-on:nq-review="$event.detail.waitUntil(save($event.detail.review))" />
     Customer reviews: the rating summary with a star histogram that filters the list, a photo strip, sort and filter controls, the
     reviews (helpful vote, report, read more, seller reply, photos), a write-a-review dialog and a photo viewer. The list is drawn in
     the browser from the JSON you pass, so it needs the Alpine runtime (@nasaqScripts).
     reviews: ProductReview[] { id, author, rating, title?, body, date (ISO), verified?, photos? [{ src, alt? }], helpful?, variantLabel?,
       fit? (small|true|large), reply? { author, body, date } }
     summary: { average, count, histogram } to show store-wide totals (computed from reviews when omitted)
     page-size: reviews per page (5)   default-sort: helpful | newest | oldest | highest | lowest   loading / error: states ("error" may be text)
     can-submit: show the write-a-review button   can-report: show Report   form-props: [ 'askFit' => true, 'askName' => true, 'rules' => [...] ]
     labels: an array overriding any built-in text. Listen on the root for nq-vote { id, voted }, nq-report { id, reason, note },
     nq-review { review } (each carries waitUntil(promise): resolve nothing for success or { error: "…" } to show a message) and
     nq-filters { stars, withPhotos, verifiedOnly }. The per-review context menu of the React/Vue component is not ported: every
     action it held is a visible button here. --}}
@props(['reviews' => [], 'summary' => null, 'pageSize' => 5, 'defaultSort' => 'helpful', 'loading' => false, 'error' => null, 'canSubmit' => false, 'canReport' => false, 'formProps' => [], 'labels' => []])
@php
    $t = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $config = [
        'reviews' => array_values((array) $reviews), 'summary' => $summary, 'pageSize' => $pageSize, 'defaultSort' => $defaultSort,
        'loading' => (bool) $loading, 'error' => $error === true || filled($error) ? $error : false,
        'canSubmit' => (bool) $canSubmit, 'canReport' => (bool) $canReport, 'labels' => (object) $labels,
    ];
    $lb = fn (string $key, string $en, string $ar) => $labels[$key] ?? $t($en, $ar);
    $sorts = [
        'helpful' => $lb('sortHelpful', 'Most helpful', 'الأكثر فائدة'),
        'newest' => $lb('sortNewest', 'Newest', 'الأحدث'),
        'oldest' => $lb('sortOldest', 'Oldest', 'الأقدم'),
        'highest' => $lb('sortHighest', 'Highest rating', 'الأعلى تقييمًا'),
        'lowest' => $lb('sortLowest', 'Lowest rating', 'الأقل تقييمًا'),
    ];
    $reasons = [
        'spam' => $lb('reasonSpam', 'Spam or advertising', 'محتوى دعائي أو مزعج'),
        'offensive' => $lb('reasonOffensive', 'Offensive or abusive', 'مسيء أو مهين'),
        'fake' => $lb('reasonFake', 'Looks fake', 'يبدو مزيفًا'),
        'irrelevant' => $lb('reasonIrrelevant', 'Not about this product', 'لا يخص هذا المنتج'),
        'other' => $lb('reasonOther', 'Something else', 'سبب آخر'),
    ];
    $hide = 'display: none';
@endphp
<section data-slot="product-reviews" x-data="nqProductReviews(@js($config))" x-id="['nq-reviews']" :aria-labelledby="$id('nq-reviews')"
    {{ $attributes->cn('flex flex-col gap-6') }}>
    <header class="flex flex-wrap items-center justify-between gap-3">
        <h2 :id="$id('nq-reviews')" class="text-h2 text-foreground" x-text="t.reviews"></h2>
        <x-nq::button x-show="canSubmit" style="{{ $hide }}" type="button" variant="secondary" x-on:click="writing = true">
            <x-lucide-pen-line aria-hidden="true" />
            <span x-text="t.writeReview"></span>
        </x-nq::button>
    </header>

    <div x-show="errorText" style="{{ $hide }}" role="alert" class="flex flex-col items-start gap-3 rounded-card border border-nq-danger-border bg-nq-danger-subtle p-4 text-nq-danger-text">
        <p class="flex items-center gap-2 text-body-sm">
            <x-lucide-triangle-alert aria-hidden="true" class="size-4 shrink-0" />
            <span x-text="errorText"></span>
        </p>
        <x-nq::button type="button" variant="secondary" size="sm" x-on:click="$dispatch('nq-retry')"><span x-text="t.retry"></span></x-nq::button>
    </div>

    <div x-show="loading && !errorText" style="{{ $hide }}" role="status" :aria-label="t.loading" aria-busy="true" class="flex flex-col gap-5">
        <div class="h-32 animate-pulse rounded-card bg-secondary motion-reduce:animate-none"></div>
        @foreach ([0, 1, 2] as $i)
            <div class="flex flex-col gap-2">
                <div class="h-4 w-32 animate-pulse rounded bg-secondary motion-reduce:animate-none"></div>
                <div class="h-4 w-full animate-pulse rounded bg-secondary motion-reduce:animate-none"></div>
                <div class="h-4 w-2/3 animate-pulse rounded bg-secondary motion-reduce:animate-none"></div>
            </div>
        @endforeach
    </div>

    <div x-show="empty" style="{{ $hide }}" class="flex flex-col items-center gap-2 rounded-card border border-dashed border-border py-10 text-center">
        <x-lucide-star aria-hidden="true" class="size-8 text-muted-foreground" />
        <p class="text-h3 text-foreground" x-text="t.noReviews"></p>
        <p class="text-body-sm text-muted-foreground" x-text="t.noReviewsHint"></p>
        <x-nq::button x-show="canSubmit" style="{{ $hide }}" type="button" variant="primary" class="mt-2" x-on:click="writing = true">
            <x-lucide-pen-line aria-hidden="true" />
            <span x-text="t.writeReview"></span>
        </x-nq::button>
    </div>

    <template x-if="ready">
        <div class="flex flex-col gap-6">
            <x-nq::product-reviews.summary embedded />

            <div x-show="photoTotal > 0" style="{{ $hide }}" class="flex flex-col gap-2">
                <h3 class="text-label text-foreground" x-text="t.photosTitle"></h3>
                <ul class="flex gap-2 overflow-x-auto pb-1">
                    <template x-for="(p, i) in photoStrip" :key="p.reviewId + p.src">
                        <li class="shrink-0">
                            <button type="button" :aria-label="t.viewPhoto" x-on:click="openPhoto(p.reviewId, p.src)"
                                class="relative block overflow-hidden rounded-control outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">
                                <img :src="p.src" :alt="p.alt || t.viewPhoto" width="72" height="72" loading="lazy" class="size-18 rounded-control bg-secondary object-cover">
                                <span x-show="i === photoStrip.length - 1 && photoTotal > photoStrip.length" style="{{ $hide }}" class="absolute inset-0 flex items-center justify-center bg-foreground/60 text-label text-background">
                                    <bdi x-text="t.morePhotos(fmt(photoTotal - photoStrip.length))"></bdi>
                                </span>
                            </button>
                        </li>
                    </template>
                </ul>
            </div>

            <div role="group" :aria-label="t.filters" class="flex flex-wrap items-center gap-2 border-y border-border py-3">
                <x-nq::select x-model="sort">
                    <x-nq::select.trigger :aria-label="$lb('sort', 'Sort by', 'الترتيب')" class="w-auto min-w-40"><x-nq::select.value /></x-nq::select.trigger>
                    <x-nq::select.content>
                        @foreach ($sorts as $key => $label)
                            <x-nq::select.item :value="$key">{{ $label }}</x-nq::select.item>
                        @endforeach
                    </x-nq::select.content>
                </x-nq::select>
                <x-nq::button data-slot="chip" data-key="withPhotos" type="button" size="sm" variant="ghost" x-on:click="toggleFlag('withPhotos')"
                    x-bind:aria-pressed="String(filters.withPhotos)" x-bind:data-selected="filters.withPhotos ? '' : null"
                    class="shrink-0 rounded-full px-3 text-muted-foreground data-selected:bg-nq-selected data-selected:text-foreground">
                    <span x-text="t.withPhotos"></span>
                </x-nq::button>
                <x-nq::button data-slot="chip" data-key="verifiedOnly" type="button" size="sm" variant="ghost" x-on:click="toggleFlag('verifiedOnly')"
                    x-bind:aria-pressed="String(filters.verifiedOnly)" x-bind:data-selected="filters.verifiedOnly ? '' : null"
                    class="shrink-0 rounded-full px-3 text-muted-foreground data-selected:bg-nq-selected data-selected:text-foreground">
                    <x-lucide-badge-check aria-hidden="true" class="size-3.5" />
                    <span x-text="t.verifiedOnly"></span>
                </x-nq::button>
                <template x-for="level in selectedStars" :key="level">
                    <button type="button" data-star-pill :aria-label="starPillLabel(level)" x-on:click="toggleStar(level)"
                        class="inline-flex h-8 items-center gap-1 rounded-full border border-foreground bg-nq-selected px-3 text-label text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">
                        <bdi x-text="fmt(level)"></bdi>
                        <x-lucide-star aria-hidden="true" class="size-3.5 fill-nq-accent text-nq-accent" />
                        <x-lucide-x aria-hidden="true" class="size-3.5" />
                    </button>
                </template>
                <x-nq::button x-show="active" style="{{ $hide }}" type="button" variant="link" size="sm" x-on:click="clearFilters()"><span x-text="t.clearFilters"></span></x-nq::button>
            </div>

            <p role="status" aria-live="polite" class="text-caption text-muted-foreground">
                <span x-text="showingText"></span>
                <span x-show="voteError" style="{{ $hide }}" class="ms-2 text-nq-danger-text" x-text="voteError"></span>
            </p>

            <div x-show="shown.length === 0" style="{{ $hide }}" class="flex flex-col items-center gap-3 py-8 text-center">
                <p class="text-body text-muted-foreground" x-text="t.noMatches"></p>
                <x-nq::button type="button" variant="secondary" size="sm" x-on:click="clearFilters()"><span x-text="t.clearFilters"></span></x-nq::button>
            </div>

            <ul x-show="shown.length > 0" style="{{ $hide }}" class="flex flex-col divide-y divide-border">
                <template x-for="r in page" :key="r.id">
                    <li class="flex flex-col gap-2 py-5" :data-review-id="r.id">
                        <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span data-slot="rating" class="inline-flex items-center gap-1.5 text-caption text-muted-foreground">
                                <span class="sr-only" x-text="spoken(r.rating)"></span>
                                <x-lucide-star aria-hidden="true" class="size-3.5 shrink-0 fill-nq-accent text-nq-accent" />
                                <bdi aria-hidden="true" class="tabular-nums text-foreground" x-text="ratingText(r.rating)"></bdi>
                            </span>
                            <x-nq::badge x-show="r.verified" style="{{ $hide }}" variant="success">
                                <x-lucide-badge-check aria-hidden="true" />
                                <span x-text="t.verified"></span>
                            </x-nq::badge>
                        </div>
                        <h3 x-show="r.title" style="{{ $hide }}" class="text-h3 text-foreground" x-text="r.title"></h3>
                        <p class="text-caption text-muted-foreground">
                            <span x-text="r.author"></span> · <time :datetime="r.date" x-text="date(r.date)"></time><span x-text="metaTail(r)"></span>
                        </p>
                        <p class="whitespace-pre-line text-body text-foreground" :class="isLong(r) && !isExpanded(r.id) && 'line-clamp-4'" x-text="r.body"></p>
                        <button x-show="isLong(r)" style="{{ $hide }}" type="button" :aria-expanded="isExpanded(r.id) ? 'true' : 'false'" x-on:click="toggleExpanded(r.id)"
                            class="self-start text-label text-nq-accent-text underline-offset-2 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-nq-focus"
                            x-text="isExpanded(r.id) ? t.readLess : t.readMore"></button>
                        <ul x-show="r.photos && r.photos.length > 0" style="{{ $hide }}" class="flex flex-wrap gap-2">
                            <template x-for="p in (r.photos || [])" :key="p.src">
                                <li>
                                    <button type="button" :aria-label="t.viewPhoto" x-on:click="openPhoto(r.id, p.src)"
                                        class="block overflow-hidden rounded-control outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">
                                        <img :src="p.src" :alt="p.alt || t.viewPhoto" width="64" height="64" loading="lazy" class="size-16 bg-secondary object-cover">
                                    </button>
                                </li>
                            </template>
                        </ul>
                        <div x-show="r.reply" style="{{ $hide }}" class="ms-4 flex flex-col gap-1 border-s-2 border-nq-line-strong ps-3">
                            <p class="flex items-center gap-1.5 text-label text-foreground">
                                <x-lucide-message-square-reply aria-hidden="true" class="size-4 text-muted-foreground" />
                                <span x-text="t.sellerReply"></span>
                            </p>
                            <p class="text-body-sm text-foreground" x-text="r.reply && r.reply.body"></p>
                            <p class="text-caption text-muted-foreground">
                                <span x-text="r.reply && r.reply.author"></span> · <time :datetime="r.reply && r.reply.date" x-text="r.reply && date(r.reply.date)"></time>
                            </p>
                        </div>
                        <div class="flex items-center gap-2 pt-1">
                            <x-nq::button data-vote type="button" variant="ghost" size="sm" x-show="!voteFor(r).voted" x-on:click="vote(r)" aria-pressed="false">
                                <x-lucide-thumbs-up aria-hidden="true" />
                                <span x-text="helpfulText(r)"></span>
                            </x-nq::button>
                            <x-nq::button data-vote type="button" variant="secondary" size="sm" x-show="voteFor(r).voted" style="{{ $hide }}" x-on:click="vote(r)" aria-pressed="true">
                                <x-lucide-thumbs-up aria-hidden="true" />
                                <span x-text="helpfulText(r)"></span>
                            </x-nq::button>
                            <x-nq::button data-report type="button" variant="ghost" size="sm" x-show="canReport" style="{{ $hide }}" x-bind:disabled="isReported(r.id)" x-on:click="openReport(r.id)">
                                <x-lucide-flag aria-hidden="true" />
                                <span x-text="isReported(r.id) ? t.reported : t.report"></span>
                            </x-nq::button>
                        </div>
                    </li>
                </template>
            </ul>

            <x-nq::button x-show="shown.length > visible" style="{{ $hide }}" type="button" variant="secondary" class="self-center" x-on:click="showMore()"><span x-text="t.showMore"></span></x-nq::button>
        </div>
    </template>

    @if ($canSubmit)
        <x-nq::dialog x-model="writing">
            <x-nq::dialog.content class="max-h-[90dvh] overflow-y-auto">
                <x-nq::dialog.header>
                    <x-nq::dialog.title><span x-text="t.formTitle"></span></x-nq::dialog.title>
                    <x-nq::dialog.description><span x-text="t.formDescription"></span></x-nq::dialog.description>
                </x-nq::dialog.header>
                <x-nq::product-reviews.form cancelable :ask-fit="$formProps['askFit'] ?? false" :ask-name="$formProps['askName'] ?? false"
                    :default-name="$formProps['defaultName'] ?? ''" :rules="$formProps['rules'] ?? null" :labels="$labels" x-on:nq-cancel="writing = false" />
            </x-nq::dialog.content>
        </x-nq::dialog>
    @endif

    @if ($canReport)
        <x-nq::dialog x-model="reportOpen">
            <x-nq::dialog.content>
                <x-nq::dialog.header>
                    <x-nq::dialog.title><span x-text="t.reportTitle"></span></x-nq::dialog.title>
                    <x-nq::dialog.description><span x-text="t.reportDescription"></span></x-nq::dialog.description>
                </x-nq::dialog.header>
                <div x-show="report.state === 'done'" style="{{ $hide }}" class="flex flex-col items-center gap-4 py-4">
                    <p role="status" class="text-body text-foreground" x-text="t.reportThanks"></p>
                    <x-nq::button type="button" variant="secondary" x-on:click="reportOpen = false"><span x-text="t.cancel"></span></x-nq::button>
                </div>
                <form x-show="report.state !== 'done'" class="flex flex-col gap-4" x-on:submit.prevent="sendReport()">
                    <div x-id="['nq-report']" class="flex flex-col gap-2">
                        <span :id="$id('nq-report', 'reason')" class="text-label text-foreground" x-text="t.reportReason"></span>
                        <x-nq::radio-group x-model="report.reason" class="flex flex-col gap-1" x-bind:aria-labelledby="$id('nq-report', 'reason')">
                            @foreach ($reasons as $key => $label)
                                <label class="flex cursor-pointer items-center gap-2 rounded-control px-2 py-1.5 text-body-sm text-foreground hover:bg-nq-hover">
                                    <x-nq::radio-group.radio :value="$key" />
                                    {{ $label }}
                                </label>
                            @endforeach
                        </x-nq::radio-group>
                    </div>
                    <x-nq::field>
                        <x-nq::field.label><span x-text="t.reportNote"></span></x-nq::field.label>
                        <x-nq::field.textarea rows="3" x-model="report.note" />
                    </x-nq::field>
                    <p x-show="report.failure" style="{{ $hide }}" role="alert" class="text-body-sm text-nq-danger-text" x-text="report.failure"></p>
                    <x-nq::dialog.footer>
                        <x-nq::button type="button" variant="ghost" x-on:click="reportOpen = false"><span x-text="t.cancel"></span></x-nq::button>
                        <x-nq::button type="submit" variant="danger" x-bind:disabled="!report.reason || report.state === 'sending'" x-bind:aria-busy="report.state === 'sending' ? 'true' : null">
                            <template x-if="report.state === 'sending'"><x-nq::spinner /></template>
                            <span x-text="t.reportSend"></span>
                        </x-nq::button>
                    </x-nq::dialog.footer>
                </form>
            </x-nq::dialog.content>
        </x-nq::dialog>
    @endif

    <x-nq::dialog x-model="viewerOpen">
        <x-nq::dialog.content class="max-w-2xl">
            <x-nq::dialog.header>
                <x-nq::dialog.title><span x-text="t.photosTitle"></span></x-nq::dialog.title>
                <x-nq::dialog.description><span x-text="viewerCaption"></span></x-nq::dialog.description>
            </x-nq::dialog.header>
            <div class="flex items-center gap-2">
                <x-nq::button type="button" variant="ghost" size="icon" :aria-label="$lb('prevPhoto', 'Previous photo', 'الصورة السابقة')" x-bind:disabled="!hasPrev" x-on:click="step(-1)">
                    <x-lucide-chevron-left aria-hidden="true" class="rtl:rotate-180" />
                </x-nq::button>
                <div class="flex min-w-0 flex-1 justify-center">
                    <img :src="viewerPhoto && viewerPhoto.src" :alt="(viewerPhoto && viewerPhoto.alt) || t.viewPhoto" width="640" height="640" class="aspect-square max-h-[60dvh] w-full rounded-card bg-secondary object-contain">
                </div>
                <x-nq::button type="button" variant="ghost" size="icon" :aria-label="$lb('nextPhoto', 'Next photo', 'الصورة التالية')" x-bind:disabled="!hasNext" x-on:click="step(1)">
                    <x-lucide-chevron-right aria-hidden="true" class="rtl:rotate-180" />
                </x-nq::button>
            </div>
        </x-nq::dialog.content>
    </x-nq::dialog>
</section>
