{{-- <x-nq::store-products-admin.variant-matrix :options="$product['options']" :images="$product['images']" :variants="$product['variants']" x-model="draft.variants" />
     One row per variant: SKU, price, compare-at, stock and picture, each edited in place, with a "fill selected variants" bar (price, compare-at, stock, add stock, SKU prefix).
     Duplicate SKUs and a compare-at at or below the price are flagged. options and images give the variants their labels and the picture choices; inside a product editor they follow it
     (x-effect="setContext(activeOptions, draft.images)"). variants: [['id', 'options' => [optionId => valueId], 'price', 'compareAt', 'stock', 'sku', 'image']] (x-modelable: x-model reads and writes it).
     money is integer minor units; currency: ISO 4217 (USD, or SAR in Arabic). disabled: read only. labels: override any built-in string by key.
     Fires "nq-variants-change" ({ variants }) after every change. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.store-products-admin._strings')
@props(['options' => [], 'variants' => [], 'images' => [], 'currency' => null, 'disabled' => false, 'labels' => []])
@php
    $t = nq_product_admin_t($labels);
    $currency ??= \Nasaq\Nasaq::currency();
    $config = ['options' => array_values($options), 'variants' => array_values($variants), 'images' => array_values($images), 'disabled' => (bool) $disabled, 'currency' => $currency, 'locale' => \Nasaq\Nasaq::rtl() ? 'ar' : 'en', 't' => $t];
    $th = 'px-2 py-2 text-start text-caption font-medium text-muted-foreground';
    $td = 'px-2 py-2 align-middle text-body-sm text-foreground';
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'variant-matrix') }}" aria-label="{{ $t['variantsTitle'] }}" x-data="nqVariantMatrix(@js($config))" x-modelable="variants"
    {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-3') }}>
    <h3 class="text-label text-foreground">{{ $t['variantsTitle'] }}</h3>

    <template x-if="variants.length === 0">
        <x-nq::states.empty icon="layers" :title="$t['variantsEmpty']" class="border-dashed" />
    </template>

    <div x-show="variants.length > 0" data-slot="variant-fill" class="grid gap-2 rounded-card border border-border bg-nq-surface-soft p-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="text-label text-foreground">{{ $t['bulkFill'] }}</span>
            <span class="text-caption text-muted-foreground" role="status" aria-live="polite" x-text="selectedText"></span>
        </div>
        <div class="grid gap-2 sm:grid-cols-5">
            <div class="grid gap-1">
                <span class="text-caption text-muted-foreground">{{ $t['fillPrice'] }}</span>
                <x-nq::currency-input :currency="$currency" aria-label="{{ $t['fillPrice'] }}" x-model="fill.price" />
            </div>
            <div class="grid gap-1">
                <span class="text-caption text-muted-foreground">{{ $t['fillCompare'] }}</span>
                <x-nq::currency-input :currency="$currency" aria-label="{{ $t['fillCompare'] }}" x-model="fill.compareAt" />
            </div>
            <div class="grid gap-1">
                <span class="text-caption text-muted-foreground">{{ $t['fillStock'] }}</span>
                <x-nq::field.input type="text" inputmode="numeric" aria-label="{{ $t['fillStock'] }}" x-model="fill.stock" />
            </div>
            <div class="grid gap-1">
                <span class="text-caption text-muted-foreground">{{ $t['fillAddStock'] }}</span>
                <x-nq::field.input type="text" inputmode="numeric" aria-label="{{ $t['fillAddStock'] }}" x-model="fill.add" />
            </div>
            <div class="grid gap-1">
                <span class="text-caption text-muted-foreground">{{ $t['fillSkuPrefix'] }}</span>
                <x-nq::field.input type="text" dir="ltr" aria-label="{{ $t['fillSkuPrefix'] }}" x-model="fill.sku" />
            </div>
        </div>
        <div class="flex flex-wrap gap-2">
            <x-nq::button type="button" size="sm" variant="secondary" x-bind:disabled="! canFill" x-on:click="applyFill()">{{ $t['fillApply'] }}</x-nq::button>
            <x-nq::button type="button" size="sm" variant="ghost" x-bind:disabled="! some" x-on:click="clearSelection()">{{ $t['fillClear'] }}</x-nq::button>
        </div>
    </div>

    <div x-show="variants.length > 0" class="relative w-full overflow-x-auto rounded-card border border-border bg-card">
        <div role="table" aria-label="{{ $t['variantsTitle'] }}" class="table w-full min-w-[52rem] border-collapse">
            <div role="rowgroup" class="table-header-group border-b border-border">
                <div role="row" class="table-row">
                    <div role="columnheader" class="table-cell w-10 px-2">
                        <x-nq::checkbox aria-label="{{ $t['selectAll'] }}" x-on:click="toggleAll(! all)" x-bind:checked="all" />
                    </div>
                    <div role="columnheader" class="table-cell {{ $th }}">{{ $t['variantLabel'] }}</div>
                    <div role="columnheader" class="table-cell {{ $th }}">{{ $t['skuCol'] }}</div>
                    <div role="columnheader" class="table-cell {{ $th }}">{{ $t['priceCol2'] }}</div>
                    <div role="columnheader" class="table-cell {{ $th }}">{{ $t['compareCol'] }}</div>
                    <div role="columnheader" class="table-cell {{ $th }}">{{ $t['stockCol2'] }}</div>
                    <div role="columnheader" class="table-cell {{ $th }}">{{ $t['imageCol'] }}</div>
                </div>
            </div>
            <div role="rowgroup" class="table-row-group divide-y divide-border">
                <template x-for="(v, i) in variants" x-bind:key="v.id">
                    <div role="row" data-slot="variant-row" x-bind:data-selected="selected[v.id] ? '' : null" class="table-row data-[selected]:bg-nq-selected">
                        <div role="cell" class="table-cell {{ $td }}">
                            <x-nq::checkbox x-model="selected[v.id]" x-bind:aria-label="tt(`selectVariant`, label(v, i))" />
                        </div>
                        <div role="cell" class="table-cell {{ $td }} font-medium" x-text="label(v, i)"></div>
                        <div role="cell" class="table-cell {{ $td }}">
                            <input type="text" dir="ltr" x-model="v.sku" x-bind:disabled="off" x-bind:aria-label="`{{ $t['skuCol'] }}: ${label(v, i)}`" x-bind:aria-invalid="isDup(v) ? `true` : null"
                                class="h-control-sm w-full min-w-24 rounded-control border border-input bg-card px-2 text-body-sm text-foreground outline-none focus-visible:border-nq-focus aria-invalid:border-nq-danger" />
                            <span class="mt-0.5 block text-caption text-nq-danger-text" x-show="isDup(v)">{{ $t['dupSku'] }}</span>
                        </div>
                        <div role="cell" class="table-cell {{ $td }}">
                            <x-nq::currency-input :currency="$currency" x-bind:aria-label="`{{ $t['priceCol2'] }}: ${label(v, i)}`" x-model="v.price" />
                        </div>
                        <div role="cell" class="table-cell {{ $td }}">
                            <x-nq::currency-input :currency="$currency" x-bind:aria-label="`{{ $t['compareCol'] }}: ${label(v, i)}`" x-model="v.compareAt" />
                            <span class="mt-0.5 block text-caption text-nq-danger-text" x-show="badCompare(v)">{{ $t['issues.compare-at'] }}</span>
                        </div>
                        <div role="cell" class="table-cell {{ $td }}">
                            <input type="text" inputmode="numeric" x-bind:value="v.stock ?? ''" x-on:input="setStock(v, $event.target.value)" x-bind:disabled="off" x-bind:aria-label="`{{ $t['stockCol2'] }}: ${label(v, i)}`"
                                class="h-control-sm w-20 rounded-control border border-input bg-card px-2 text-body-sm tabular-nums text-foreground outline-none focus-visible:border-nq-focus" />
                        </div>
                        <div role="cell" class="table-cell {{ $td }}">
                            <x-nq::native-select size="sm" x-model="v.image" x-bind:disabled="off ? true : images.length === 0" x-bind:aria-label="`{{ $t['imageCol'] }}: ${label(v, i)}`">
                                <option value="" x-bind:selected="! v.image">{{ $t['noImage'] }}</option>
                                <template x-for="(im, k) in images" x-bind:key="im.src">
                                    <option x-bind:value="im.src" x-bind:selected="v.image === im.src" x-text="imageAlt(im, k)"></option>
                                </template>
                            </x-nq::native-select>
                        </div>
                    </div>
                </template>
            </div>
        </div>
    </div>
</section>
