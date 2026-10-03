{{-- <x-nq::store-listing.toolbar :total="24" sort="relevance" view="grid" />   Listing-scoped.
     The mobile Filters button (opens the sheet), the result count, the sort select, the grid / list toggle and the density toggle (grid only).
     Bound to the listing's sort, view, density, resultsText, filtersText and openSheet(). total, filter-count, sorts: for the first paint. --}}
@include('nasaq::components.store-listing._strings')
@props(['total' => 0, 'sort' => 'relevance', 'sorts' => ['relevance', 'popular', 'rating', 'price-asc', 'price-desc', 'discount', 'name'], 'view' => 'grid', 'density' => 'comfortable', 'filterCount' => 0, 'filters' => true])
<div data-slot="{{ $attributes->get('data-slot', 'store-listing-toolbar') }}" {{ $attributes->except('data-slot')->cn('flex flex-wrap items-center gap-x-3 gap-y-2') }}>
    @if ($filters)
        <x-nq::button variant="secondary" size="sm" class="lg:hidden" x-on:click="openSheet()">
            <x-lucide-sliders-horizontal />
            <span x-text="filtersText">{{ $filterCount ? nq_sl_t('filtersCount', ['n' => number_format($filterCount)]) : nq_sl_t('filters') }}</span>
        </x-nq::button>
    @endif
    <p role="status" aria-live="polite" class="me-auto text-body-sm text-muted-foreground" x-text="resultsText">{{ $total === 1 ? nq_sl_t('resultsOne') : nq_sl_t('results', ['n' => number_format($total)]) }}</p>
    <label class="flex items-center gap-2 text-body-sm text-muted-foreground">
        <span class="hidden sm:inline">{{ nq_sl_t('sortBy') }}</span>
        <x-nq::select :value="$sort" x-model="sort">
            <x-nq::select.trigger :aria-label="nq_sl_t('sortBy')" class="h-8 w-auto min-w-40">
                <x-nq::select.value />
            </x-nq::select.trigger>
            <x-nq::select.content>
                @foreach ($sorts as $s)
                    <x-nq::select.item :value="$s">{{ nq_sl_t('sort.'.$s) }}</x-nq::select.item>
                @endforeach
            </x-nq::select.content>
        </x-nq::select>
    </label>
    <x-nq::toggle-group :aria-label="nq_sl_t('view')" :default-value="[$view]" x-model="viewModel">
        <x-nq::toggle-group.toggle value="grid" :aria-label="nq_sl_t('grid')"><x-lucide-layout-grid /></x-nq::toggle-group.toggle>
        <x-nq::toggle-group.toggle value="list" :aria-label="nq_sl_t('list')"><x-lucide-list /></x-nq::toggle-group.toggle>
    </x-nq::toggle-group>
    <x-nq::toggle-group :aria-label="nq_sl_t('density')" :default-value="[$density]" x-model="densityModel" class="hidden sm:flex" x-show="view === 'grid'" :style="$view !== 'grid' ? 'display: none' : ''">
        <x-nq::toggle-group.toggle value="comfortable">{{ nq_sl_t('comfortable') }}</x-nq::toggle-group.toggle>
        <x-nq::toggle-group.toggle value="compact">{{ nq_sl_t('compact') }}</x-nq::toggle-group.toggle>
    </x-nq::toggle-group>
</div>
