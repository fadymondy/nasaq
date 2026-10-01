{{-- <x-nq::dropdown-menu.sub-content> items </x-nq::dropdown-menu.sub-content>
     The submenu popup. side: inline-end (default, mirrors in RTL). side-offset: -4. --}}
@props(['side' => 'inline-end', 'align' => 'start', 'sideOffset' => -4])
@php
    $physical = match ($side) {
        'inline-start' => \Nasaq\Nasaq::rtl() ? 'right' : 'left',
        'inline-end' => \Nasaq\Nasaq::rtl() ? 'left' : 'right',
        default => $side,
    };
    $placement = $align === 'center' ? $physical : $physical.'-'.$align;
@endphp
<template x-teleport="body">
    <div data-slot="dropdown-menu-sub-content" x-bind="subPopup" x-init="subPopupEl = $el" x-nq-presence="subOpen" x-anchor.{{ $placement }}.offset.{{ (int) $sideOffset }}="$refs.subtrigger"
        {{ $attributes->cn([
            'z-50 min-w-44 overflow-hidden rounded-floating border border-border bg-popover p-1.5 text-popover-foreground shadow-floating outline-none',
            'max-h-[var(--available-height)] overflow-y-auto',
            'transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0',
        ]) }}>{{ $slot }}</div>
</template>
