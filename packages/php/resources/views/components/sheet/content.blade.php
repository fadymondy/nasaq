{{-- <x-nq::sheet.content side="end"> header, body, footer </x-nq::sheet.content>
     side: end (default) | start | bottom. Logical: "end" is the right edge in LTR and the left edge in RTL.
     show-close: the × in the corner (default true). close-label: its label (Close / إغلاق). --}}
@props(['side' => 'end', 'showClose' => true, 'closeLabel' => null])
@php
    $sides = [
        'end' => [
            'inset-y-0 end-0 h-dvh w-[min(24rem,100vw)] border-s border-border',
            'data-starting-style:translate-x-8 data-ending-style:translate-x-8',
            'rtl:data-starting-style:-translate-x-8 rtl:data-ending-style:-translate-x-8',
        ],
        'start' => [
            'inset-y-0 start-0 h-dvh w-[min(24rem,100vw)] border-e border-border',
            'data-starting-style:-translate-x-8 data-ending-style:-translate-x-8',
            'rtl:data-starting-style:translate-x-8 rtl:data-ending-style:translate-x-8',
        ],
        'bottom' => [
            'inset-x-0 bottom-0 max-h-[85dvh] rounded-t-floating border-t border-border',
            'data-starting-style:translate-y-8 data-ending-style:translate-y-8',
        ],
    ];
    $side = isset($sides[$side]) ? $side : 'end';
@endphp
<template x-teleport="body">
    <div data-slot="sheet-portal">
        <div data-slot="sheet-backdrop" x-nq-presence="open" x-on:click="close()" class="fixed inset-0 z-50 bg-nq-fg/10 transition-opacity duration-200 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0 dark:bg-nq-bg/60"></div>
        <div data-slot="{{ $attributes->get('data-slot', 'sheet-content') }}" data-side="{{ $side }}" x-bind="popup" x-nq-presence="open" x-trap.noscroll="open"
            {{ $attributes->except('data-slot')->cn([
                'fixed z-50 flex flex-col bg-popover text-popover-foreground outline-none shadow-floating',
                'transition-[translate,opacity] duration-200 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0',
                ...$sides[$side],
            ]) }}>
            {{ $slot }}
            @if ($showClose)
                <button type="button" data-slot="sheet-close" x-on:click="close()" aria-label="{{ $closeLabel ?? \Nasaq\Nasaq::t('Close', 'إغلاق') }}"
                    class="absolute end-3 top-3 inline-flex size-8 items-center justify-center rounded-control text-muted-foreground transition-colors duration-150 hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus [&_svg]:size-4"><x-lucide-x /></button>
            @endif
        </div>
    </div>
</template>
