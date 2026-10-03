{{-- <x-nq::countdown.timer-ring :fraction="0.6" tone="primary"> readout </x-nq::countdown.timer-ring>
     A circular progress ring with room in the middle; the arc starts at the top and runs clockwise. fraction: how much is filled, 0 to 1 (pass the time left to make it drain).
     tone: primary | success | info | warning | neutral (pair it with a word or icon inside; colour alone is never the signal). size (px, 224), thickness (px, 12).
     paused dashes the arc. Inside <x-nq::countdown>, add live: the ring then drains with the timer and dashes while it is paused (fraction is ignored). --}}
@props(['fraction' => 1, 'tone' => 'primary', 'size' => 224, 'thickness' => 12, 'paused' => false, 'live' => false])
@php
    $tones = ['primary' => 'stroke-primary', 'success' => 'stroke-nq-success', 'info' => 'stroke-nq-info', 'warning' => 'stroke-nq-warning', 'neutral' => 'stroke-muted-foreground'];
    $radius = ($size - $thickness) / 2;
    $circumference = 2 * M_PI * $radius;
    $value = min(1, max(0, (float) $fraction));
    $dashed = $paused && $value > 0;
    $piece = max(1, ($circumference * $value) / 24);
    $arcClass = \Nasaq\Cn::merge($tones[$tone] ?? $tones['primary'], 'transition-[stroke-dashoffset,stroke] duration-500 ease-linear motion-reduce:transition-none', ! $live && $value <= 0 ? 'opacity-0' : '');
@endphp
<div data-slot="timer-ring" data-tone="{{ $tone }}" @if ($live) x-bind="ringRoot({{ (int) $size }})" @else @if ($paused) data-paused @endif style="width: {{ $size }}px; height: {{ $size }}px; max-width: 100%" @endif
    {{ $attributes->cn('relative inline-flex shrink-0 items-center justify-center') }}>
    <svg aria-hidden="true" viewBox="0 0 {{ $size }} {{ $size }}" class="absolute inset-0 size-full -rotate-90">
        <circle cx="{{ $size / 2 }}" cy="{{ $size / 2 }}" r="{{ $radius }}" fill="none" stroke-width="{{ $thickness }}" class="stroke-nq-line" />
        <circle data-slot="timer-ring-arc" cx="{{ $size / 2 }}" cy="{{ $size / 2 }}" r="{{ $radius }}" fill="none" stroke-width="{{ $thickness }}" stroke-linecap="round"
            @if ($live) x-bind="arc({{ (int) $size }}, {{ (int) $thickness }})" @else stroke-dasharray="{{ $dashed ? "$piece $piece" : $circumference }}" stroke-dashoffset="{{ $dashed ? 0 : $circumference * (1 - $value) }}" @endif
            class="{{ $arcClass }}" />
    </svg>
    <div class="relative flex flex-col items-center justify-center gap-1 text-center">{{ $slot }}</div>
</div>
