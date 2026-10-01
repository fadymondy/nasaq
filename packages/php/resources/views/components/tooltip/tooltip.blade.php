{{-- <x-nq::tooltip> <x-slot:tip>Settings</x-slot:tip> <button aria-label="Settings">...</button> </x-nq::tooltip>
     The default slot is the trigger (one focusable element); the tip slot is the label.
     content: the label as a plain string instead of the tip slot. delay: ms before it opens (default 600).
     side: top | bottom | left | right | inline-start | inline-end (default top). side-offset: gap in px (default 6).
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['content' => null, 'delay' => 600, 'side' => 'top', 'align' => 'center', 'sideOffset' => 6, 'open' => false, 'tip' => null])
@php
    $physical = match ($side) {
        'inline-start' => \Nasaq\Nasaq::rtl() ? 'right' : 'left',
        'inline-end' => \Nasaq\Nasaq::rtl() ? 'left' : 'right',
        default => $side,
    };
    $placement = $align === 'center' ? $physical : $physical.'-'.$align;
@endphp
<div data-slot="tooltip" x-data="nqTooltip(@js((int) $delay), @js((bool) $open))" x-modelable="open" x-id="['nq-tooltip']" class="contents">
    <span data-slot="tooltip-trigger" class="contents">{{ $slot }}</span>
    <template x-teleport="body">
        <div data-slot="tooltip-content" x-bind="popup" x-nq-presence="open" x-anchor.{{ $placement }}.offset.{{ (int) $sideOffset }}="triggerEl"
            {{ $attributes->cn([
                'z-50 max-w-64 rounded-control bg-foreground px-2 py-1 text-caption text-background',
                'transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0',
            ]) }}>{{ $tip ?? $content }}</div>
    </template>
</div>
