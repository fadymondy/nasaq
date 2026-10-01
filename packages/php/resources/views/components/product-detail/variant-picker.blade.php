{{-- <x-nq::product-detail.variant-picker :product="$product" :selection="['color' => 'black']" />
     One radio group per option axis: swatch | image | button (the default) or select, by option display. An unreachable value
     is hidden (impossible="hide", default) or disabled (impossible="disable"); a sold-out one is struck through and spoken as
     "Sold out". Server-rendered for the starting selection; inside <x-nq::product-detail> the root's Alpine scope
     (selection, pick(), avail(), isChecked(), shown(), tabindexFor(), spoken(), pickedValue(), radioKey(), invalid) keeps it live.
     size-guide: a [title?, description?, columns, rows, footer?] array shown as a "Size guide" link on the size-guide-option-id axis.
     Used on its own it is static markup: add your own x-data with those members. --}}
@include('nasaq::components.product-detail._logic')
@props(['product', 'selection' => [], 'impossible' => 'hide', 'invalid' => [], 'sizeGuide' => null, 'sizeGuideOptionId' => 'size', 'sizeGuideSelected' => null])
@php
    $t = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $rtl = \Nasaq\Nasaq::rtl();
    $uid = 'nq-pdp-'.substr(md5((string) ($product['id'] ?? '')), 0, 6);
    $ring = 'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus';
    $strike = 'absolute start-1/2 top-1/2 h-px w-[150%] -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-nq-danger';
