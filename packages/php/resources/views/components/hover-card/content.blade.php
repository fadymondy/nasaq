{{-- <x-nq::hover-card.content side="bottom" align="center"> preview </x-nq::hover-card.content>
     Teleported to <body>. It stays open while the pointer is over it.
     side: top | bottom | left | right | inline-start | inline-end (the logical sides mirror in RTL).
     align: start | center | end. side-offset: gap in px (default 6). --}}
@props(['side' => 'bottom', 'align' => 'center', 'sideOffset' => 6])
@php
    $physical = match ($side) {
        'inline-start' => \Nasaq\Nasaq::rtl() ? 'right' : 'left',
        'inline-end' => \Nasaq\Nasaq::rtl() ? 'left' : 'right',
        default => $side,
    };
    $placement = $align === 'center' ? $physical : $physical.'-'.$align;
@endphp
<template x-teleport="body">
    <div data-slot="{{ $attributes->get('data-slot', 'hover-card-content') }}" x-bind="popup" x-nq-presence="open" x-anchor.{{ $placement }}.offset.{{ (int) $sideOffset }}="$refs.trigger"
        {{ $attributes->except('data-slot')->cn([
            'z-50 w-72 max-w-[var(--available-width)] rounded-floating border border-border bg-popover p-4 text-body-sm text-popover-foreground shadow-floating outline-none',
            'transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0',
        ]) }}>{{ $slot }}</div>
</template>
