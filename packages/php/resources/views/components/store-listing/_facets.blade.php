{{-- Internal: the facet groups (categories, price, brand, options, rating, availability). One partial for the page sidebar (target "filters")
     and the mobile sheet (target "draft"). Needs: $target, $f (filters), $facets (nq_sl_facets), $exp, $code, $optionIds (array|null).
     Every count, selection and disabled state is bound to the listing's count(), isSel(), dead(), catSel(), toggleBrand(), toggleOpt(), setRating(),
     priceDraft[target] and the target's inStock / onSale. --}}
@php
    $lo = (int) floor($facets['price']['min'] / (10 ** $exp));
    $hi = (int) ceil($facets['price']['max'] / (10 ** $exp));
    $price = $f['price'] ? [$f['price'][0] / (10 ** $exp), $f['price'][1] / (10 ** $exp)] : [$lo, $hi];
    $row = 'rounded-control px-2 py-1 text-start text-body-sm outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus';
    $groupBtn = 'flex w-full items-center justify-between gap-2 rounded-sm py-1 text-start text-label text-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus';
    $T = json_encode($target);
    $options = array_values(array_filter($facets['options'], fn ($o) => $optionIds === null || in_array($o['id'], $optionIds, true)));
    $brandLimit = 6;
@endphp
<div class="flex flex-col">
    @if (count($facets['categories']))
        <section class="border-b border-border py-3 last:border-b-0" data-slot="store-facet-group" x-data="{ open: true }">
            <h3><button type="button" aria-expanded="true" x-bind:aria-expanded="open ? 'true' : 'false'" x-on:click="open = !open" class="{{ $groupBtn }}">{{ nq_sl_t('categories') }}<x-lucide-chevron-down aria-hidden="true" class="size-4 rotate-180 text-muted-foreground transition-transform motion-reduce:transition-none" x-bind:class="{ 'rotate-180': open }" /></button></h3>
            <div x-show="open" class="pt-2">
                <button type="button" @if ($f['category'] === null) aria-current="true" @endif x-bind:aria-current="{{ $target }}.category === null ? 'true' : undefined"
                    x-on:click="setCategory(@js($target), null)" x-bind:class="{ 'bg-nq-selected font-medium': {{ $target }}.category === null, 'text-muted-foreground': !({{ $target }}.category === null) }"
                    class="mb-0.5 w-full {{ $row }} {{ $f['category'] === null ? 'bg-nq-selected font-medium' : 'text-muted-foreground' }}">{{ nq_sl_t('allCategories') }}</button>
                @include('nasaq::components.store-listing._category-tree', ['nodes' => $facets['categories'], 'target' => $target, 'depth' => 0])
            </div>
        </section>
    @endif

    @if ($hi > $lo)
        <section class="border-b border-border py-3 last:border-b-0" data-slot="store-facet-group" x-data="{ open: true }">
            <h3><button type="button" aria-expanded="true" x-bind:aria-expanded="open ? 'true' : 'false'" x-on:click="open = !open" class="{{ $groupBtn }}">{{ nq_sl_t('price') }}<x-lucide-chevron-down aria-hidden="true" class="size-4 rotate-180 text-muted-foreground transition-transform motion-reduce:transition-none" x-bind:class="{ 'rotate-180': open }" /></button></h3>
            <div x-show="open" class="pt-2">
                <div class="px-2">
                    <x-nq::slider x-model="priceDraft.{{ $target }}" :value="$price" :aria-label="nq_sl_t('price')" :min="$lo" :max="$hi" :step="max(1, (int) round(($hi - $lo) / 50))"
                        :thumb-labels="[nq_sl_t('priceMin'), nq_sl_t('priceMax')]" :format="['style' => 'currency', 'currency' => $code, 'maximumFractionDigits' => 0]" :show-value="true" />
                </div>
            </div>
        </section>
    @endif

    @if (count($facets['brands']) > 1)
        <section class="border-b border-border py-3 last:border-b-0" data-slot="store-facet-group" x-data="{ open: true }">
            <h3><button type="button" aria-expanded="true" x-bind:aria-expanded="open ? 'true' : 'false'" x-on:click="open = !open" class="{{ $groupBtn }}">{{ nq_sl_t('brand') }}<x-lucide-chevron-down aria-hidden="true" class="size-4 rotate-180 text-muted-foreground transition-transform motion-reduce:transition-none" x-bind:class="{ 'rotate-180': open }" /></button></h3>
            <div x-show="open" class="pt-2">
                <ul class="flex flex-col gap-1.5">
                    @foreach ($facets['brands'] as $i => $b)
                        <li x-data="box(@js($target), @js($b['id']))" x-show="brandShown(@js($target), @js($b['id']), {{ $i }})" x-bind:style="{ order: brandOrder(@js($target), @js($b['id'])) }"
                            @if ($i >= $brandLimit && ! $b['selected']) style="display: none" @endif>
                            <label x-bind:class="{ 'opacity-45': count(@js($target), 'brand', @js($b['id'])) === 0 && !on }" class="flex cursor-pointer items-center gap-2 text-body-sm {{ $b['count'] === 0 && ! $b['selected'] ? 'opacity-45' : '' }}">
                                <x-nq::checkbox :checked="$b['selected']" x-model="on" />
                                <span class="min-w-0 flex-1 truncate">{{ $b['label'] }}</span>
                                <bdi class="text-caption tabular-nums text-muted-foreground" x-text="n(count(@js($target), 'brand', @js($b['id'])))">{{ number_format($b['count']) }}</bdi>
                            </label>
                        </li>
                    @endforeach
                </ul>
                @if (count($facets['brands']) > $brandLimit)
                    <x-nq::button variant="link" size="sm" class="mt-1" x-on:click="brandsAll.{{ $target }} = !brandsAll.{{ $target }}"><span x-text="brandsAll.{{ $target }} ? s('showLess') : s('showMore')">{{ nq_sl_t('showMore') }}</span></x-nq::button>
                @endif
            </div>
        </section>
    @endif

    @foreach ($options as $o)
        @php $swatch = in_array($o['display'] ?? 'button', ['swatch', 'image'], true); @endphp
        <section class="border-b border-border py-3 last:border-b-0" data-slot="store-facet-group" x-data="{ open: true }">
            <h3><button type="button" aria-expanded="true" x-bind:aria-expanded="open ? 'true' : 'false'" x-on:click="open = !open" class="{{ $groupBtn }}">{{ $o['name'] }}<x-lucide-chevron-down aria-hidden="true" class="size-4 rotate-180 text-muted-foreground transition-transform motion-reduce:transition-none" x-bind:class="{ 'rotate-180': open }" /></button></h3>
            <div x-show="open" class="pt-2">
                <div role="group" aria-label="{{ $o['name'] }}" class="flex flex-wrap {{ $swatch ? 'gap-2' : 'gap-1.5' }}">
                    @foreach ($o['values'] as $v)
                        @php
                            $dead = $v['count'] === 0 && ! $v['selected'];
                            $sel = "isSel(".json_encode($target).", 'opt', ".json_encode($o['id']).", ".json_encode($v['id']).")";
                            $cnt = "count(".json_encode($target).", 'opt', ".json_encode($o['id']).", ".json_encode($v['id']).")";
                            $label = $v['label'].' ('.number_format($v['count']).')';
                        @endphp
                        @if ($swatch)
                            <button type="button" aria-pressed="{{ $v['selected'] ? 'true' : 'false' }}" aria-label="{{ $label }}" title="{{ $label }}" @if ($dead) disabled @endif
                                @if (! empty($v['color'])) style="background-color: {{ $v['color'] }}" @endif
                                x-bind:aria-pressed="{{ $sel }} ? 'true' : 'false'" x-bind:disabled="dead(@js($target), @js($o['id']), @js($v['id']))"
                                x-bind:aria-label="@js($v['label']) + ' (' + n({{ $cnt }}) + ')'" x-bind:title="@js($v['label']) + ' (' + n({{ $cnt }}) + ')'"
                                x-bind:class="{ 'ring-2 ring-primary ring-offset-2 ring-offset-background': {{ $sel }} }"
                                x-on:click="toggleOpt(@js($target), @js($o['id']), @js($v['id']))"
                                class="size-7 rounded-full border border-nq-line-strong outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:opacity-35 {{ $v['selected'] ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : '' }}"></button>
                        @else
                            <button type="button" aria-pressed="{{ $v['selected'] ? 'true' : 'false' }}" @if ($dead) disabled @endif
                                x-bind:aria-pressed="{{ $sel }} ? 'true' : 'false'" x-bind:disabled="dead(@js($target), @js($o['id']), @js($v['id']))"
                                x-bind:class="{ 'border-primary bg-nq-selected text-foreground': {{ $sel }}, 'border-border bg-card text-foreground hover:bg-nq-hover': !({{ $sel }}) }"
                                x-on:click="toggleOpt(@js($target), @js($o['id']), @js($v['id']))"
                                class="h-8 min-w-10 rounded-control border px-2.5 text-label outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:opacity-40 {{ $v['selected'] ? 'border-primary bg-nq-selected text-foreground' : 'border-border bg-card text-foreground hover:bg-nq-hover' }}"><bdi>{{ $v['label'] }}</bdi></button>
                        @endif
                    @endforeach
                </div>
            </div>
        </section>
    @endforeach

    <section class="border-b border-border py-3 last:border-b-0" data-slot="store-facet-group" x-data="{ open: true }">
        <h3><button type="button" aria-expanded="true" x-bind:aria-expanded="open ? 'true' : 'false'" x-on:click="open = !open" class="{{ $groupBtn }}">{{ nq_sl_t('rating') }}<x-lucide-chevron-down aria-hidden="true" class="size-4 rotate-180 text-muted-foreground transition-transform motion-reduce:transition-none" x-bind:class="{ 'rotate-180': open }" /></button></h3>
        <div x-show="open" class="pt-2">
            <div role="radiogroup" aria-label="{{ nq_sl_t('rating') }}" class="flex flex-col gap-0.5">
                @foreach ($facets['ratings'] as $r)
                    <button type="button" role="radio" aria-checked="{{ $r['selected'] ? 'true' : 'false' }}" x-bind:aria-checked="isSel(@js($target), 'rating', {{ $r['min'] }}) ? 'true' : 'false'"
                        x-on:click="setRating(@js($target), {{ $r['min'] }})" x-bind:class="{ 'bg-nq-selected font-medium': isSel(@js($target), 'rating', {{ $r['min'] }}) }"
                        class="flex items-center justify-between gap-2 {{ $row }} {{ $r['selected'] ? 'bg-nq-selected font-medium' : '' }}">
                        <span class="inline-flex items-center gap-1.5"><x-lucide-star aria-hidden="true" class="size-3.5 fill-nq-accent text-nq-accent" />{{ nq_sl_t('andUp', ['n' => $r['min']]) }}</span>
                        <bdi class="text-caption tabular-nums text-muted-foreground" x-text="n(count(@js($target), 'rating', {{ $r['min'] }}))">{{ number_format($r['count']) }}</bdi>
                    </button>
                @endforeach
            </div>
        </div>
    </section>

    <section class="border-b border-border py-3 last:border-b-0" data-slot="store-facet-group" x-data="{ open: true }">
        <h3><button type="button" aria-expanded="true" x-bind:aria-expanded="open ? 'true' : 'false'" x-on:click="open = !open" class="{{ $groupBtn }}">{{ nq_sl_t('availability') }}<x-lucide-chevron-down aria-hidden="true" class="size-4 rotate-180 text-muted-foreground transition-transform motion-reduce:transition-none" x-bind:class="{ 'rotate-180': open }" /></button></h3>
        <div x-show="open" class="pt-2">
            <ul class="flex flex-col gap-1.5">
                <li>
                    <label class="flex cursor-pointer items-center gap-2 text-body-sm">
                        <x-nq::checkbox :checked="$f['inStock']" x-model="{{ $target }}.inStock" />
                        <span class="flex-1">{{ nq_sl_t('inStock') }}</span>
                        <bdi class="text-caption tabular-nums text-muted-foreground" x-text="n(count(@js($target), 'inStock'))">{{ number_format($facets['inStock']) }}</bdi>
                    </label>
                </li>
                <li>
                    <label class="flex cursor-pointer items-center gap-2 text-body-sm">
                        <x-nq::checkbox :checked="$f['onSale']" x-model="{{ $target }}.onSale" />
                        <span class="flex-1">{{ nq_sl_t('onSale') }}</span>
                        <bdi class="text-caption tabular-nums text-muted-foreground" x-text="n(count(@js($target), 'onSale'))">{{ number_format($facets['onSale']) }}</bdi>
                    </label>
                </li>
            </ul>
        </div>
    </section>
</div>
