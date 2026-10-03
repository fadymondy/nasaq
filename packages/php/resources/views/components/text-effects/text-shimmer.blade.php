{{-- <x-nq::text-effects.text-shimmer>Thinking it through</x-nq::text-effects.text-shimmer>
     Text a light sweeps across, for "working on it" lines. The Alpine runtime moves the light along the reading direction; under prefers-reduced-motion it stays plain ink with no sweep.
     duration: seconds for one sweep (2.4). paused: hold the light still (x-modelable). Needs the Alpine runtime (@nasaqScripts). --}}
@props(['duration' => 2.4, 'paused' => false])
@php
    $config = \Illuminate\Support\Js::from(['duration' => (float) $duration, 'paused' => (bool) $paused])->toHtml();
    $live = 'inline-block bg-clip-text text-transparent [-webkit-text-fill-color:transparent] [background-size:250%_100%] [background-image:linear-gradient(100deg,var(--nq-fg-muted)_35%,var(--nq-fg)_50%,var(--nq-fg-muted)_65%)] forced-colors:bg-none forced-colors:[-webkit-text-fill-color:currentColor]';
@endphp
<span data-slot="{{ $attributes->get('data-slot', 'text-shimmer') }}" x-data="nqTextShimmer({!! $config !!})" x-modelable="paused" data-reduced-class="{{ \Nasaq\Cn::merge('inline-block text-foreground', (string) $attributes->get('class')) }}"
    @if ($paused) data-still @endif {{ $attributes->except('data-slot')->cn($live) }}>{{ $slot }}</span>