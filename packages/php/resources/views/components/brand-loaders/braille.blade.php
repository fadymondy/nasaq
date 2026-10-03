{{-- <x-nq::brand-loaders.braille />   <x-nq::brand-loaders.braille label="Saving" class="text-h3" interval="120" />
     A one-character text spinner made of braille dots; inherits the text colour and size. label: screen-reader text (default "Loading" / "جارٍ التحميل").
     frames: an array of one-character frames (default the ten-frame braille spinner). interval: ms per frame (80). Stands still under prefers-reduced-motion. Needs the Alpine runtime. --}}
@props(['label' => null, 'frames' => null, 'interval' => 80])
@php
    $frames = array_values($frames ?: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']);
    $label ??= \Nasaq\Nasaq::t('Loading', 'جارٍ التحميل');
@endphp
<span data-slot="{{ $attributes->get('data-slot', 'braille-loader') }}" role="status" x-data="nqBrailleLoader({!! \Illuminate\Support\Js::from($frames) !!}, {{ (int) $interval }})"
    {{ $attributes->except('data-slot')->cn('inline-flex') }}>
    <span aria-hidden="true" dir="ltr" class="inline-block w-[1ch] text-center font-mono leading-none" x-text="frame">{{ $frames[0] }}</span>
    <span class="sr-only">{{ $label }}</span>
</span>
