{{-- <x-nq::text-effects.marquee><span>Logo one</span><span>Logo two</span></x-nq::text-effects.marquee>
     A row that scrolls forever, for logos and short quotes. Direction is logical, so a marquee that moves toward the start reads correctly in English and Arabic. The Alpine runtime measures the
     row, repeats the content enough times and slides it; under prefers-reduced-motion nothing moves and the items wrap into a static row. The repeated copies are hidden from assistive tech.
     speed: pixels per second (48). direction: start (default) | end. pause-on-hover: hold still under the pointer or focus (true). paused: stop scrolling (x-modelable). gap: pixels between items (32).
     fade: fade the two edges (true). Needs the Alpine runtime (@nasaqScripts). --}}
@props(['speed' => 48, 'direction' => 'start', 'pauseOnHover' => true, 'paused' => false, 'gap' => 32, 'fade' => true])
@php
    $config = \Illuminate\Support\Js::from(['speed' => (float) $speed, 'direction' => $direction === 'end' ? 'end' : 'start', 'pauseOnHover' => (bool) $pauseOnHover, 'paused' => (bool) $paused])->toHtml();
    $copy = 'flex shrink-0 items-center gap-(--marquee-gap) pe-(--marquee-gap)';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'marquee') }}" x-data="nqMarquee({!! $config !!})" x-modelable="paused" x-on:pointerenter="halted = true" x-on:pointerleave="halted = false" x-on:focusin="halted = true"
    x-on:focusout="halted = false" @if ($paused) data-paused @endif style="--marquee-gap: {{ (int) $gap }}px; {{ $attributes->get('style') }}"
    {{ $attributes->except(['data-slot', 'style'])->cn(['overflow-hidden', '[mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]' => (bool) $fade]) }}>
    <div data-track class="flex w-max">
        <div data-slot="marquee-copy" class="{{ $copy }}">{{ $slot }}</div>
        <div data-slot="marquee-copy" aria-hidden="true" inert class="{{ $copy }}">{{ $slot }}</div>
    </div>
</div>
