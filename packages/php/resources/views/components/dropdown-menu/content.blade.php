{{-- <x-nq::dropdown-menu.content side="bottom" align="start"> items </x-nq::dropdown-menu.content>
     Teleported to <body>, anchored to the trigger. Arrow keys, Home, End and type-ahead move; Escape closes and returns focus to the trigger.
     side: top | bottom | left | right | inline-start | inline-end (logical sides mirror in RTL). align: start | center | end. side-offset: gap in px (default 4). --}}
@props(['side' => 'bottom', 'align' => 'start', 'sideOffset' => 4])
@php
    $physical = match ($side) {
        'inline-start' => \Nasaq\Nasaq::rtl() ? 'right' : 'left',
        'inline-end' => \Nasaq\Nasaq::rtl() ? 'left' : 'right',
        default => $side,
    };
    $placement = $align === 'center' ? $physical : $physical.'-'.$align;
@endphp
<template x-teleport="body">
    <div data-slot="{{ $attributes->get('data-slot', 'dropdown-menu-content') }}" x-bind="popup" x-init="popupEl = $el" x-nq-presence="open" x-anchor.{{ $placement }}.offset.{{ (int) $sideOffset }}="$refs.trigger"
        {{ $attributes->except('data-slot')->cn([
            'z-50 min-w-44 overflow-hidden rounded-floating border border-border bg-popover p-1.5 text-popover-foreground shadow-floating outline-none',
            'max-h-[var(--available-height)] overflow-y-auto',
            'transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0',
        ]) }}>{{ $slot }}</div>
</template>
