{{-- <x-nq::countdown.timer-readout :seconds="1500" label="Focus" />
     The mm:ss figure (h:mm:ss from an hour). Always left-to-right with tabular digits, so it does not jitter or flip in Arabic.
     seconds: the time to show. label: accessible name (default Timer / المؤقّت). size: md | lg. Inside <x-nq::countdown>, add live to follow the timer. --}}
@props(['seconds' => 0, 'label' => null, 'size' => 'md', 'live' => false])
@php
    $whole = max(0, (int) floor($seconds));
    $h = intdiv($whole, 3600);
    $m = intdiv($whole % 3600, 60);
    $text = $h > 0 ? sprintf('%d:%02d:%02d', $h, $m, $whole % 60) : sprintf('%02d:%02d', $m, $whole % 60);
@endphp
<time data-slot="{{ $attributes->get('data-slot', 'timer-readout') }}" role="timer" aria-label="{{ $label ?? \Nasaq\Nasaq::t('Timer', 'المؤقّت') }}" aria-live="off" dir="ltr"
    @if ($live) :datetime="iso()" x-text="clock()" @else datetime="PT{{ intdiv($whole, 60) }}M{{ $whole % 60 }}S" @endif
    {{ $attributes->except('data-slot')->cn('font-medium leading-none tabular-nums text-foreground', $size === 'lg' ? 'text-[clamp(3rem,14vw,5.5rem)]' : 'text-[clamp(2rem,9vw,3rem)]') }}>{{ $text }}</time>
