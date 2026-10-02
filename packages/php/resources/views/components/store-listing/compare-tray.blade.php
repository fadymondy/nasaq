{{-- <x-nq::store-listing.compare-tray />   Listing-scoped (inside <x-nq::store-listing>, which includes it when compare is on).
     A sticky tray with a slot per product to compare (up to compare-max), the count, Clear all and Compare. It shows once something is picked.
     Reads the listing's compareIds, slots, removeCompare(), clearCompare() and compareOpen. --}}
@include('nasaq::components.store-listing._strings')
<section data-slot="{{ $attributes->get('data-slot', 'store-compare-tray') }}" aria-label="{{ nq_sl_t('compareTray') }}" x-show="compareIds.length" style="display: none"
    {{ $attributes->except('data-slot')->cn('sticky bottom-3 z-30 mx-auto flex w-full max-w-3xl flex-wrap items-center gap-3 rounded-floating border border-border bg-popover p-3 shadow-floating') }}>
    <ul class="flex min-w-0 basis-full items-center gap-2 sm:flex-1 sm:basis-0">
        <template x-for="(p, i) in slots" x-bind:key="p ? p.id : 'slot-' + i">
            <li class="relative">
                <div x-show="p" class="contents">
                    <div class="size-12 overflow-hidden rounded-control border border-border bg-secondary sm:size-14">
                        <x-nq::store-listing.product-image src-expr="p && p.images[0] ? p.images[0].src : ''" alt-expr="p ? p.name : ''" />
                    </div>
                    <button type="button" x-bind:aria-label="p ? s('compareRemove', { name: p.name }) : ''" x-on:click="p && removeCompare(p.id)"
                        class="absolute -end-1.5 -top-1.5 inline-flex size-5 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-xs outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus">
                        <x-lucide-x aria-hidden="true" class="size-3" />
                    </button>
                </div>
                <div x-show="!p" title="{{ nq_sl_t('compareEmptySlot') }}" class="size-12 rounded-control border border-dashed border-border sm:size-14"></div>
            </li>
        </template>
    </ul>
    <div class="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-caption text-muted-foreground sm:flex-none sm:items-end" role="status" aria-live="polite">
        <span x-text="compareCountText"></span>
        <span x-show="compareIds.length < 2">{{ nq_sl_t('compareNeedTwo') }}</span>
    </div>
    <div class="flex items-center gap-2">
        <x-nq::button variant="ghost" size="sm" x-on:click="clearCompare()">{{ nq_sl_t('clearAll') }}</x-nq::button>
        <x-nq::button variant="primary" size="sm" x-on:click="compareOpen = true" x-bind:disabled="compareIds.length < 2"><span x-text="compareNowText"></span></x-nq::button>
    </div>
</section>