@endphp
<div data-slot="product-variant-picker" {{ $attributes->cn('flex flex-col gap-4') }}>
    @foreach ($product['options'] ?? [] as $option)
        @php
            $oid = $option['id'];
            $display = $option['display'] ?? 'button';
            $avail = nq_pdp_availability($product, $selection, $oid);
            $picked = collect($option['values'])->firstWhere('id', $selection[$oid] ?? null);
            $isInvalid = in_array($oid, $invalid, true);
            $labelId = $uid.'-'.$oid.'-label';
        @endphp
        <div data-slot="product-option" data-option="{{ $oid }}" @if ($isInvalid) data-invalid @endif
            :data-invalid="invalid.includes(@js($oid)) ? '' : undefined" class="flex flex-col gap-2">
            <div class="flex items-baseline justify-between gap-3">
                <span id="{{ $labelId }}" class="text-label text-foreground">
                    {{ $option['name'] }}
                    <span class="text-muted-foreground" x-show="pickedValue(@js($oid))" @if (! $picked) style="display:none" @endif>: </span>
                    <span class="font-normal text-muted-foreground" x-text="pickedValue(@js($oid))">{{ $picked['label'] ?? '' }}</span>
                </span>
                @if ($sizeGuide && $oid === $sizeGuideOptionId)
                    <x-nq::product-detail.size-guide :guide="$sizeGuide" :selected="$sizeGuideSelected ?? ($picked['label'] ?? null)" />
                @endif
            </div>
            @if ($display === 'select')
                <x-nq::select x-model="axis[@js($oid)]" :value="$picked['id'] ?? null">
                    <x-nq::select.trigger :invalid="$isInvalid" aria-labelledby="{{ $labelId }}" class="max-w-xs">
                        <x-nq::select.value :placeholder="$t('Select '.$option['name'], 'اختر '.$option['name'])" />
                    </x-nq::select.trigger>
                    <x-nq::select.content>
                        @foreach ($option['values'] as $v)
                            <x-nq::select.item :value="$v['id']" :disabled="$avail[$v['id']] === 'none'">{{ $v['label'] }}{{ $avail[$v['id']] === 'out' ? ' · '.$t('Sold out', 'نفد المخزون') : '' }}</x-nq::select.item>
                        @endforeach
                    </x-nq::select.content>
                </x-nq::select>
            @else
                <div role="radiogroup" dir="{{ $rtl ? 'rtl' : 'ltr' }}" aria-labelledby="{{ $labelId }}" @if ($isInvalid) aria-invalid="true" @endif
                    :aria-invalid="invalid.includes(@js($oid)) ? 'true' : undefined" x-on:keydown="radioKey($event, @js($oid))"
                    class="flex flex-wrap gap-2 {{ $isInvalid ? 'rounded-control outline-1 outline-offset-4 outline-nq-danger' : '' }}"
                    :class="{ 'rounded-control outline-1 outline-offset-4 outline-nq-danger': invalid.includes(@js($oid)) }">
                    @foreach ($option['values'] as $v)
                        @php
                            $vid = $v['id'];
                            $state = $avail[$vid];
                            $checked = ($selection[$oid] ?? null) === $vid;
                            $hidden = $impossible !== 'disable' && $state === 'none';
                            $spoken = $state === 'out' ? $v['label'].', '.$t('Sold out', 'نفد المخزون') : ($state === 'none' ? $v['label'].', '.$t('Unavailable', 'غير متاح') : $v['label']);
                            $first = collect($option['values'])->first(fn ($x) => $avail[$x['id']] !== 'none');
                            $tab = ($selection[$oid] ?? null) ? ($checked ? 0 : -1) : (($first['id'] ?? null) === $vid ? 0 : -1);
                            $cls = match ($display) {
                                'swatch' => 'relative inline-flex size-9 items-center justify-center rounded-full border border-nq-line-strong p-0.5 transition-shadow duration-150 ease-nq '.$ring.' data-checked:border-foreground data-checked:ring-1 data-checked:ring-foreground data-disabled:cursor-not-allowed data-disabled:opacity-40',
                                'image' => 'relative size-14 overflow-hidden rounded-control border border-border bg-secondary transition-colors duration-150 ease-nq '.$ring.' data-checked:border-foreground data-checked:ring-1 data-checked:ring-foreground data-disabled:cursor-not-allowed data-disabled:opacity-40'.($state === 'out' ? ' opacity-60' : ''),
                                default => 'relative inline-flex h-control min-w-11 items-center justify-center rounded-control border px-3 text-label transition-colors duration-150 ease-nq '.$ring.' border-border bg-card text-foreground hover:bg-nq-hover data-checked:border-foreground data-checked:ring-1 data-checked:ring-foreground data-disabled:cursor-not-allowed data-disabled:opacity-40 data-disabled:hover:bg-card'.($state === 'out' ? ' border-dashed text-muted-foreground line-through decoration-nq-danger' : ''),
                            };
                        @endphp
                        <button type="button" role="radio" aria-checked="{{ $checked ? 'true' : 'false' }}" tabindex="{{ $tab }}"
                            aria-label="{{ $spoken }}" data-availability="{{ $state }}"
                            @if ($checked) data-checked @else data-unchecked @endif
                            @if ($state === 'none') disabled data-disabled @endif
                            @if ($hidden) hidden style="display:none" @endif
                            @if ($display === 'swatch') title="{{ $state === 'out' ? $v['label'].' · '.$t('Sold out', 'نفد المخزون') : $v['label'] }}" @endif
                            x-show="shown(@js($oid), @js($vid))"
                            :aria-checked="isChecked(@js($oid), @js($vid))" :tabindex="tabindexFor(@js($oid), @js($vid))"
                            :aria-label="spoken(@js($v['label']), @js($oid), @js($vid))" :data-availability="avail(@js($oid), @js($vid))"
                            :data-checked="isChecked(@js($oid), @js($vid)) ? '' : undefined" :data-unchecked="isChecked(@js($oid), @js($vid)) ? undefined : ''"
                            :disabled="avail(@js($oid), @js($vid)) === 'none'" :data-disabled="avail(@js($oid), @js($vid)) === 'none' ? '' : undefined"
                            x-on:click="pick(@js($oid), @js($vid))"
                            class="{{ $cls }}">
                            @if ($display === 'swatch')
                                <span aria-hidden="true" class="relative block size-full overflow-hidden rounded-full border border-border" style="background-color: {{ $v['color'] ?? 'transparent' }}">
                                    <span x-show="avail(@js($oid), @js($vid)) === 'out'" @if ($state !== 'out') style="display:none" @endif class="{{ $strike }}"></span>
                                </span>
                            @elseif ($display === 'image')
                                @if (! empty($v['image']))
                                    <img src="{{ $v['image'] }}" alt="" width="56" height="56" loading="lazy" class="size-full object-cover">
                                @else
                                    <span class="flex size-full items-center justify-center text-caption">{{ $v['label'] }}</span>
                                @endif
                                <span aria-hidden="true" x-show="avail(@js($oid), @js($vid)) === 'out'" @if ($state !== 'out') style="display:none" @endif class="{{ $strike }}"></span>
                            @else
                                <bdi>{{ $v['label'] }}</bdi>
                            @endif
                        </button>
                    @endforeach
                </div>
            @endif
        </div>
    @endforeach
</div>
