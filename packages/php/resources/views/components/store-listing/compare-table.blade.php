{{-- <x-nq::store-listing.compare-table />   Listing-scoped. The side-by-side table: one column per compared product, one row per attribute
     (price, brand, category, rating, availability, description and each option), differing rows marked, with a Show only differences switch.
     Reads the listing's compareProducts, compareRows, onlyDiff, removeCompare(), compareAdd(). add: show an Add to cart button per column
     (it fires nq-compare-add-to-cart { productId, product }). --}}
@include('nasaq::components.store-listing._strings')
@props(['add' => false])
<div data-slot="{{ $attributes->get('data-slot', 'store-compare-table') }}" {{ $attributes->except('data-slot')->cn('flex flex-col gap-3') }}>
    <label class="flex w-fit cursor-pointer items-center gap-2 text-body-sm">
        <x-nq::switch x-model="onlyDiff" />
        {{ nq_sl_t('onlyDifferences') }}
    </label>
    <div class="overflow-x-auto rounded-card border border-border">
        {{-- An ARIA table of divs: rows and cells are rendered by x-for, which a real <table> cannot hold (the parser drops <tr> and <th> inside <template>). --}}
        <div role="table" aria-label="{{ nq_sl_t('compareTitle') }}" class="min-w-[36rem] text-start text-body-sm">
            <div role="row" class="grid items-stretch align-top" x-bind:style="{ gridTemplateColumns: 'minmax(8rem, 10rem) repeat(' + Math.max(compareProducts.length, 1) + ', minmax(0, 1fr))' }">
                <div role="columnheader" class="bg-secondary p-3 text-start text-label text-muted-foreground">{{ nq_sl_t('attribute') }}</div>
                <template x-for="p in compareProducts" x-bind:key="p.id">
                    <div role="columnheader" class="border-s border-border p-3 text-start font-normal">
                        <div class="flex flex-col gap-2">
                            <div class="aspect-square w-full max-w-32 overflow-hidden rounded-control bg-secondary">
                                <x-nq::store-listing.product-image src-expr="p.images[0] ? p.images[0].src : ''" alt-expr="p.name" />
                            </div>
                            <p class="text-label text-foreground" x-text="p.name"></p>
                            <div class="flex flex-wrap gap-1.5">
                                @if ($add)<x-nq::button size="sm" variant="primary" x-on:click="compareAdd(p.id)">{{ nq_sl_t('addToCart') }}</x-nq::button>@endif
                                <x-nq::button size="sm" variant="ghost" x-bind:aria-label="s('compareRemove', { name: p.name })" x-on:click="removeCompare(p.id)"><x-lucide-x /></x-nq::button>
                            </div>
                        </div>
                    </div>
                </template>
            </div>
            <template x-for="row in compareRows" x-bind:key="row.id">
                <div role="row" class="grid items-stretch border-t border-border align-top" x-bind:data-differs="row.differs ? '' : undefined"
                    x-bind:style="{ gridTemplateColumns: 'minmax(8rem, 10rem) repeat(' + Math.max(compareProducts.length, 1) + ', minmax(0, 1fr))' }">
                    <div role="rowheader" class="bg-secondary p-3 text-start font-medium text-foreground" x-bind:class="{ 'border-s-2 border-s-primary': row.differs }">
                        <span x-text="rowLabel(row)"></span>
                        <span x-show="row.differs" class="sr-only"> ({{ nq_sl_t('compareTitle') }})</span>
                    </div>
                    <template x-for="(cell, i) in row.cells" x-bind:key="i">
                        <div role="cell" class="border-s border-border p-3" x-bind:class="{ 'bg-nq-selected/40': row.differs }">
                            <template x-if="row.kind === 'price' && typeof cell === 'number'"><bdi class="font-medium tabular-nums" x-text="money(cell)"></bdi></template>
                            <template x-if="row.kind === 'rating' && typeof cell === 'number'">
                                <span data-slot="rating" class="inline-flex items-center gap-1.5 text-caption text-muted-foreground">
                                    <x-lucide-star aria-hidden="true" class="size-3.5 shrink-0 fill-nq-accent text-nq-accent" />
                                    <bdi class="tabular-nums text-foreground" x-text="cell.toFixed(1)"></bdi>
                                </span>
                            </template>
                            <template x-if="row.kind === 'availability'">
                                <span class="contents">
                                    <span class="contents" x-show="cell"><x-nq::badge variant="success"><x-lucide-check />{{ nq_sl_t('inStock') }}</x-nq::badge></span>
                                    <span class="contents" x-show="!cell"><x-nq::badge variant="danger">{{ nq_sl_t('outOfStock') }}</x-nq::badge></span>
                                </span>
                            </template>
                            <template x-if="row.kind !== 'availability' && !(row.kind === 'price' && typeof cell === 'number') && !(row.kind === 'rating' && typeof cell === 'number')">
                                <span x-bind:class="{ 'text-muted-foreground': cell === null || cell === '' }" x-text="cellText(cell)"></span>
                            </template>
                        </div>
                    </template>
                </div>
            </template>
            <p x-show="!compareRows.length" style="display: none" class="border-t border-border p-6 text-center text-muted-foreground">{{ nq_sl_t('noDifferences') }}</p>
        </div>
    </div>
</div>
