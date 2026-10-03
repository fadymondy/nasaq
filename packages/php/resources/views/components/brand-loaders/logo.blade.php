{{-- <x-nq::brand-loaders.logo />   <x-nq::brand-loaders.logo :size="80" variant="pulse" />   <x-nq::brand-loaders.logo :value="40"><x-slot:mark><x-nq::product-mark brand="mahaam" :size="48" /></x-slot:mark></x-nq::brand-loaders.logo>
     Motion around a brand mark; the mark itself is never redrawn, recoloured or moved. mark slot: the host's official mark (default the configured brand's product-mark).
     size: mark px (56). variant: ring | pulse. value: 0..100 for a progress ring; omit for an endless spinning arc. label. Motion stops under prefers-reduced-motion. --}}
@props(['size' => 56, 'variant' => 'ring', 'value' => null, 'label' => null])
@php
    $label ??= \Nasaq\Nasaq::t('Loading', 'جارٍ التحميل');
    $box = (int) round($size * 1.7);
    $determinate = is_numeric($value);
    $pct = $determinate ? min(100, max(0, (float) $value)) : 25;
    $circumference = 2 * M_PI * 46;
    $dashOffset = $circumference * (1 - $pct / 100);
    $hasMark = trim((string) ($mark ?? '')) !== '';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'logo-loader') }}" data-variant="{{ $variant }}" role="{{ $determinate ? 'progressbar' : 'status' }}" aria-label="{{ $label }}"
    @if ($determinate) aria-valuemin="0" aria-valuemax="100" aria-valuenow="{{ round($pct) }}" @endif
    style="width: {{ $box }}px; height: {{ $box }}px"
    {{ $attributes->except(['data-slot', 'style'])->cn('relative inline-flex shrink-0 items-center justify-center') }}>
    @if ($variant === 'ring')
        <svg aria-hidden="true" viewBox="0 0 100 100" class="{{ \Nasaq\Cn::merge('absolute inset-0 size-full', $determinate ? '-rotate-90' : 'motion-safe:animate-spin motion-reduce:hidden') }}">
            <circle cx="50" cy="50" r="46" fill="none" stroke-width="2" class="stroke-border" />
            <circle cx="50" cy="50" r="46" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="{{ round($circumference, 4) }}" stroke-dashoffset="{{ round($dashOffset, 4) }}"
                class="{{ \Nasaq\Cn::merge('stroke-primary', $determinate ? 'transition-[stroke-dashoffset] duration-300 ease-nq motion-reduce:transition-none' : '') }}" />
        </svg>
    @endif
    <span aria-hidden="true" class="{{ \Nasaq\Cn::merge('inline-flex', $variant === 'pulse' ? 'motion-safe:animate-pulse' : '') }}">
        @if ($hasMark){{ $mark }}@else<x-nq::product-mark :size="$size" title="" />@endif
    </span>
</div>
