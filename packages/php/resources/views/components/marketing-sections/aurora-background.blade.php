{{-- <x-nq::marketing-sections.aurora-background class="p-10"> … </x-nq::marketing-sections.aurora-background>
     A soft, slowly drifting colour glow for the back of a hero or banner. Decoration only (aria-hidden, ignores the pointer), painted behind its children.
     tone: brand (default) | multi (mixes the tag colours). animate: drift slowly (true; the Alpine runtime holds it still under prefers-reduced-motion). fade: fade the glow out toward the bottom (true). --}}
@props(['tone' => 'brand', 'animate' => true, 'fade' => true])
@php
    $colors = [
        'brand' => ['var(--nq-brand)', 'var(--nq-tag-blue, var(--nq-brand))', 'var(--nq-tag-violet, var(--nq-brand))'],
        'multi' => ['var(--nq-tag-violet, var(--nq-brand))', 'var(--nq-tag-blue, var(--nq-brand))', 'var(--nq-tag-green, var(--nq-brand))'],
    ][$tone] ?? ['var(--nq-brand)', 'var(--nq-tag-blue, var(--nq-brand))', 'var(--nq-tag-violet, var(--nq-brand))'];
    $spots = [
        ['top' => '-30%', 'inset-inline-start' => '-10%', 'size' => '55%'],
        ['top' => '-20%', 'inset-inline-end' => '-8%', 'size' => '50%'],
        ['top' => '5%', 'inset-inline-start' => '30%', 'size' => '40%'],
    ];
    $mask = 'mask-image: linear-gradient(to bottom, black 55%, transparent); -webkit-mask-image: linear-gradient(to bottom, black 55%, transparent)';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'aurora-background') }}" x-data="nqAuroraBackground({{ \Illuminate\Support\Js::from(['animate' => (bool) $animate]) }})"
    {{ $attributes->except('data-slot')->cn('relative isolate overflow-hidden') }}>
    <div aria-hidden="true" class="pointer-events-none absolute inset-0 -z-10 overflow-hidden" @if ($fade) style="{{ $mask }}" @endif>
        @foreach ($spots as $i => $spot)
            <span data-blob class="absolute aspect-square rounded-full opacity-25 blur-3xl"
                style="top: {{ $spot['top'] }}; @if (isset($spot['inset-inline-start']))inset-inline-start: {{ $spot['inset-inline-start'] }}; @endif @if (isset($spot['inset-inline-end']))inset-inline-end: {{ $spot['inset-inline-end'] }}; @endif width: {{ $spot['size'] }}; background: {{ $colors[$i] }}"></span>
        @endforeach
    </div>
    {{ $slot }}
</div>
