{{-- <x-nq::store-listing.product-image src="/tee.jpg" alt="Everyday tee" class="rounded-card" />
     Fills its parent. A neutral token-coloured placeholder shows when the image is missing or fails to load.
     src, alt: the image. eager: load eagerly (above the fold; default lazy). width, height.
     src-expr, alt-expr: JavaScript expressions instead of src/alt, for use inside an Alpine scope (<template x-for>). --}}
@props(['src' => null, 'alt' => '', 'eager' => false, 'width' => null, 'height' => null, 'srcExpr' => null, 'altExpr' => null])
@php $bound = $srcExpr !== null; @endphp
<div class="contents" x-data="{ failed: false }" @if ($bound) x-effect="{{ $srcExpr }}; failed = false" @endif>
    <div role="img" @if ($bound) x-bind:aria-label="{{ $altExpr ?? "''" }}" @else aria-label="{{ $alt }}" @endif data-slot="{{ $attributes->get('data-slot', 'store-image-placeholder') }}"
        @if ($bound) x-show="!({{ $srcExpr }}) || failed" style="display: none" @elseif ($src) x-show="failed" style="display: none" @endif
        {{ $attributes->except('data-slot')->cn('flex size-full items-center justify-center bg-secondary text-muted-foreground') }}>
        <x-lucide-image-off aria-hidden="true" class="size-6 opacity-60" />
    </div>
    @if ($bound || $src)
        <img @if ($bound) x-bind:src="{{ $srcExpr }}" x-bind:alt="{{ $altExpr ?? "''" }}" x-show="({{ $srcExpr }}) && !failed" @else src="{{ $src }}" alt="{{ $alt }}" @endif
            @if ($width) width="{{ $width }}" @endif @if ($height) height="{{ $height }}" @endif
            loading="{{ $eager ? 'eager' : 'lazy' }}" decoding="async" data-slot="{{ $attributes->get('data-slot', 'store-image') }}" x-on:error="failed = true"
            {{ $attributes->except('data-slot')->cn('size-full object-cover') }}>
    @endif
</div>
