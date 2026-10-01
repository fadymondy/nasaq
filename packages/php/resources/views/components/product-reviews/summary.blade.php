{{-- <x-nq::product-reviews.summary :reviews="$reviews" />   <x-nq::product-reviews.summary :summary="['average' => 4.6, 'count' => 120, 'histogram' => [5 => 90, 4 => 20, 3 => 6, 2 => 2, 1 => 2]]" />
     The rating at a glance: the average, the count, a star histogram and (when reviewers answered) the fit split.
     Standalone it reads reviews (or a ready-made summary) and the histogram is read-only. Inside <x-nq::product-reviews> pass `embedded`
     so it binds to the block's state and each row becomes a toggle that filters the list.
     reviews: ProductReview[] (rating, fit)   summary: { average, count, histogram }   labels: an array overriding the built-in text.
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['reviews' => [], 'summary' => null, 'labels' => [], 'embedded' => false])
@php
    $config = ['reviews' => array_values((array) $reviews), 'summary' => $summary, 'labels' => (object) $labels];
    $hide = 'display: none';
@endphp
<section data-slot="product-review-summary" @unless ($embedded) x-data="nqProductReviewSummary(@js($config))" @endunless :aria-label="t.reviews"
    {{ $attributes->cn('grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-10') }}>
    <div class="flex flex-col gap-1">
        <p class="flex items-baseline gap-2">
            <bdi class="text-display tabular-nums text-foreground" x-text="avgText"></bdi>
            <span class="text-body text-muted-foreground">/ <bdi x-text="fmt(5)"></bdi></span>
        </p>
        <span data-slot="rating" class="inline-flex items-center gap-1.5 text-caption text-muted-foreground">
            <span class="sr-only" x-text="spoken(stats.average, stats.count)"></span>
            <x-lucide-star aria-hidden="true" class="size-3.5 shrink-0 fill-nq-accent text-nq-accent" />
            <bdi aria-hidden="true" class="tabular-nums text-foreground" x-text="avgText"></bdi>
            <span aria-hidden="true" class="truncate">
                <span class="me-1.5">·</span>
                <bdi class="tabular-nums" x-text="countText"></bdi> <span x-text="t.reviewsCount"></span>
            </span>
        </span>
        <p class="text-caption text-muted-foreground" x-text="basedOn"></p>
    </div>
    <div class="flex min-w-0 flex-col gap-4">
        <ul role="group" :aria-label="t.histogram" class="flex flex-col gap-1">
            <template x-for="row in rows" :key="row.level">
                <li>
                    <template x-if="selectable">
                        <button type="button" :aria-pressed="isSelected(row.level) ? 'true' : 'false'" :aria-label="row.label" :data-level="row.level"
                            :data-pressed="isSelected(row.level) ? '' : null" x-on:click="toggleStar(row.level)"
                            class="flex w-full items-center gap-3 rounded-control px-2 py-1 text-start outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus"
                            x-bind:class="isSelected(row.level) && 'bg-nq-selected'">
                            <span class="inline-flex w-9 shrink-0 items-center gap-1 text-label tabular-nums text-foreground">
                                <bdi x-text="row.levelText"></bdi>
                                <x-lucide-star aria-hidden="true" class="size-3.5 fill-nq-accent text-nq-accent" />
                            </span>
                            <span aria-hidden="true" class="relative h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-secondary">
                                <span class="absolute inset-y-0 start-0 rounded-full bg-nq-accent transition-[width] duration-300 ease-nq motion-reduce:transition-none" :style="{ width: row.pct + '%' }"></span>
                            </span>
                            <span class="w-10 shrink-0 text-end text-caption tabular-nums text-muted-foreground"><bdi x-text="row.countText"></bdi></span>
                        </button>
                    </template>
                    <template x-if="!selectable">
                        <div role="text" :aria-label="row.plain" class="flex items-center gap-3 px-2 py-1">
                            <span class="inline-flex w-9 shrink-0 items-center gap-1 text-label tabular-nums text-foreground">
                                <bdi x-text="row.levelText"></bdi>
                                <x-lucide-star aria-hidden="true" class="size-3.5 fill-nq-accent text-nq-accent" />
                            </span>
                            <span aria-hidden="true" class="relative h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-secondary">
                                <span class="absolute inset-y-0 start-0 rounded-full bg-nq-accent transition-[width] duration-300 ease-nq motion-reduce:transition-none" :style="{ width: row.pct + '%' }"></span>
                            </span>
                            <span class="w-10 shrink-0 text-end text-caption tabular-nums text-muted-foreground"><bdi x-text="row.countText"></bdi></span>
                        </div>
                    </template>
                </li>
            </template>
        </ul>
        <div x-show="fitRows.length > 0" style="{{ $hide }}" class="flex flex-col gap-1.5">
            <p class="text-label text-foreground" x-text="fitTitle"></p>
            <div role="img" :aria-label="fitAria" class="flex h-2 overflow-hidden rounded-full bg-secondary">
                <template x-for="(r, i) in fitRows" :key="r.key">
                    <span class="h-full" :class="i === 1 ? 'bg-nq-success' : 'bg-nq-line-strong'" :style="{ width: r.pct + '%' }"></span>
                </template>
            </div>
            <ul class="flex justify-between gap-2 text-caption text-muted-foreground">
                <template x-for="r in fitRows" :key="r.key">
                    <li><span x-text="r.label"></span> <bdi class="tabular-nums" x-text="r.text"></bdi></li>
                </template>
            </ul>
        </div>
    </div>
</section>
