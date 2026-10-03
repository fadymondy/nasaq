{{-- <x-nq::marketing-sections.grid-background class="p-10"> … </x-nq::marketing-sections.grid-background>
     A quiet line or dot grid behind a section, drawn in the theme's line colour and faded toward the edges. Decoration only (static, no runtime needed).
     cell: cell size in pixels (40). pattern: lines (default) | dots. fade: fade the pattern out toward the edges (true). --}}
@props(['cell' => 40, 'pattern' => 'lines', 'fade' => true])
@php
    $image = $pattern === 'dots'
        ? 'radial-gradient(circle, var(--nq-line-strong, var(--nq-line)) 1px, transparent 1.5px)'
        : 'linear-gradient(to right, var(--nq-line) 1px, transparent 1px), linear-gradient(to bottom, var(--nq-line) 1px, transparent 1px)';
    $mask = 'radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 100%)';
    $style = 'background-image: '.$image.'; background-size: '.(int) $cell.'px '.(int) $cell.'px'.($fade ? '; mask-image: '.$mask.'; -webkit-mask-image: '.$mask : '');
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'grid-background') }}" {{ $attributes->except('data-slot')->cn('relative isolate overflow-hidden') }}>
    <div aria-hidden="true" class="pointer-events-none absolute inset-0 -z-10" style="{{ $style }}"></div>
    {{ $slot }}
</div>
