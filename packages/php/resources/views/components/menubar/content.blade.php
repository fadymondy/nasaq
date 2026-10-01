{{-- <x-nq::menubar.content side="bottom" align="start"> items </x-nq::menubar.content>
     Teleported to <body>, anchored to the trigger. side: top | bottom | left | right | inline-start | inline-end. align: start | center | end. side-offset: gap in px (default 6). --}}
@props(['side' => 'bottom', 'align' => 'start', 'sideOffset' => 6])
@php
    $physical = match ($side) {
        'inline-start' => \Nasaq\Nasaq::rtl() ? 'right' : 'left',
        'inline-end' => \Nasaq\Nasaq::rtl() ? 'left' : 'right',
        default => $side,
    };
    $placement = $align === 'center' ? $physical : $physical.'-'.$align;
@endphp
<template x-teleport="body">
    <div data-slot="menubar-content" x-bind="popup" x-init="popupEl = $el" x-nq-presence="open" x-anchor.{{ $placement }}.offset.{{ (int) $sideOffset }}="$refs.trigger"
        {{ $attributes->cn([
            'z-50 min-w-44 overflow-hidden rounded-floating border border-border bg-popover p-1.5 text-popover-foreground shadow-floating outline-none',
            'max-h-[var(--available-height)] overflow-y-auto',
            'transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0',
            'min-w-56',
        ]) }}>{{ $slot }}</div>
</template>
