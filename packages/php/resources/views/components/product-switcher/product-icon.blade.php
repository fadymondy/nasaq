{{-- <x-nq::product-switcher.product-icon :product="['id' => 'mahaam', 'brand' => 'mahaam', 'name' => 'Mahaam']" :size="24" />
     The official mark at size, untouched. product: brand (a Nasaq brand key), logo-src (the host's own official logo image), logo (trusted HTML for it), name.
     With none of them: the initial in a tile, never a stand-in pictogram. --}}
@props(['product', 'size' => 20])
@php
    $known = ['nasaq', 'fadymondy', 'mahaam', 'zekra', 'moharrik', 'seatfor', 'health-debug', 'circlexo', 'hosbah', 'orchestra', 'togo', 'managy', 'cabrain', 'claude-digital-twin', 'booki', 'cloudy', 'orchestra-mcp', 'fady-mondy', 'togo-framework'];
    $isKnown = ! empty($product['brand']) && in_array($product['brand'], $known, true);
@endphp
@if ($isKnown)
    <x-nq::product-mark :brand="$product['brand']" :size="$size" title="" />
@elseif (! empty($product['logoSrc']))
    <span class="inline-flex shrink-0 items-center justify-center overflow-hidden" style="width: {{ $size }}px; height: {{ $size }}px"><img src="{{ $product['logoSrc'] }}" alt="" class="size-full object-contain" draggable="false"></span>
@elseif (! empty($product['logo']))
    <span class="inline-flex shrink-0 items-center justify-center overflow-hidden" style="width: {{ $size }}px; height: {{ $size }}px">{!! $product['logo'] !!}</span>
@else
    <span aria-hidden="true" class="inline-flex shrink-0 items-center justify-center rounded-[4px] bg-secondary font-medium text-muted-foreground" style="width: {{ $size }}px; height: {{ $size }}px; font-size: {{ round($size * 0.45) }}px">{{ mb_substr($product['name'] ?? '', 0, 1) }}</span>
@endif
