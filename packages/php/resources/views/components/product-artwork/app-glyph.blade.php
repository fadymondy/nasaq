{{-- <x-nq::product-artwork.app-glyph icon="package" size="lg" />   or   <x-nq::product-artwork.app-glyph><x-lucide-package /></x-nq::product-artwork.app-glyph>
     The icon for an app or module that has no mark of its own (Inventory, Payments): a glyph on a brand tint. It is not a logo. Never use it to stand in for a product that has an official mark: use <x-nq::product-mark>.
     icon: a lucide icon name (or put an icon in the slot). brand: tint with this product's brand instead of the surrounding one. size: sm | md (default) | lg. --}}
@props(['icon' => null, 'brand' => null, 'size' => 'md'])
@php
    $sizes = [
        'sm' => 'size-7 rounded-control [&_svg]:size-3.5',
        'md' => 'size-9 rounded-control [&_svg]:size-4',
        'lg' => 'size-11 rounded-card [&_svg]:size-5',
    ];
@endphp
<span data-slot="app-glyph" @if ($brand) data-brand="{{ $brand }}" @endif aria-hidden="true"
    {{ $attributes->cn(['inline-flex shrink-0 items-center justify-center bg-[color-mix(in_oklab,var(--nq-brand)_14%,var(--nq-surface-raised))] text-nq-brand', $sizes[$size] ?? $sizes['md']]) }}>
    @if ($slot->isEmpty() && $icon)
        <x-dynamic-component :component="'lucide-'.$icon" />
    @else
        {{ $slot }}
    @endif
</span>
