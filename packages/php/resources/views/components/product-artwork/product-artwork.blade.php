{{-- <x-nq::product-artwork brand="mahaam" class="aspect-[16/10] w-80" />
     Product artwork: the official mark on a field of the product's own brand colour. The field is a gradient derived from the manifest, never a raster, so it follows light, dark and every brand without assets.
     The mark is drawn by <x-nq::product-mark> and is never recoloured, cropped or stretched. brand sets data-brand, so --nq-brand inside is that product's colour. mark-size: px (default 48).
     The default slot replaces the centred mark: a badge plus the mark, a product glimpse, a whole banner layout. --}}
@props(['brand', 'markSize' => 48])
@php
    $field = 'background-image: radial-gradient(110% 130% at var(--art-x) 0%, color-mix(in oklab, var(--nq-brand) 34%, transparent), transparent 65%),radial-gradient(90% 110% at calc(100% - var(--art-x)) 100%, color-mix(in oklab, var(--nq-brand) 14%, transparent), transparent 70%)';
    $style = collect([$field, $attributes->get('style')])->filter()->implode('; ');
@endphp
<div data-slot="product-artwork" data-brand="{{ $brand }}" style="{{ $style }}"
    {{ $attributes->except('style')->cn('relative isolate flex items-center justify-center overflow-hidden rounded-card bg-nq-surface-raised [--art-x:100%] rtl:[--art-x:0%]') }}>
    <span aria-hidden="true" class="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-[color-mix(in_oklab,var(--nq-brand)_16%,transparent)]"></span>
    @if ($slot->isEmpty())
        <x-nq::product-mark :brand="$brand" :size="$markSize" title="" />
    @else
        {{ $slot }}
    @endif
</div>
